import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class MonthlySummaryQueryDto {
  @ApiPropertyOptional({ example: '2026-05', description: 'YYYY-MM (default: joriy oy)' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month YYYY-MM formatida bo\'lishi kerak' })
  month?: string;
}
