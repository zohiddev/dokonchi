import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class CashDailyQueryDto {
  @ApiPropertyOptional({ example: '2026-06-02', description: 'YYYY-MM-DD (default: bugun)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date YYYY-MM-DD formatida bo\'lishi kerak' })
  date?: string;
}
