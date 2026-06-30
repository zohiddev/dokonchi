import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Partiyani yaratgandan keyin narx/izoh va kelgan miqdorni tahrirlash mumkin.
// quantityReceived o'zgarsa qoldiq (quantityRemaining) sotilgan miqdorni saqlagan holda moslashadi.
export class UpdateBatchDto {
  @ApiPropertyOptional({ example: 50, description: 'Kelgan miqdor (baseUnit). Sotilganidan kam bo\'lishi mumkin emas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPricePerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Butun pachka sotuv narxi (override)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  packSalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
