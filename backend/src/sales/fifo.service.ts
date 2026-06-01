import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const D = Prisma.Decimal;
type DecimalLike = Prisma.Decimal | number | string;

export interface FifoPiece {
  batchId: number;
  quantity: Prisma.Decimal;
  costPrice: Prisma.Decimal;
}

export interface FifoAllocation {
  productId: number;
  requestedQuantity: Prisma.Decimal;
  pieces: FifoPiece[];
  totalCost: Prisma.Decimal; // qatordagi jami tannarx (COGS)
}

type BatchRow = {
  id: number;
  quantityRemaining: Prisma.Decimal;
  costPricePerUnit: Prisma.Decimal;
};

@Injectable()
export class FifoService {
  constructor(private readonly prisma: PrismaService) {}

  // Bo'lakka ajratish algoritmi (faqat sof hisoblash — DB ga yozmaydi).
  // Mahsulotning ochiq partiyalari berilgan tartibda kelishi shart.
  private computePieces(
    productId: number,
    batches: BatchRow[],
    requestedQuantity: DecimalLike,
  ): FifoAllocation {
    const requested = new D(requestedQuantity);
    if (requested.lte(0)) {
      throw new BadRequestException('Miqdor 0 dan katta bo\'lishi kerak');
    }

    const totalAvailable = batches.reduce(
      (sum, b) => sum.plus(b.quantityRemaining),
      new D(0),
    );
    if (totalAvailable.lt(requested)) {
      throw new BadRequestException(
        `Omborda yetarli emas: so'ralgan ${requested.toString()}, mavjud ${totalAvailable.toString()}`,
      );
    }

    let remaining = requested;
    const pieces: FifoPiece[] = [];
    let totalCost = new D(0);

    for (const batch of batches) {
      if (remaining.lte(0)) break;
      if (batch.quantityRemaining.lte(0)) continue;
      const take = D.min(remaining, batch.quantityRemaining);
      pieces.push({
        batchId: batch.id,
        quantity: take,
        costPrice: batch.costPricePerUnit,
      });
      totalCost = totalCost.plus(take.times(batch.costPricePerUnit));
      remaining = remaining.minus(take);
    }

    return { productId, requestedQuantity: requested, pieces, totalCost };
  }

  // Tranzaksiyadan tashqari, ko'rib turish uchun (saqlamasdan)
  async preview(productId: number, quantity: DecimalLike): Promise<FifoAllocation> {
    const batches = await this.prisma.batch.findMany({
      where: { productId, quantityRemaining: { gt: 0 } },
      orderBy: [{ receivedDate: 'asc' }, { id: 'asc' }],
      select: { id: true, quantityRemaining: true, costPricePerUnit: true },
    });
    return this.computePieces(productId, batches, quantity);
  }

  // Tranzaksiya ichida — partiyalarni o'qiydi VA quantityRemaining ni kamaytiradi
  async allocate(
    tx: Prisma.TransactionClient,
    productId: number,
    quantity: DecimalLike,
  ): Promise<FifoAllocation> {
    const batches = await tx.batch.findMany({
      where: { productId, quantityRemaining: { gt: 0 } },
      orderBy: [{ receivedDate: 'asc' }, { id: 'asc' }],
      select: { id: true, quantityRemaining: true, costPricePerUnit: true },
    });

    const allocation = this.computePieces(productId, batches, quantity);

    for (const piece of allocation.pieces) {
      await tx.batch.update({
        where: { id: piece.batchId },
        data: { quantityRemaining: { decrement: piece.quantity } },
      });
    }

    return allocation;
  }
}
