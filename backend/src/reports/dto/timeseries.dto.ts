import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum TimeseriesPeriod {
  WEEK = 'week',
  MONTH = 'month',
}

export class TimeseriesQueryDto {
  @ApiPropertyOptional({ enum: TimeseriesPeriod, default: TimeseriesPeriod.WEEK })
  @IsOptional()
  @IsEnum(TimeseriesPeriod)
  period?: TimeseriesPeriod;
}
