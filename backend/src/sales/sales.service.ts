import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { FifoAllocation, FifoService } from './fifo.service';

const D = Prisma.Decimal;

export interface SalePreviewItem {
  productId: number;
  productName: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  lineCost: Prisma.Decimal;
  lineProfit: Prisma.Decimal;
  allocations: { batchId: number; quantity: Prisma.Decimal; costPrice: Prisma.Decimal }[];
}

export interface SalePreviewResult {
  items: SalePreviewItem[];
  totalAmount: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  totalProfit: Prisma.Decimal;
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fifo: FifoService,
  ) {}

  async findAll(query: QuerySalesDto) {
    const where: Prisma.SaleWhereInput = {};
    if (query.paymentType) where.paymentType = query.paymentType;
    if (query.from || query.to) {
      where.saleDate = {};
      if (query.from) where.saleDate.gte = new Date(query.from);
      if (query.to) {
        // "to" — kun oxirigacha
        const end = new Date(query.to);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }

    const limit = query.limit ?? 50;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          customer: true,
          items: { include: { product: true } },
        },
        orderBy: { saleDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        customer: true,
        items: {
          include: {
            product: { include: { category: true } },
            batches: { include: { batch: true } },
          },
        },
      },
    });
    if (!sale) throw new NotFoundException('Sotuv topilmadi');
    return sale;
  }

  async preview(dto: CreateSaleDto): Promise<SalePreviewResult> {
    this.validatePayment(dto);

    const items: SalePreviewItem[] = [];
    let totalAmount = new D(0);
    let totalCost = new D(0);

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, isActive: true },
      });
      if (!product) {
        throw new BadRequestException(`Mahsulot topilmadi: id=${item.productId}`);
      }
      if (!product.isActive) {
        throw new BadRequestException(`"${product.name}" — faol emas`);
      }

      const allocation = await this.fifo.preview(item.productId, item.quantity);
      const lineTotal = new D(item.quantity).times(item.unitPrice);
      const lineProfit = lineTotal.minus(allocation.totalCost);

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: new D(item.quantity),
        unitPrice: new D(item.unitPrice),
        lineTotal,
        lineCost: allocation.totalCost,
        lineProfit,
        allocations: allocation.pieces.map((p) => ({
          batchId: p.batchId,
          quantity: p.quantity,
          costPrice: p.costPrice,
        })),
      });

      totalAmount = totalAmount.plus(lineTotal);
      totalCost = totalCost.plus(allocation.totalCost);
    }

    return { items, totalAmount, totalCost, totalProfit: totalAmount.minus(totalCost) };
  }

  async create(dto: CreateSaleDto, userId: number) {
    this.validatePayment(dto);

    if (dto.customerId !== undefined) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { id: true },
      });
      if (!customer) throw new BadRequestException('Mijoz topilmadi');
    }

    return this.prisma.$transaction(async (tx) => {
      // Mahsulotlarni oldindan tekshirish
      const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, isActive: true },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      for (const item of dto.items) {
        const p = productMap.get(item.productId);
        if (!p) throw new BadRequestException(`Mahsulot topilmadi: id=${item.productId}`);
        if (!p.isActive) throw new BadRequestException(`"${p.name}" — faol emas`);
      }

      let totalAmount = new D(0);
      let totalCost = new D(0);
      const itemPayloads: {
        productId: number;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
        allocation: FifoAllocation;
      }[] = [];

      // FIFO bo'yicha har itemni hisoblash + partiyalardan ayrish
      for (const item of dto.items) {
        const allocation = await this.fifo.allocate(tx, item.productId, item.quantity);
        const quantity = new D(item.quantity);
        const unitPrice = new D(item.unitPrice);
        const lineTotal = quantity.times(unitPrice);

        totalAmount = totalAmount.plus(lineTotal);
        totalCost = totalCost.plus(allocation.totalCost);

        itemPayloads.push({
          productId: item.productId,
          quantity,
          unitPrice,
          lineTotal,
          allocation,
        });
      }

      // Sale + nested items + batch allocations
      const sale = await tx.sale.create({
        data: {
          userId,
          customerId: dto.customerId ?? null,
          paymentType: dto.paymentType,
          notes: dto.notes ?? null,
          totalAmount,
          totalCost,
          items: {
            create: itemPayloads.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
              batches: {
                create: it.allocation.pieces.map((p) => ({
                  batchId: p.batchId,
                  quantity: p.quantity,
                  costPrice: p.costPrice,
                })),
              },
            })),
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
              batches: { include: { batch: true } },
            },
          },
        },
      });

      return sale;
    });
  }

  private validatePayment(dto: CreateSaleDto): void {
    if (dto.paymentType === PaymentType.NASIYA && dto.customerId === undefined) {
      throw new BadRequestException('Nasiya sotuv uchun mijoz majburiy');
    }
  }
}
