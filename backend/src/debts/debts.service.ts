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

  // Mijoz nasiya/to'lov tarixi
  async history(customerId: number) {
    const [sales, payments] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId, paymentType: PaymentType.NASIYA },
        select: {
          id: true,
          saleDate: true,
          totalAmount: true,
          items: { select: { product: { select: { name: true } } } },
        },
        orderBy: { saleDate: 'desc' },
      }),
      this.prisma.debtPayment.findMany({
        where: { customerId },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    const credits = sales.map((s) => ({
      type: 'credit' as const,
      id: s.id,
      date: s.saleDate,
      amount: s.totalAmount,
      summary: s.items.map((i) => i.product.name).join(', '),
    }));

    const debits = payments.map((p) => ({
      type: 'payment' as const,
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      summary: p.notes ?? "To'lov",
    }));

    return [...credits, ...debits].sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
  }
}
