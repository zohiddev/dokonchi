import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { CashDailyQueryDto } from './dto/cash-query.dto';

@ApiTags('cash')
@ApiBearerAuth()
@Controller('cash')
export class CashController {
  constructor(private readonly cash: CashService) {}

  @Get('daily')
  @ApiOperation({
    summary: "Kunlik kassa: kirim (NAQD/KARTA sotuv + nasiya to'lov), chiqim (xarajat + partiya xaridi), sof balans",
  })
  daily(@Query() query: CashDailyQueryDto) {
    return this.cash.daily(query.date);
  }
}
