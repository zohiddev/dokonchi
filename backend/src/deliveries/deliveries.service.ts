import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolveBatchQuantities } from '../batches/batch-quantity';
import { isoWeekLabel } from '../common/utils/iso-week';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  findAll(query: QueryDeliveriesDto) {
    const where: Prisma.DeliveryWhereInput = {};
    if (query.supplierId !== undefined) where.supplierId = query.supplierId;

    return this.prisma.delivery.findMany({
      where,
      include: {
        supplier: true,
        batches: {
          include: { product: { include: { category: true } } },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: [{ receivedDate: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        supplier: true,
        batches: {
          include: { product: { include: { category: true } } },
          orderBy: { id: 'asc' },
        },
        payments: true,
      },
    });
    if (!delivery) throw new NotFoundException('Yetkazma topilmadi');
    return delivery;
  }

  async create(dto: CreateDeliveryDto) {
    const receivedDate = new Date(dto.receivedDate);
    if (Number.isNaN(receivedDate.getTime())) {
      throw new BadRequestException("Sana noto'g'ri");
    }

    if (dto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException("Ta'minotchi topilmadi");
    }

    // Har bir qator uchun mahsulotni yuklab, miqdor/tannarxni oldindan hisoblaymiz.
    const productIds = Array.from(new Set(dto.lines.map((l) => l.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, isActive: true, packSize: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const resolvedLines = dto.lines.map((line) => {
      const product = productMap.get(line.productId);
      if (!product) throw new BadRequestException(`Mahsulot topilmadi: id=${line.productId}`);
      if (!product.isActive) throw new BadRequestException(`"${product.name}" — faol emas`);
      const { quantityReceived, costPricePerUnit, costPerPack } = resolveBatchQuantities(
        line,
        product.packSize,
        product.name,
      );
      return { line, quantityReceived, costPricePerUnit, costPerPack };
    });

    const weekLabel = isoWeekLabel(receivedDate);

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          supplierId: dto.supplierId ?? null,
          receivedDate,
          weekLabel,
          notes: dto.notes ?? null,
          batches: {
            create: resolvedLines.map(({ line, quantityReceived, costPricePerUnit, costPerPack }) => ({
              productId: line.productId,
              supplierId: dto.supplierId ?? null,
              receivedDate,
              weekLabel,
              quantityReceived,
              quantityRemaining: quantityReceived,
              costPricePerUnit,
              costPerPack: costPerPack ?? null,
              salePricePerUnit: line.salePricePerUnit ?? null,
              packSalePrice: line.packSalePrice ?? null,
              notes: line.notes ?? null,
            })),
          },
        },
        include: {
          supplier: true,
          batches: { include: { product: { include: { category: true } } }, orderBy: { id: 'asc' } },
        },
      });

      // Butun yetkazma uchun darhol to'langan summa — ta'minotchiga boshlang'ich to'lov
      if (created.supplierId && dto.amountPaid && dto.amountPaid > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: created.supplierId,
            deliveryId: created.id,
            amount: dto.amountPaid,
            notes: "Yetkazma uchun boshlang'ich to'lov",
          },
        });
      }

      return created;
    });

    // Ta'minotchiga Telegram bildirishnoma (fire-and-forget)
    if (delivery.supplierId) {
      void this.telegram.notifySupplierDelivery(delivery.id);
    }

    return delivery;
  }
}
