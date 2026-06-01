import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isoWeekLabel } from '../common/utils/iso-week';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { BatchStatusFilter, QueryBatchesDto } from './dto/query-batches.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

const ATTENTION_AGE_DAYS = 14;
const ATTENTION_REMAINING_RATIO = 0.15;

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(dto: CreateBatchDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, isActive: true },
    });
    if (!product) throw new BadRequestException('Mahsulot topilmadi');
    if (!product.isActive) throw new BadRequestException('Mahsulot faol emas');

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

    return this.prisma.batch.create({
      data: {
        productId: dto.productId,
        supplierId: dto.supplierId ?? null,
        receivedDate,
        weekLabel: isoWeekLabel(receivedDate),
        quantityReceived: dto.quantityReceived,
        quantityRemaining: dto.quantityReceived,
        costPricePerUnit: dto.costPricePerUnit,
        salePricePerUnit: dto.salePricePerUnit ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        product: { include: { category: true } },
        supplier: true,
      },
    });
  }

  async update(id: number, dto: UpdateBatchDto) {
    await this.findOne(id);
    const data: Prisma.BatchUpdateInput = {};
    if (dto.costPricePerUnit !== undefined) data.costPricePerUnit = dto.costPricePerUnit;
    if (dto.salePricePerUnit !== undefined) data.salePricePerUnit = dto.salePricePerUnit;
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
