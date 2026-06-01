import { Injectable } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { DebtsService } from '../debts/debts.service';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeseriesPeriod } from './dto/timeseries.dto';

const D = Prisma.Decimal;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function startOfWeek(d: Date): Date {
  // Dushanbadan boshlanadi
  const out = startOfDay(d);
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  return out;
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
function startOfMonthUTC(year: number, month0: number): Date {
  return new Date(Date.UTC(year, month0, 1));
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly debts: DebtsService,
  ) {}

  async dashboard() {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);

    const [todaySales, weekSales, debtsSummary, invValuation, productCount] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: dayStart, lt: dayEnd } },
        _sum: { totalAmount: true, totalCost: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: weekStart, lt: weekEnd } },
        _sum: { totalAmount: true, totalCost: true },
      }),
      this.debts.summary(),
      this.inventory.valuation(),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    const todayRevenue = todaySales._sum.totalAmount ?? new D(0);
    const todayCost = todaySales._sum.totalCost ?? new D(0);
    const weekRevenue = weekSales._sum.totalAmount ?? new D(0);
    const weekCost = weekSales._sum.totalCost ?? new D(0);

    return {
      today: {
        revenue: todayRevenue,
        profit: todayRevenue.minus(todayCost),
        salesCount: todaySales._count,
      },
      thisWeek: {
        revenue: weekRevenue,
        profit: weekRevenue.minus(weekCost),
      },
      debts: debtsSummary,
      inventory: invValuation,
      productCount,
    };
  }

  async salesTimeseries(period: TimeseriesPeriod = TimeseriesPeriod.WEEK) {
    const now = new Date();
    if (period === TimeseriesPeriod.WEEK) {
      // So'nggi 7 kun — har kun
      const start = addDays(startOfDay(now), -6);
      const end = addDays(startOfDay(now), 1);
      const sales = await this.prisma.sale.findMany({
        where: { saleDate: { gte: start, lt: end } },
        select: { saleDate: true, totalAmount: true },
      });

      const buckets = new Map<string, Prisma.Decimal>();
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        buckets.set(this.dayKey(day), new D(0));
      }
      const dayNames = ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh'];
      for (const s of sales) {
        const key = this.dayKey(s.saleDate);
        const prev = buckets.get(key) ?? new D(0);
        buckets.set(key, prev.plus(s.totalAmount));
      }

      const result: { label: string; date: string; total: Prisma.Decimal }[] = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(start, i);
        const key = this.dayKey(day);
        result.push({
          label: dayNames[day.getDay()],
          date: key,
          total: buckets.get(key) ?? new D(0),
        });
      }
      return result;
    }

    // period=month → so'nggi 12 oy
    const monthNames = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: startMonth, lt: endMonth } },
      select: { saleDate: true, totalAmount: true },
    });
    const buckets = new Map<string, Prisma.Decimal>();
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      buckets.set(this.monthKey(m), new D(0));
    }
    for (const s of sales) {
      const key = this.monthKey(s.saleDate);
      const prev = buckets.get(key) ?? new D(0);
      buckets.set(key, prev.plus(s.totalAmount));
    }
    const result: { label: string; month: string; total: Prisma.Decimal }[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = this.monthKey(m);
      result.push({
        label: monthNames[m.getMonth()],
        month: key,
        total: buckets.get(key) ?? new D(0),
      });
    }
    return result;
  }

  async profitByCategory(period: 'month' | 'year' = 'month') {
    const now = new Date();
    let from: Date;
    if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: from } } },
      select: {
        lineTotal: true,
        product: { select: { category: { select: { id: true, name: true } } } },
        batches: { select: { quantity: true, costPrice: true } },
      },
    });

    type Agg = { categoryId: number; name: string; revenue: Prisma.Decimal; cost: Prisma.Decimal };
    const map = new Map<number, Agg>();
    for (const it of items) {
      const cat = it.product.category;
      if (!map.has(cat.id)) {
        map.set(cat.id, { categoryId: cat.id, name: cat.name, revenue: new D(0), cost: new D(0) });
      }
      const agg = map.get(cat.id)!;
      agg.revenue = agg.revenue.plus(it.lineTotal);
      for (const b of it.batches) {
        agg.cost = agg.cost.plus(b.quantity.times(b.costPrice));
      }
    }

    return Array.from(map.values())
      .map((a) => ({ ...a, profit: a.revenue.minus(a.cost) }))
      .sort((a, b) => Number(b.profit.minus(a.profit)));
  }

  async monthlySummary(month?: string) {
    let year: number;
    let m0: number;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      year = y;
      m0 = m - 1;
    } else {
      const now = new Date();
      year = now.getFullYear();
      m0 = now.getMonth();
    }
    const from = startOfMonthUTC(year, m0);
    const to = startOfMonthUTC(year, m0 + 1);

    const [salesAgg, expensesAgg, nasiyaAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: from, lt: to } },
        _sum: { totalAmount: true, totalCost: true },
        _count: true,
      }),
      this.prisma.expense.aggregate({
        where: { expenseDate: { gte: from, lt: to } },
        _sum: { amount: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          saleDate: { gte: from, lt: to },
          paymentType: PaymentType.NASIYA,
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const revenue = salesAgg._sum.totalAmount ?? new D(0);
    const cost = salesAgg._sum.totalCost ?? new D(0);
    const expenses = expensesAgg._sum.amount ?? new D(0);
    const grossProfit = revenue.minus(cost);
    const netProfit = grossProfit.minus(expenses);

    return {
      month: `${year}-${String(m0 + 1).padStart(2, '0')}`,
      revenue,
      cost,
      grossProfit,
      expenses,
      netProfit,
      salesCount: salesAgg._count,
      newCreditTotal: nasiyaAgg._sum.totalAmount ?? new D(0),
    };
  }

  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  private monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
