import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolveBatchQuantities } from '../batches/batch-quantity';
import { isoWeekLabel } from '../common/utils/iso-week';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

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

  // Yetkazma sarlavhasini tahrirlash: ta'minotchi, sana, izoh.
  // Ta'minotchi/sana o'zgarishi ichidagi BARCHA partiyalarga sinxronlanadi
  // (ta'minotchi balansi batch.supplierId dan o'qiladi), bog'langan to'lovlar ham ko'chiriladi.
  async update(id: number, dto: UpdateDeliveryDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      select: { id: true, supplierId: true, receivedDate: true, payments: { select: { id: true } } },
    });
    if (!delivery) throw new NotFoundException('Yetkazma topilmadi');

    const supplierProvided = dto.supplierId !== undefined;
    const newSupplierId = supplierProvided ? dto.supplierId ?? null : delivery.supplierId;
    const supplierChanged = newSupplierId !== delivery.supplierId;

    if (supplierProvided && dto.supplierId != null) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: dto.supplierId },
        select: { id: true },
      });
      if (!supplier) throw new BadRequestException("Ta'minotchi topilmadi");
    }

    // Ta'minotchini olib tashlashda bog'langan to'lov bo'lsa — bloklaymiz
    if (supplierChanged && newSupplierId === null && delivery.payments.length > 0) {
      throw new BadRequestException(
        "Bu yetkazmaga to'lov bog'langan — ta'minotchini olib tashlab bo'lmaydi",
      );
    }

    let receivedDate: Date | undefined;
    let weekLabel: string | undefined;
    if (dto.receivedDate !== undefined) {
      receivedDate = new Date(dto.receivedDate);
      if (Number.isNaN(receivedDate.getTime())) {
        throw new BadRequestException("Sana noto'g'ri");
      }
      weekLabel = isoWeekLabel(receivedDate);
    }

    return this.prisma.$transaction(async (tx) => {
      const deliveryData: Prisma.DeliveryUpdateInput = {};
      if (supplierProvided) {
        deliveryData.supplier = newSupplierId
          ? { connect: { id: newSupplierId } }
          : { disconnect: true };
      }
      if (receivedDate) deliveryData.receivedDate = receivedDate;
      if (weekLabel) deliveryData.weekLabel = weekLabel;
      if (dto.notes !== undefined) deliveryData.notes = dto.notes;

      await tx.delivery.update({ where: { id }, data: deliveryData });

      // Ichidagi partiyalarga ta'minotchi/sana o'zgarishini tarqatamiz
      const batchData: Prisma.BatchUncheckedUpdateManyInput = {};
      if (supplierChanged) batchData.supplierId = newSupplierId;
      if (receivedDate) batchData.receivedDate = receivedDate;
      if (weekLabel) batchData.weekLabel = weekLabel;
      if (Object.keys(batchData).length > 0) {
        await tx.batch.updateMany({ where: { deliveryId: id }, data: batchData });
      }

      // Bog'langan to'lovlarni yangi ta'minotchiga ko'chiramiz
      if (supplierChanged && newSupplierId !== null) {
        await tx.supplierPayment.updateMany({
          where: { deliveryId: id },
          data: { supplierId: newSupplierId },
        });
      }

      return tx.delivery.findUnique({
        where: { id },
        include: {
          supplier: true,
          batches: { include: { product: { include: { category: true } } }, orderBy: { id: 'asc' } },
          payments: true,
        },
      });
    });
  }
}
