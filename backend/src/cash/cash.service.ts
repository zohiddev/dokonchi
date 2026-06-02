import { Injectable } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const D = Prisma.Decimal;

export type CashTransactionKind =
  | 'sale-cash'
  | 'sale-card'
  | 'debt-payment'
  | 'expense'
  | 'batch-purchase';

export interface CashTransaction {
  time: Date;
  kind: CashTransactionKind;
  direction: 'in' | 'out';
  amount: Prisma.Decimal;
  description: string;
  refId: number;
}

export interface CashBucket {
  amount: Prisma.Decimal;
  count: number;
}

export interface CashDailySummary {
  date: string;
  income: {
    naqd: CashBucket;
    karta: CashBucket;
    debtPayments: CashBucket;
    total: Prisma.Decimal;
  };
  outflow: {
    expenses: CashBucket;
    batchPurchases: CashBucket;
    total: Prisma.Decimal;
  };
  netCash: Prisma.Decimal;
  creditSales: CashBucket; // NASIYA — informational
  transactions: CashTransaction[];
}

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async daily(dateStr?: string): Promise<CashDailySummary> {
    const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    const [sales, payments, expenses, batches] = await Promise.all([
      this.prisma.sale.findMany({
        where: { saleDate: { gte: from, lt: to } },
        include: {
          customer: { select: { name: true } },
          items: { select: { product: { select: { name: true } } } },
        },
        orderBy: { saleDate: 'desc' },
      }),
      this.prisma.debtPayment.findMany({
        where: { paymentDate: { gte: from, lt: to } },
        include: { customer: { select: { name: true } } },
        orderBy: { paymentDate: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: { expenseDate: { gte: from, lt: to } },
        orderBy: { expenseDate: 'desc' },
      }),
      this.prisma.batch.findMany({
        where: { receivedDate: { gte: from, lt: to } },
        include: {
          product: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        orderBy: { receivedDate: 'desc' },
      }),
    ]);

    // Kirim
    const naqdSales = sales.filter((s) => s.paymentType === PaymentType.NAQD);
    const kartaSales = sales.filter((s) => s.paymentType === PaymentType.KARTA);
    const nasiyaSales = sales.filter((s) => s.paymentType === PaymentType.NASIYA);

    const naqd = this.bucket(naqdSales.map((s) => s.totalAmount));
    const karta = this.bucket(kartaSales.map((s) => s.totalAmount));
    const debtPayments = this.bucket(payments.map((p) => p.amount));
    const incomeTotal = naqd.amount.plus(karta.amount).plus(debtPayments.amount);

    // Chiqim
    const expensesB = this.bucket(expenses.map((e) => e.amount));
    const batchCosts = batches.map((b) =>
      new D(b.quantityReceived).times(b.costPricePerUnit),
    );
    const batchPurchases = this.bucket(batchCosts);
    const outflowTotal = expensesB.amount.plus(batchPurchases.amount);

    const creditSales = this.bucket(nasiyaSales.map((s) => s.totalAmount));

    // Tranzaksiyalar — xronologik
    const transactions: CashTransaction[] = [];

    for (const s of naqdSales) {
      transactions.push({
        time: s.saleDate,
        kind: 'sale-cash',
        direction: 'in',
        amount: s.totalAmount,
        description: this.saleDescription(s.items, s.customer?.name),
        refId: s.id,
      });
    }
    for (const s of kartaSales) {
      transactions.push({
        time: s.saleDate,
        kind: 'sale-card',
        direction: 'in',
        amount: s.totalAmount,
        description: this.saleDescription(s.items, s.customer?.name),
        refId: s.id,
      });
    }
    for (const p of payments) {
      transactions.push({
        time: p.paymentDate,
        kind: 'debt-payment',
        direction: 'in',
        amount: p.amount,
        description: `Nasiya to'lovi: ${p.customer.name}${p.notes ? ` — ${p.notes}` : ''}`,
        refId: p.id,
      });
    }
    for (const e of expenses) {
      transactions.push({
        time: e.expenseDate,
        kind: 'expense',
        direction: 'out',
        amount: e.amount,
        description: `${e.category}${e.notes ? ` — ${e.notes}` : ''}`,
        refId: e.id,
      });
    }
    for (const b of batches) {
      transactions.push({
        time: b.receivedDate,
        kind: 'batch-purchase',
        direction: 'out',
        amount: new D(b.quantityReceived).times(b.costPricePerUnit),
        description: `Partiya: ${b.product.name} (${b.quantityReceived})${
          b.supplier ? ` — ${b.supplier.name}` : ''
        }`,
        refId: b.id,
      });
    }

    transactions.sort((a, b) => b.time.getTime() - a.time.getTime());

    return {
      date: this.dayKey(from),
      income: { naqd, karta, debtPayments, total: incomeTotal },
      outflow: { expenses: expensesB, batchPurchases, total: outflowTotal },
      netCash: incomeTotal.minus(outflowTotal),
      creditSales,
      transactions,
    };
  }

  private bucket(amounts: Prisma.Decimal[]): CashBucket {
    return {
      amount: amounts.reduce((sum, a) => sum.plus(a), new D(0)),
      count: amounts.length,
    };
  }

  private saleDescription(
    items: { product: { name: string } }[],
    customerName?: string,
  ): string {
    const names = items.map((i) => i.product.name).join(', ') || 'Sotuv';
    return customerName ? `${names} (${customerName})` : names;
  }

  private dayKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
