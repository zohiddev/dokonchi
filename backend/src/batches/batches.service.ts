import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isoWeekLabel } from '../common/utils/iso-week';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { resolveBatchQuantities } from './batch-quantity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { BatchStatusFilter, QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

const ATTENTION_AGE_DAYS = 14;
const ATTENTION_REMAINING_RATIO = 0.15;

@Injectable()
export class BatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  findAll(query: QueryBatchesDto) {
    const where: Prisma.BatchWhereInput = {};
    if (query.productId !== undefined) where.productId = query.productId;
    if (query.weekLabel) where.weekLabel = query.weekLabel;
    if (query.status === BatchStatusFilter.ACTIVE) {
      where.quantityRemaining = { gt: 0 };
    } else if (query.status === BatchStatusFilter.FINISHED) {
      where.quantityRemaining = { equals: 0 };
    }

    return this.prisma.batch.findMany({
      where,
      include: {
        product: { include: { category: true } },
        supplier: true,
      },
      orderBy: [{ receivedDate: 'desc' }, { id: 'desc' }],
    });
  }

  async findOne(id: number) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        product: { include: { category: true } },
        supplier: true,
        allocations: {
          include: { saleItem: { include: { sale: true } } },
          orderBy: { id: 'desc' },
        },
      },
    });
    if (!batch) throw new NotFoundException('Partiya topilmadi');
    return batch;
  }

  async attention() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ATTENTION_AGE_DAYS);

    // Eski + qoldig'i bor partiyalar; %15 dan kam qolganlarni filter qilamiz
    const batches = await this.prisma.batch.findMany({
      where: {
        receivedDate: { lt: cutoff },
        quantityRemaining: { gt: 0 },
      },
      include: { product: { include: { category: true } }, supplier: true },
      orderBy: { receivedDate: 'asc' },
    });

    return batches
      .filter((b) => {
        const received = Number(b.quantityReceived);
        if (received <= 0) return false;
        const ratio = Number(b.quantityRemaining) / received;
        return ratio < ATTENTION_REMAINING_RATIO;
      })
      .map((b) => ({
        ...b,
        ageDays: Math.floor((Date.now() - b.receivedDate.getTime()) / (1000 * 60 * 60 * 24)),
        remainingRatio: Number(b.quantityRemaining) / Number(b.quantityReceived),
      }));
  }

  // Yagona mahsulotli partiya. Endi har bir batch yetkazmaga (Delivery) tegishli bo'lishi uchun
  // bitta-qatorli yetkazma yaratib, batchni unga bog'laymiz. (Ko'p mahsulotli kirim — DeliveriesService.)
  async create(dto: CreateBatchDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, name: true, isActive: true, packSize: true },
    });
    if (!product) throw new BadRequestException('Mahsulot topilmadi');
    if (!product.isActive) throw new BadRequestException('Mahsulot faol emas');

    // Pachka rejimida miqdor va dona tannarxni packSize orqali hisoblaymiz.
    // Aks holda base-unit qiymatlar to'g'ridan-to'g'ri ishlatiladi.
    const { quantityReceived, costPricePerUnit, costPerPack } = resolveBatchQuantities(
      dto,
      product.packSize,
      product.name,
    );

    if (dto.supplierId !== undefined) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException("Ta'minotchi topilmadi");
    }

    const receivedDate = new Date(dto.receivedDate);
    if (Number.isNaN(receivedDate.getTime())) {
      throw new BadRequestException('Sana noto\'g\'ri');
    }
    const weekLabel = isoWeekLabel(receivedDate);

    const { delivery, batch } = await this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          supplierId: dto.supplierId ?? null,
          receivedDate,
          weekLabel,
          notes: dto.notes ?? null,
        },
      });

      const batch = await tx.batch.create({
        data: {
          productId: dto.productId,
          supplierId: dto.supplierId ?? null,
          deliveryId: delivery.id,
          receivedDate,
          weekLabel,
          quantityReceived,
          quantityRemaining: quantityReceived,
          costPricePerUnit,
          costPerPack: costPerPack ?? null,
          salePricePerUnit: dto.salePricePerUnit ?? null,
          packSalePrice: dto.packSalePrice ?? null,
          notes: dto.notes ?? null,
        },
        include: {
          product: { include: { category: true } },
          supplier: true,
        },
      });

      // Yetkazma uchun darhol to'langan summa — ta'minotchiga boshlang'ich to'lov sifatida yoziladi
      if (delivery.supplierId && dto.amountPaid && dto.amountPaid > 0) {
        await tx.supplierPayment.create({
          data: {
            supplierId: delivery.supplierId,
            deliveryId: delivery.id,
            amount: dto.amountPaid,
            notes: "Yetkazma uchun boshlang'ich to'lov",
          },
        });
      }

      return { delivery, batch };
    });

    // Ta'minotchiga Telegram bildirishnoma (fire-and-forget)
    if (delivery.supplierId) {
      void this.telegram.notifySupplierDelivery(delivery.id);
    }

    return batch;
  }

  async update(id: number, dto: UpdateBatchDto) {
    const batch = await this.findOne(id);
    const data: Prisma.BatchUpdateInput = {};

    if (dto.quantityReceived !== undefined) {
      // Sotilgan miqdorni saqlab, qoldiqni yangi kelgan miqdorga moslaymiz
      const sold = new Prisma.Decimal(batch.quantityReceived).minus(batch.quantityRemaining);
      const newReceived = new Prisma.Decimal(dto.quantityReceived);
      if (newReceived.lt(sold)) {
        throw new BadRequestException(
          `Kelgan miqdor sotilganidan (${sold.toString()}) kam bo'lishi mumkin emas`,
        );
      }
      data.quantityReceived = newReceived;
      data.quantityRemaining = newReceived.minus(sold);
    }

    if (dto.costPricePerUnit !== undefined) data.costPricePerUnit = dto.costPricePerUnit;
    if (dto.salePricePerUnit !== undefined) data.salePricePerUnit = dto.salePricePerUnit;
    if (dto.packSalePrice !== undefined) data.packSalePrice = dto.packSalePrice;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.batch.update({
      where: { id },
      data,
      include: {
        product: { include: { category: true } },
        supplier: true,
      },
    });
  }
}
