import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, Matches, Max } from 'class-validator';

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum TopProductMetric {
  QUANTITY = 'quantity',
  REVENUE = 'revenue',
  PROFIT = 'profit',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: AnalyticsPeriod, default: AnalyticsPeriod.MONTH })
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @ApiPropertyOptional({
    description: "Sana oralig'i boshi (YYYY-MM-DD). from+to berilsa period o'rniga ishlatiladi.",
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from YYYY-MM-DD formatida bo\'lishi kerak' })
  from?: string;

  @ApiPropertyOptional({ description: "Sana oralig'i oxiri (YYYY-MM-DD, shu kun ham kiradi)." })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to YYYY-MM-DD formatida bo\'lishi kerak' })
  to?: string;
}

export class TopProductsQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: TopProductMetric, default: TopProductMetric.PROFIT })
  @IsOptional()
  @IsEnum(TopProductMetric)
  metric?: TopProductMetric;

  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(50)
  limit?: number;
}

export class TopCustomersQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ default: 10, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(50)
  limit?: number;
}

export class CashflowTrendQueryDto {
  @ApiPropertyOptional({ default: 30, maximum: 90, description: "So'nggi N kun" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(90)
  days?: number;
}

export class SlowMoversQueryDto {
  @ApiPropertyOptional({ default: 30, description: "So'nggi N kun ichida sotilmagan" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(365)
  days?: number;
}
