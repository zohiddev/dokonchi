import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

// Yetkazma sarlavhasini tahrirlash. Ta'minotchi/sana o'zgarishi ichidagi barcha
// partiyalarga (va bog'langan to'lovlarga) tarqaladi — DeliveriesService.update.
export class UpdateDeliveryDto {
  @ApiPropertyOptional({ example: 1, nullable: true, description: 'null = ta\'minotchini olib tashlash' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  supplierId?: number | null;

  @ApiPropertyOptional({ example: '2026-05-28' })
  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
