import { ApiProperty } from '@nestjs/swagger';
import { Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Un Oliy nav 25kg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryId!: number;

  @ApiProperty({ enum: Unit })
  @IsEnum(Unit)
  baseUnit!: Unit;

  @ApiProperty({ required: false, example: 30, description: '1 pachka = packSize baseUnit (masalan 1 fleyka = 30 dona)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  packSize?: number;

  @ApiProperty({ required: false, example: 'fleyka', description: "Pachka/bulk birlik yorlig'i: fleyka, karobka, qop..." })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  packUnit?: string;

  @ApiProperty({ required: false, example: 280000, description: "Butun pachka sotuv narxi (null = pachka qilib sotilmaydi)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  packSalePrice?: number;

  @ApiProperty({ required: false, example: '4780123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string;

  @ApiProperty({ required: false, example: 280000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  defaultSalePrice?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
