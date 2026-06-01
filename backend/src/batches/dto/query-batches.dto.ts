import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export enum BatchStatusFilter {
  ACTIVE = 'active',
  FINISHED = 'finished',
}

export class QueryBatchesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId?: number;

  @ApiPropertyOptional({ example: '2026-W22' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  weekLabel?: string;

  @ApiPropertyOptional({ enum: BatchStatusFilter })
  @IsOptional()
  @IsEnum(BatchStatusFilter)
  status?: BatchStatusFilter;
}
