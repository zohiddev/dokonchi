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

  // ============= CHUQURLASHTIRILGAN ANALITIKA =============

  // Davr → sana oralig'iga aylantirish
  private periodRange(period: 'week' | 'month' | 'quarter' | 'year'): { from: Date; to: Date } {
    const now = new Date();
    const to = now;
    let from: Date;
    if (period === 'week') {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
    } else if (period === 'month') {
      from = new Date(now);
      from.setDate(from.getDate() - 30);
    } else if (period === 'quarter') {
      from = new Date(now);
      from.setDate(from.getDate() - 90);
    } else {
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
    }
    return { from, to };
  }

  // 1) Umumiy KPI'lar (Pro ko'rsatkichlar)
  async overview(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const { from, to } = this.periodRange(period);

    const [agg, prevAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { saleDate: { gte: from, lte: to } },
        _sum: { totalAmount: true, totalCost: true },
        _count: true,
      }),
      // Oldingi davr — solishtirish uchun (delta %)
      this.prisma.sale.aggregate({
        where: {
          saleDate: {
            gte: new Date(from.getTime() - (to.getTime() - from.getTime())),
            lt: from,
          },
        },
        _sum: { totalAmount: true, totalCost: true },
        _count: true,
      }),
    ]);

    const revenue = agg._sum.totalAmount ?? new D(0);
    const cost = agg._sum.totalCost ?? new D(0);
    const profit = revenue.minus(cost);
    const salesCount = agg._count;
    const margin = revenue.gt(0) ? profit.div(revenue) : new D(0);
    const avgTicket = salesCount > 0 ? revenue.div(salesCount) : new D(0);

    const prevRevenue = prevAgg._sum.totalAmount ?? new D(0);
    const revenueGrowth = prevRevenue.gt(0)
      ? revenue.minus(prevRevenue).div(prevRevenue)
      : null;

    return {
      period,
      from,
      to,
      revenue,
      cost,
      profit,
      margin, // 0..1 (foiz)
      salesCount,
      avgTicket,
      previousPeriod: {
        revenue: prevRevenue,
        salesCount: prevAgg._count,
      },
      revenueGrowth, // 0..1 yoki null
    };
  }

  // 2) Top mahsulotlar — qaysi mahsulot eng yaxshi sotilyapti
  async topProducts(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    metric: 'quantity' | 'revenue' | 'profit' = 'profit',
    limit = 10,
  ) {
    const { from, to } = this.periodRange(period);

    const items = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: from, lte: to } } },
      select: {
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        product: {
          select: {
            id: true,
            name: true,
            baseUnit: true,
            category: { select: { id: true, name: true } },
          },
        },
        batches: { select: { quantity: true, costPrice: true } },
      },
    });

    type Agg = {
      productId: number;
      name: string;
      unit: string;
      categoryName: string;
      quantity: Prisma.Decimal;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
      profit: Prisma.Decimal;
      salesCount: number;
    };
    const map = new Map<number, Agg>();
    for (const it of items) {
      const id = it.product.id;
      if (!map.has(id)) {
        map.set(id, {
          productId: id,
          name: it.product.name,
          unit: it.product.baseUnit,
          categoryName: it.product.category.name,
          quantity: new D(0),
          revenue: new D(0),
          cost: new D(0),
          profit: new D(0),
          salesCount: 0,
        });
      }
      const a = map.get(id)!;
      a.quantity = a.quantity.plus(it.quantity);
      a.revenue = a.revenue.plus(it.lineTotal);
      for (const b of it.batches) {
        a.cost = a.cost.plus(b.quantity.times(b.costPrice));
      }
      a.salesCount += 1;
    }

    const rows = Array.from(map.values()).map((a) => ({
      ...a,
      profit: a.revenue.minus(a.cost),
      margin: a.revenue.gt(0) ? a.revenue.minus(a.cost).div(a.revenue) : new D(0),
    }));

    // Tartiblash
    rows.sort((x, y) => {
      const key = metric;
      const xv = Number(x[key]);
      const yv = Number(y[key]);
      return yv - xv;
    });

    return rows.slice(0, limit);
  }

  // 3) Top mijozlar
  async topCustomers(
    period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    limit = 10,
  ) {
    const { from, to } = this.periodRange(period);

    const sales = await this.prisma.sale.findMany({
      where: {
        saleDate: { gte: from, lte: to },
        customerId: { not: null },
      },
      select: {
        customerId: true,
        totalAmount: true,
        totalCost: true,
        paymentType: true,
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    type Agg = {
      customerId: number;
      name: string;
      phone: string | null;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
      profit: Prisma.Decimal;
      salesCount: number;
      creditAmount: Prisma.Decimal; // NASIYA sotuvlari summasi
    };
    const map = new Map<number, Agg>();
    for (const s of sales) {
      if (!s.customer) continue;
      const id = s.customer.id;
      if (!map.has(id)) {
        map.set(id, {
          customerId: id,
          name: s.customer.name,
          phone: s.customer.phone,
          revenue: new D(0),
          cost: new D(0),
          profit: new D(0),
          salesCount: 0,
          creditAmount: new D(0),
        });
      }
      const a = map.get(id)!;
      a.revenue = a.revenue.plus(s.totalAmount);
      a.cost = a.cost.plus(s.totalCost);
      a.salesCount += 1;
      if (s.paymentType === PaymentType.NASIYA) {
        a.creditAmount = a.creditAmount.plus(s.totalAmount);
      }
    }

    return Array.from(map.values())
      .map((a) => ({ ...a, profit: a.revenue.minus(a.cost) }))
      .sort((x, y) => Number(y.revenue.minus(x.revenue)))
      .slice(0, limit);
  }

  // 4) Sekin sotilganlar — so'nggi N kun ichida sotilmagan, lekin omborda bor
  async slowMovers(days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    // So'nggi davrda sotilgan mahsulot id'lari
    const recentSales = await this.prisma.saleItem.findMany({
      where: { sale: { saleDate: { gte: cutoff } } },
      select: { productId: true },
      distinct: ['productId'],
    });
    const recentlySoldIds = new Set(recentSales.map((s) => s.productId));

    // Faol mahsulotlar omborda mavjud bo'lganlar
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        batches: { some: { quantityRemaining: { gt: 0 } } },
      },
      include: {
        category: true,
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { receivedDate: 'asc' },
        },
        saleItems: {
          orderBy: { sale: { saleDate: 'desc' } },
          take: 1,
          include: { sale: { select: { saleDate: true } } },
        },
      },
    });

    return products
      .filter((p) => !recentlySoldIds.has(p.id))
      .map((p) => {
        const totalRemaining = p.batches.reduce(
          (sum, b) => sum.plus(b.quantityRemaining),
          new D(0),
        );
        const value = p.batches.reduce(
          (sum, b) => sum.plus(b.quantityRemaining.times(b.costPricePerUnit)),
          new D(0),
        );
        const oldestBatch = p.batches[0];
        const ageDays = oldestBatch
          ? Math.floor((Date.now() - oldestBatch.receivedDate.getTime()) / 86400000)
          : 0;
        const lastSale = p.saleItems[0]?.sale.saleDate ?? null;
        const lastSaleDays = lastSale
          ? Math.floor((Date.now() - lastSale.getTime()) / 86400000)
          : null;
        return {
          productId: p.id,
          name: p.name,
          category: p.category.name,
          unit: p.baseUnit,
          totalRemaining,
          stockValue: value,
          oldestBatchAgeDays: ageDays,
          lastSaleDate: lastSale,
          lastSaleDays,
        };
      })
      .sort((a, b) => Number(b.stockValue) - Number(a.stockValue));
  }

  // 5) Kunlik kassa trendi — N kun, har kun: kirim/chiqim/sof
  async cashflowTrend(days = 30) {
    const start = startOfDay(new Date());
    start.setDate(start.getDate() - (days - 1));
    const end = addDays(startOfDay(new Date()), 1);

    const [sales, payments, expenses, batches] = await Promise.all([
      this.prisma.sale.findMany({
        where: {
          saleDate: { gte: start, lt: end },
          paymentType: { in: [PaymentType.NAQD, PaymentType.KARTA] },
        },
        select: { saleDate: true, totalAmount: true, totalCost: true },
      }),
      this.prisma.debtPayment.findMany({
        where: { paymentDate: { gte: start, lt: end } },
        select: { paymentDate: true, amount: true },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: start, lt: end } },
        select: { expenseDate: true, amount: true },
      }),
      this.prisma.batch.findMany({
        where: { receivedDate: { gte: start, lt: end } },
        select: { receivedDate: true, quantityReceived: true, costPricePerUnit: true },
      }),
    ]);

    // Har kun uchun bucket
    type Bucket = {
      date: string;
      income: Prisma.Decimal;
      outflow: Prisma.Decimal;
      profit: Prisma.Decimal;
      net: Prisma.Decimal;
    };
    const buckets = new Map<string, Bucket>();
    for (let i = 0; i < days; i++) {
      const d = addDays(start, i);
      buckets.set(this.dayKey(d), {
        date: this.dayKey(d),
        income: new D(0),
        outflow: new D(0),
        profit: new D(0),
        net: new D(0),
      });
    }

    for (const s of sales) {
      const k = this.dayKey(s.saleDate);
      const b = buckets.get(k);
      if (!b) continue;
      b.income = b.income.plus(s.totalAmount);
      b.profit = b.profit.plus(new D(s.totalAmount).minus(s.totalCost));
    }
    for (const p of payments) {
      const k = this.dayKey(p.paymentDate);
      const b = buckets.get(k);
      if (b) b.income = b.income.plus(p.amount);
    }
    for (const e of expenses) {
      const k = this.dayKey(e.expenseDate);
      const b = buckets.get(k);
      if (b) b.outflow = b.outflow.plus(e.amount);
    }
    for (const ba of batches) {
      const k = this.dayKey(ba.receivedDate);
      const b = buckets.get(k);
      if (b) b.outflow = b.outflow.plus(new D(ba.quantityReceived).times(ba.costPricePerUnit));
    }

    for (const b of buckets.values()) {
      b.net = b.income.minus(b.outflow);
    }

    return Array.from(buckets.values());
  }

  // 6) Sotuv heatmap — soat × hafta-kuni matritsasi
  async salesHeatmap(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const { from, to } = this.periodRange(period);

    const sales = await this.prisma.sale.findMany({
      where: { saleDate: { gte: from, lte: to } },
      select: { saleDate: true, totalAmount: true },
    });

    // 7 kun × 24 soat
    const matrix: { day: number; hour: number; total: Prisma.Decimal; count: number }[] = [];
    const map = new Map<string, { total: Prisma.Decimal; count: number }>();

    for (const s of sales) {
      const d = s.saleDate;
      const day = (d.getDay() + 6) % 7; // 0=Du, 6=Ya
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      if (!map.has(key)) map.set(key, { total: new D(0), count: 0 });
      const b = map.get(key)!;
      b.total = b.total.plus(s.totalAmount);
      b.count += 1;
    }

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        const b = map.get(key);
        matrix.push({
          day,
          hour,
          total: b?.total ?? new D(0),
          count: b?.count ?? 0,
        });
      }
    }

    return {
      period,
      from,
      to,
      matrix,
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
