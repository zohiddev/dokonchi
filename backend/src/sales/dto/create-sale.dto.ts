import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentType, SaleMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSaleItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId!: number;

  @ApiProperty({ example: 5, description: 'Miqdor — HAR DOIM baseUnit da (FIFO uchun). Pachkada = packCount × packSize' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @ApiProperty({ example: 280000, description: 'Dona narxi (baseUnit uchun). PACK rejimida ko\'rsatish uchun, summa packPrice dan hisoblanadi' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ enum: SaleMode, default: SaleMode.PIECE, description: 'Sotuv usuli: dona (PIECE) yoki butun pachka (PACK)' })
  @IsOptional()
  @IsEnum(SaleMode)
  saleMode?: SaleMode;

  @ApiPropertyOptional({ example: 1, description: 'PACK bo\'lsa: nechta pachka' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  packCount?: number;

  @ApiPropertyOptional({ example: 280000, description: 'PACK bo\'lsa: bitta butun pachka narxi (aniq summa shu dan hisoblanadi)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  packPrice?: number;
}

export class CreateSaleDto {
  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  paymentType!: PaymentType;

  @ApiPropertyOptional({ example: 1, description: "NASIYA bo'lsa majburiy" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({ type: [CreateSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];
}
