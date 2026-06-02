import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AnalyticsPeriod,
  AnalyticsQueryDto,
  CashflowTrendQueryDto,
  SlowMoversQueryDto,
  TopCustomersQueryDto,
  TopProductMetric,
  TopProductsQueryDto,
} from './dto/analytics.dto';
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

  // ===== CHUQURLASHTIRILGAN ANALITIKA =====

  @Get('overview')
  @ApiOperation({ summary: 'Pro KPI: daromad, foyda, margin %, sotuv soni, o\'rtacha chek + o\'sish %' })
  overview(@Query() query: AnalyticsQueryDto) {
    return this.reports.overview(query.period ?? AnalyticsPeriod.MONTH);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top mahsulotlar (sort: quantity|revenue|profit)' })
  topProducts(@Query() query: TopProductsQueryDto) {
    return this.reports.topProducts(
      query.period ?? AnalyticsPeriod.MONTH,
      query.metric ?? TopProductMetric.PROFIT,
      query.limit ?? 10,
    );
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top mijozlar (revenue bo\'yicha)' })
  topCustomers(@Query() query: TopCustomersQueryDto) {
    return this.reports.topCustomers(
      query.period ?? AnalyticsPeriod.MONTH,
      query.limit ?? 10,
    );
  }

  @Get('slow-movers')
  @ApiOperation({ summary: 'Sekin sotilganlar — N kun ichida sotilmagan, lekin omborda bor' })
  slowMovers(@Query() query: SlowMoversQueryDto) {
    return this.reports.slowMovers(query.days ?? 30);
  }

  @Get('cashflow-trend')
  @ApiOperation({ summary: 'Kunlik kassa trendi: kirim/chiqim/foyda/sof — N kun' })
  cashflowTrend(@Query() query: CashflowTrendQueryDto) {
    return this.reports.cashflowTrend(query.days ?? 30);
  }

  @Get('sales-heatmap')
  @ApiOperation({ summary: 'Sotuv heatmap: hafta-kuni × soat matritsasi (qachon eng band)' })
  salesHeatmap(@Query() query: AnalyticsQueryDto) {
    return this.reports.salesHeatmap(query.period ?? AnalyticsPeriod.MONTH);
  }
}
