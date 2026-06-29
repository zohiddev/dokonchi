import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Partiya qatorining miqdor/narx maydonlari (base yoki pachka rejimi).
// CreateBatchDto va CreateDeliveryLineDto shu shaklga mos keladi.
export interface BatchQuantityInput {
  quantityReceived?: number;
  costPricePerUnit?: number;
  packQuantity?: number;
  costPerPack?: number;
}

export interface ResolvedBatchQuantities {
  quantityReceived: Prisma.Decimal;
  costPricePerUnit: Prisma.Decimal;
  costPerPack: number | null;
}

/**
 * Pachka rejimida (packQuantity berilgan) miqdor va dona tannarxni packSize orqali hisoblaydi;
 * aks holda base-unit qiymatlarni qaytaradi. Dona tannarx yaxlitlash siljimasligi uchun
 * Decimal bilan to'liq aniqlikda bo'linadi (Decimal(14,4) ustunga yoziladi).
 *
 * @param productLabel — xato xabarida mahsulotni ko'rsatish uchun (ko'p qatorli yetkazmada qulay)
 */
export function resolveBatchQuantities(
  line: BatchQuantityInput,
  packSize: Prisma.Decimal | null,
  productLabel?: string,
): ResolvedBatchQuantities {
  const suffix = productLabel ? ` (${productLabel})` : '';
  const isPackMode = line.packQuantity != null;

  if (isPackMode) {
    if (line.costPerPack == null) {
      throw new BadRequestException(`Pachka narxini kiriting${suffix}`);
    }
    if (packSize == null || new Prisma.Decimal(packSize).lte(0)) {
      throw new BadRequestException(
        `Pachka bo'yicha qo'shish uchun mahsulotda pachka hajmi (packSize) belgilanishi kerak${suffix}`,
      );
    }
    const ps = new Prisma.Decimal(packSize);
    return {
      quantityReceived: new Prisma.Decimal(line.packQuantity!).times(ps),
      costPricePerUnit: new Prisma.Decimal(line.costPerPack).div(ps),
      costPerPack: line.costPerPack,
    };
  }

  if (line.quantityReceived == null || line.costPricePerUnit == null) {
    throw new BadRequestException(`Kelgan miqdor va kirim narxini kiriting${suffix}`);
  }
  return {
    quantityReceived: new Prisma.Decimal(line.quantityReceived),
    costPricePerUnit: new Prisma.Decimal(line.costPricePerUnit),
    costPerPack: line.costPerPack ?? null,
  };
}
