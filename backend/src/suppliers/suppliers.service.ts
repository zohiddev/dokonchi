import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

const D = Prisma.Decimal;

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { batches: true } } },
    });
    // Har bir ta'minotchi bo'yicha qarz/oldi-berdi ko'rsatkichlarini boyitamiz
    return Promise.all(
      suppliers.map(async (s) => ({
        ...s,
        ...(await this.computeBalance(s.id)),
      })),
    );
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException("Ta'minotchi topilmadi");
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { ...dto } });
  }

  async update(id: number, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: number) {
    await this.findOne(id);
    const inUse = await this.prisma.batch.count({ where: { supplierId: id } });
    if (inUse > 0) {
      throw new BadRequestException(
        `Bu ta'minotchi ${inUse} ta partiya bilan bog'langan — o'chirib bo'lmaydi`,
      );
    }
    await this.prisma.supplierPayment.deleteMany({ where: { supplierId: id } });
    await this.prisma.supplier.delete({ where: { id } });
    return { success: true };
  }

  async balance(id: number) {
    await this.findOne(id);
    return this.computeBalance(id);
  }

  // Ta'minotchi avval yetkazgan (partiyalari bo'lgan) faol mahsulotlar — yetkazma qo'shishda
  // mahsulot select'ini filterlash uchun. Tarix bo'lmasa bo'sh ro'yxat (frontend hammasiga qaytadi).
  async products(id: number) {
    await this.findOne(id);
    const rows = await this.prisma.batch.findMany({
      where: { supplierId: id },
      select: { productId: true },
      distinct: ['productId'],
    });
    const ids = rows.map((r) => r.productId);
    if (ids.length === 0) return [];
    return this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  // Ta'minotchi bo'yicha oldi-berdi: jami olingan tovar (tannarx), to'langan, qarz,
  // sotilgan/qolgan tovar qiymati
  async computeBalance(id: number) {
    const [batches, paidAgg] = await Promise.all([
      this.prisma.batch.findMany({
        where: { supplierId: id },
        select: { quantityReceived: true, quantityRemaining: true, costPricePerUnit: true },
      }),
      this.prisma.supplierPayment.aggregate({
        where: { supplierId: id },
        _sum: { amount: true },
      }),
    ]);

    let totalPurchased = new D(0);
    let soldCostValue = new D(0);
    let remainingCostValue = new D(0);
    for (const b of batches) {
      const received = new D(b.quantityReceived);
      const remaining = new D(b.quantityRemaining);
      const cost = new D(b.costPricePerUnit);
      totalPurchased = totalPurchased.plus(received.mul(cost));
      remainingCostValue = remainingCostValue.plus(remaining.mul(cost));
      soldCostValue = soldCostValue.plus(received.minus(remaining).mul(cost));
    }

    const totalPaid = paidAgg._sum.amount ?? new D(0);
    return {
      supplierId: id,
      batchCount: batches.length,
      totalPurchased, // jami olingan tovar (tannarx qiymati)
      totalPaid, // jami to'langan
      balance: totalPurchased.minus(totalPaid), // qarz (manfiy => oldindan to'langan)
      soldCostValue, // sotilgan qism (tannarx)
      remainingCostValue, // omborda qolgan (tannarx)
    };
  }

  // To'liq oldi-berdi tarixi — partiyalar (qarz +) va to'lovlar (qarz −), running balance bilan
  async history(id: number) {
    await this.findOne(id);
    const [batches, payments] = await Promise.all([
      this.prisma.batch.findMany({
        where: { supplierId: id },
        select: {
          id: true,
          receivedDate: true,
          quantityReceived: true,
          quantityRemaining: true,
          costPricePerUnit: true,
          notes: true,
          product: { select: { name: true, baseUnit: true } },
        },
        orderBy: { receivedDate: 'asc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId: id },
        orderBy: { paymentDate: 'asc' },
      }),
    ]);

    type PurchaseEntry = {
      type: 'purchase';
      id: number;
      date: Date;
      productName: string;
      unit: string;
      quantityReceived: Prisma.Decimal;
      quantityRemaining: Prisma.Decimal;
      costPricePerUnit: Prisma.Decimal;
      amount: Prisma.Decimal;
      notes: string | null;
      runningBalance: Prisma.Decimal;
    };
    type PaymentEntry = {
      type: 'payment';
      id: number;
      date: Date;
      amount: Prisma.Decimal;
      notes: string | null;
      runningBalance: Prisma.Decimal;
    };
    type Entry = PurchaseEntry | PaymentEntry;

    const purchaseEntries: PurchaseEntry[] = batches.map((b) => ({
      type: 'purchase',
      id: b.id,
      date: b.receivedDate,
      productName: b.product.name,
      unit: b.product.baseUnit,
      quantityReceived: b.quantityReceived,
      quantityRemaining: b.quantityRemaining,
      costPricePerUnit: b.costPricePerUnit,
      amount: new D(b.quantityReceived).mul(b.costPricePerUnit),
      notes: b.notes,
      runningBalance: new D(0),
    }));

    const paymentEntries: PaymentEntry[] = payments.map((p) => ({
      type: 'payment',
      id: p.id,
      date: p.paymentDate,
      amount: p.amount,
      notes: p.notes,
      runningBalance: new D(0),
    }));

    const sorted: Entry[] = [...purchaseEntries, ...paymentEntries].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    let running = new D(0);
    for (const e of sorted) {
      running = e.type === 'purchase' ? running.plus(e.amount) : running.minus(e.amount);
      e.runningBalance = running;
    }

    // UI uchun DESC — eng yangisi tepada
    return sorted.reverse();
  }

  async createPayment(dto: CreateSupplierPaymentDto) {
    await this.findOne(dto.supplierId);
    if (dto.batchId !== undefined) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batchId },
        select: { id: true },
      });
      if (!batch) throw new BadRequestException('Partiya topilmadi');
    }

    const payment = await this.prisma.supplierPayment.create({
      data: {
        supplierId: dto.supplierId,
        batchId: dto.batchId ?? null,
        amount: dto.amount,
        notes: dto.notes ?? null,
      },
    });

    // Ta'minotchiga Telegram bildirishnoma (fire-and-forget)
    void this.telegram.notifySupplierPayment(payment.id);

    const balance = await this.computeBalance(dto.supplierId);
    return { payment, balance };
  }
}
