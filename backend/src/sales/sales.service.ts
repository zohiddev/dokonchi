import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentType, Prisma, SaleMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { FifoAllocation, FifoService } from './fifo.service';

const D = Prisma.Decimal;

interface ResolvedLine {
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  saleMode: SaleMode;
  packCount: Prisma.Decimal | null;
}

export interface SalePreviewItem {
  productId: number;
  productName: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  lineCost: Prisma.Decimal;
  lineProfit: Prisma.Decimal;
  saleMode: SaleMode;
  packCount: Prisma.Decimal | null;
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
    private readonly telegram: TelegramService,
  ) {}

  async findAll(query: QuerySalesDto) {
    const where: Prisma.SaleWhereInput = {};
    if (query.paymentType) where.paymentType = query.paymentType;
    if (query.customerId !== undefined) where.customerId = query.customerId;
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

      const line = this.resolveLine(item);
      const allocation = await this.fifo.preview(item.productId, item.quantity);
      const lineProfit = line.lineTotal.minus(allocation.totalCost);

      items.push({
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        lineCost: allocation.totalCost,
        lineProfit,
        saleMode: line.saleMode,
        packCount: line.packCount,
        allocations: allocation.pieces.map((p) => ({
          batchId: p.batchId,
          quantity: p.quantity,
          costPrice: p.costPrice,
        })),
      });

      totalAmount = totalAmount.plus(line.lineTotal);
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

    const sale = await this.prisma.$transaction(async (tx) => {
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
        saleMode: SaleMode;
        packCount: Prisma.Decimal | null;
        allocation: FifoAllocation;
      }[] = [];

      // FIFO bo'yicha har itemni hisoblash + partiyalardan ayrish
      for (const item of dto.items) {
        const allocation = await this.fifo.allocate(tx, item.productId, item.quantity);
        const line = this.resolveLine(item);

        totalAmount = totalAmount.plus(line.lineTotal);
        totalCost = totalCost.plus(allocation.totalCost);

        itemPayloads.push({
          productId: item.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          saleMode: line.saleMode,
          packCount: line.packCount,
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
              saleMode: it.saleMode,
              packCount: it.packCount,
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

    // Mijozga Telegram bildirishnoma (fire-and-forget — savdoni bloklamaydi)
    if (sale.customerId) {
      void this.telegram.notifySale(sale.id);
    }

    return sale;
  }

  // Sotuvni to'liq vozvrat qilish (bekor qilish): tovarlarni o'z partiyalariga qaytaradi
  // va sotuvni o'chiradi. SaleItem/SaleItemBatch onDelete: Cascade orqali o'chadi.
  // Kassa/qarz/hisobot — hammasi sotuvlardan jonli hisoblanadi, shu sabab avtomatik moslashadi.
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { batches: true } } },
      });
      if (!sale) throw new NotFoundException('Sotuv topilmadi');

      // Har bir partiyaga sotilgan miqdorni qaytaramiz
      for (const item of sale.items) {
        for (const alloc of item.batches) {
          await tx.batch.update({
            where: { id: alloc.batchId },
            data: { quantityRemaining: { increment: alloc.quantity } },
          });
        }
      }

      await tx.sale.delete({ where: { id } });

      return { success: true, id };
    });
  }

  /**
   * Bitta sotuv qatorini hisoblaydi. PACK rejimida summa packCount × packPrice dan
   * to'g'ridan-to'g'ri (bo'lishsiz) olinadi — shu sabab butun pachka narxi aniq yumaloq bo'ladi
   * (masalan 1 karobka = 280 000, 279 999.99 emas). quantity har doim baseUnit da (FIFO uchun).
   */
  private resolveLine(item: CreateSaleItemDto): ResolvedLine {
    const quantity = new D(item.quantity);

    if (item.saleMode === SaleMode.PACK) {
      if (item.packCount == null || item.packPrice == null) {
        throw new BadRequestException("Pachka sotuvi uchun pachka soni va narxi kerak");
      }
      const packCount = new D(item.packCount);
      const lineTotal = packCount.times(item.packPrice);
      // Dona narxi — faqat ko'rsatish/moslik uchun (summa lineTotal dan olinadi)
      const unitPrice = quantity.gt(0) ? lineTotal.div(quantity) : new D(0);
      return { quantity, unitPrice, lineTotal, saleMode: SaleMode.PACK, packCount };
    }

    const unitPrice = new D(item.unitPrice);
    return {
      quantity,
      unitPrice,
      lineTotal: quantity.times(unitPrice),
      saleMode: SaleMode.PIECE,
      packCount: null,
    };
  }

  private validatePayment(dto: CreateSaleDto): void {
    if (dto.paymentType === PaymentType.NASIYA && dto.customerId === undefined) {
      throw new BadRequestException('Nasiya sotuv uchun mijoz majburiy');
    }
  }
}
