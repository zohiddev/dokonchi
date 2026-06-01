import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonthlySummaryQueryDto } from './dto/monthly-summary.dto';
import { TimeseriesPeriod, TimeseriesQueryDto } from './dto/timeseries.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPI' })
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('sales-timeseries')
  @ApiOperation({ summary: 'Sotuv grafigi (week=7 kun, month=12 oy)' })
  salesTimeseries(@Query() query: TimeseriesQueryDto) {
    return this.reports.salesTimeseries(query.period ?? TimeseriesPeriod.WEEK);
  }

  @Get('profit-by-category')
  @ApiOperation({ summary: 'Toifa bo\'yicha foyda (joriy oy)' })
  profitByCategory() {
    return this.reports.profitByCategory('month');
  }

  @Get('monthly-summary')
  @ApiOperation({ summary: 'Oylik xulosa (savdo → tannarx → yalpi → xarajat → sof foyda)' })
  monthlySummary(@Query() query: MonthlySummaryQueryDto) {
    return this.reports.monthlySummary(query.month);
  }
}
