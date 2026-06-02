import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtPaymentDto } from './dto/create-debt-payment.dto';

const D = Prisma.Decimal;

@Injectable()
export class DebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  // Qarzdor mijozlar (balans > 0)
  async findAll() {
    const customers = await this.prisma.customer.findMany({
      where: { sales: { some: { paymentType: PaymentType.NASIYA } } },
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

    const balance = await this.customers.computeBalance(dto.customerId);
    return { payment, balance };
  }

  // Mijoz nasiya/to'lov tarixi — items + running balance bilan boyitilgan
  async history(customerId: number) {
    const [sales, payments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId, paymentType: PaymentType.NASIYA },
        select: {
          id: true,
          saleDate: true,
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

    type CreditEntry = {
      type: 'credit';
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
    type Entry = CreditEntry | PaymentEntry;

    const credits: CreditEntry[] = sales.map((s) => ({
      type: 'credit',
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

    const debits: PaymentEntry[] = payments.map((p) => ({
      type: 'payment',
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      notes: p.notes,
      summary: p.notes ?? "To'lov",
      runningBalance: new D(0),
    }));

    // Xronologik (ASC) tartibda birlashtiramiz va running balance hisoblaymiz
    const all: Entry[] = [...credits, ...debits].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    let running = new D(0);
    for (const e of all) {
      running = e.type === 'credit' ? running.plus(e.amount) : running.minus(e.amount);
      e.runningBalance = running;
    }

    // UI uchun DESC — eng yangisi tepada
    return all.reverse();
  }
}
