import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// Yetkazmadagi bitta mahsulot qatori — base yoki pachka rejimida.
// (CreateBatchDto ning per-mahsulot maydonlari bilan bir xil.)
export class CreateDeliveryLineDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiPropertyOptional({
    example: 50,
    description: 'Kelgan miqdor (baseUnit da). Pachka rejimida shart emas — packQuantity dan hisoblanadi',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantityReceived?: number;

  @ApiPropertyOptional({
    example: 240000,
    description: 'Dona tannarx. Pachka rejimida shart emas — costPerPack / packSize dan hisoblanadi',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costPricePerUnit?: number;

  @ApiPropertyOptional({ example: 5, description: 'Nechta pachka kelgani (fleyka/karobka/qop soni)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  packQuantity?: number;

  @ApiPropertyOptional({ example: 28000, description: 'Bitta pachka kirim narxi (masalan 1 fleyka = 28000)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerPack?: number;

  @ApiPropertyOptional({ example: 280000, description: 'Dona sotuv narxi (baseUnit uchun) override' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePricePerUnit?: number;

  @ApiPropertyOptional({ example: 280000, description: 'Butun pachka sotuv narxi — shu partiya uchun override' })
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

export class CreateDeliveryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  supplierId?: number;

  @ApiProperty({ example: '2026-05-28' })
  @IsDateString()
  receivedDate!: string;

  @ApiPropertyOptional({
    example: 1000000,
    description: "Butun yetkazma uchun darhol to'langan summa (ta'minotchi tanlangan bo'lsa)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ type: [CreateDeliveryLineDto], description: 'Yetkazmadagi mahsulot qatorlari (kamida 1 ta)' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryLineDto)
  lines!: CreateDeliveryLineDto[];
}
