import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const D = Prisma.Decimal;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: [{ receivedDate: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => {
      const activeBatches = p.batches;
      const totalRemaining = activeBatches.reduce(
        (sum, b) => sum.plus(b.quantityRemaining),
        new D(0),
      );

      // O'rtacha tannarx — qoldiq miqdor bo'yicha vaznli
      let avgCost: Prisma.Decimal | null = null;
      if (totalRemaining.gt(0)) {
        const weighted = activeBatches.reduce(
          (sum, b) => sum.plus(b.quantityRemaining.times(b.costPricePerUnit)),
          new D(0),
        );
        avgCost = weighted.div(totalRemaining);
      }

      // Joriy sotuv narxi — eng so'nggi partiyaning salePrice yoki product.defaultSalePrice
      const latest = activeBatches[activeBatches.length - 1];
      const currentSalePrice =
        latest?.salePricePerUnit ?? p.defaultSalePrice ?? null;
      // Joriy butun-pachka narxi — so'nggi partiya override yoki product.packSalePrice
      const currentPackSalePrice =
        latest?.packSalePrice ?? p.packSalePrice ?? null;

      return {
        productId: p.id,
        name: p.name,
        category: p.category,
        baseUnit: p.baseUnit,
        packSize: p.packSize,
        packUnit: p.packUnit,
        activeBatchCount: activeBatches.length,
        totalRemaining,
        avgCost,
        currentSalePrice,
        currentPackSalePrice,
      };
    });
  }

  async valuation() {
    // Σ(qoldiq × tannarx)
    const batches = await this.prisma.batch.findMany({
      where: { quantityRemaining: { gt: 0 } },
      select: { quantityRemaining: true, costPricePerUnit: true },
    });

    const value = batches.reduce(
      (sum, b) => sum.plus(b.quantityRemaining.times(b.costPricePerUnit)),
      new D(0),
    );

    return {
      totalValue: value,
      batchCount: batches.length,
    };
  }
}
