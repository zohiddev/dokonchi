import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';

const D = Prisma.Decimal;

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly telegram: TelegramService,
  ) {}

  // Qarzdor mijozlar (balans > 0)
  async findAll() {
    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { sales: { some: { paymentType: PaymentType.NASIYA } } },
          { openingDebt: { gt: 0 } },
        ],
      },
      orderBy: { name: 'asc' },
    });

    const enriched = await Promise.all(
      customers.map(async (c) => {
        const bal = await this.customers.computeBalance(c.id);
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          notes: c.notes,
          ...bal,
        };
      }),
    );

    return enriched.filter((c) => c.balance.gt(0));
  }

  async summary() {
    const debtors = await this.findAll();
    const total = debtors.reduce((sum, d) => sum.plus(d.balance), new D(0));
    return {
      totalDebt: total,
      debtorCount: debtors.length,
    };
  }

  async createPayment(dto: CreateDebtPaymentDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: { id: true },
    });
    if (!customer) throw new BadRequestException('Mijoz topilmadi');

    const payment = await this.prisma.debtPayment.create({
      data: {
        customerId: dto.customerId,
        amount: dto.amount,
        notes: dto.notes ?? null,
      },
      include: { customer: true },
    });

    // Mijozga Telegram bildirishnoma (fire-and-forget)
    void this.telegram.notifyPayment(payment.id);

    const balance = await this.customers.computeBalance(dto.customerId);
    return { payment, balance };
  }

  // Mijozning to'liq oldi-sotdi tarixi — BARCHA sotuvlar (naqd/karta/nasiya) +
  // to'lovlar. Qarz running-balance'i FAQAT nasiya sotuv va to'lovdan o'zgaradi;
  // naqd/karta xaridlar tarixda ko'rinadi, lekin qarzga ta'sir qilmaydi.
  async history(customerId: number) {
    const [customer, sales, payments] = await Promise.all([
      this.prisma.customer.findUnique({
        where: { id: customerId },
        select: { openingDebt: true, createdAt: true },
      }),
      this.prisma.sale.findMany({
        where: { customerId },
        select: {
          id: true,
          saleDate: true,
          paymentType: true,
          totalAmount: true,
          totalCost: true,
          notes: true,
          items: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              product: { select: { name: true, baseUnit: true } },
            },
          },
        },
        orderBy: { saleDate: 'asc' }, // ASC — running balance hisoblash uchun
      }),
      this.prisma.debtPayment.findMany({
        where: { customerId },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    type SaleEntry = {
      type: 'sale';
      paymentType: PaymentType;
      isOpening?: boolean;
      id: number;
      date: Date;
      amount: Prisma.Decimal;
      totalCost: Prisma.Decimal;
      profit: Prisma.Decimal;
      notes: string | null;
      items: {
        productName: string;
        unit: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }[];
      summary: string;
      runningBalance: Prisma.Decimal;
    };
    type PaymentEntry = {
      type: 'payment';
      id: number;
      date: Date;
      amount: Prisma.Decimal;
      notes: string | null;
      summary: string;
      runningBalance: Prisma.Decimal;
    };
    type Entry = SaleEntry | PaymentEntry;

    const saleEntries: SaleEntry[] = sales.map((s) => ({
      type: 'sale',
      paymentType: s.paymentType,
      id: s.id,
      date: s.saleDate,
      amount: s.totalAmount,
      totalCost: s.totalCost,
      profit: new D(s.totalAmount).minus(s.totalCost),
      notes: s.notes,
      items: s.items.map((i) => ({
        productName: i.product.name,
        unit: i.product.baseUnit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: i.lineTotal,
      })),
      summary: s.items.map((i) => i.product.name).join(', '),
      runningBalance: new D(0), // pastda hisoblanadi
    }));

    const paymentEntries: PaymentEntry[] = payments.map((p) => ({
      type: 'payment',
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      notes: p.notes,
      summary: p.notes ?? "To'lov",
      runningBalance: new D(0),
    }));

    // Xronologik (ASC) tartibda birlashtiramiz va running balance hisoblaymiz
    const sorted: Entry[] = [...saleEntries, ...paymentEntries].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    // Eski (boshlang'ich) qarz — hammasidan oldingi birinchi yozuv
    const openingDebt = customer?.openingDebt ?? new D(0);
    let running = openingDebt;
    const openingEntry: SaleEntry | null = openingDebt.gt(0)
      ? {
          type: 'sale',
          paymentType: PaymentType.NASIYA,
          isOpening: true,
          id: 0,
          date: customer?.createdAt ?? new Date(),
          amount: openingDebt,
          totalCost: new D(0),
          profit: new D(0),
          notes: null,
          items: [],
          summary: "Eski qarz (boshlang'ich)",
          runningBalance: openingDebt,
        }
      : null;

    for (const e of sorted) {
      if (e.type === 'payment') {
        running = running.minus(e.amount);
      } else if (e.paymentType === PaymentType.NASIYA) {
        running = running.plus(e.amount);
      }
      // Naqd/karta sotuvlar qarz qoldig'ini o'zgartirmaydi
      e.runningBalance = running;
    }

    const all: Entry[] = openingEntry ? [openingEntry, ...sorted] : sorted;

    // UI uchun DESC — eng yangisi tepada
    return all.reverse();
  }
}
