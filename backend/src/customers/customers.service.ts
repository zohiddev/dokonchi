import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const D = Prisma.Decimal;

export interface CustomerBalance {
  customerId: number;
  totalCredit: Prisma.Decimal;   // jami nasiya sotuv summasi
  totalPaid: Prisma.Decimal;     // jami to'lov
  balance: Prisma.Decimal;       // qarz qoldig'i (credit - paid)
  lastCreditDate: Date | null;
  lastPaymentDate: Date | null;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    return customer;
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: { ...dto } });
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    await this.findOne(id);
    const saleCount = await this.prisma.sale.count({ where: { customerId: id } });
    if (saleCount > 0) {
      throw new BadRequestException(
        `Bu mijoz ${saleCount} ta sotuv bilan bog'langan — o'chirib bo'lmaydi`,
      );
    }
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }

  async balance(id: number): Promise<CustomerBalance> {
    await this.findOne(id);
    return this.computeBalance(id);
  }

  async computeBalance(id: number): Promise<CustomerBalance> {
    const [customer, creditAgg, chargeAgg, paidAgg, lastCredit, lastCharge, lastPayment] =
      await Promise.all([
        this.prisma.customer.findUnique({
          where: { id },
          select: { openingDebt: true, createdAt: true },
        }),
        this.prisma.sale.aggregate({
          where: { customerId: id, paymentType: PaymentType.NASIYA },
          _sum: { totalAmount: true },
        }),
        this.prisma.debtCharge.aggregate({
          where: { customerId: id },
          _sum: { amount: true },
        }),
        this.prisma.debtPayment.aggregate({
          where: { customerId: id },
          _sum: { amount: true },
        }),
        this.prisma.sale.findFirst({
          where: { customerId: id, paymentType: PaymentType.NASIYA },
          orderBy: { saleDate: 'desc' },
          select: { saleDate: true },
        }),
        this.prisma.debtCharge.findFirst({
          where: { customerId: id },
          orderBy: { chargeDate: 'desc' },
          select: { chargeDate: true },
        }),
        this.prisma.debtPayment.findFirst({
          where: { customerId: id },
          orderBy: { paymentDate: 'desc' },
          select: { paymentDate: true },
        }),
      ]);

    const openingDebt = customer?.openingDebt ?? new D(0);
    // Jami nasiyaga eski (boshlang'ich) qarz + qo'lda qo'shilgan eski qarzlarni ham qo'shamiz
    const totalCredit = (creditAgg._sum.totalAmount ?? new D(0))
      .plus(openingDebt)
      .plus(chargeAgg._sum.amount ?? new D(0));
    const totalPaid = paidAgg._sum.amount ?? new D(0);

    // Oxirgi qarz sanasi — nasiya sotuv yoki qo'lda qarzlardan eng yangisi
    const creditDates = [lastCredit?.saleDate, lastCharge?.chargeDate].filter(
      (d): d is Date => d != null,
    );
    const lastCreditDate = creditDates.length
      ? creditDates.reduce((a, b) => (a > b ? a : b))
      : null;

    return {
      customerId: id,
      totalCredit,
      totalPaid,
      balance: totalCredit.minus(totalPaid),
      lastCreditDate,
      lastPaymentDate: lastPayment?.paymentDate ?? null,
    };
  }
}
