import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';

const D = Prisma.Decimal;

const PAYMENT_LABEL: Record<string, string> = {
  NAQD: 'Naqd',
  KARTA: 'Karta',
  NASIYA: 'Nasiya',
};

const UNIT_LABEL: Record<string, string> = {
  KG: 'kg',
  DONA: 'dona',
  LITR: 'L',
  QOP: 'qop',
  QUTI: 'quti',
};

// Tugma matnlari (kelgan xabarni shu bo'yicha aniqlaymiz)
const BTN_SHARE = '📞 Telefon raqamni ulashish';
// Mijoz menyusi
const BTN_LAST = '🧾 Oxirgi xaridlar';
const BTN_DEBT = '💳 Qarzim';
const BTN_HISTORY = '📜 Xaridlar tarixi';
// Ta'minotchi menyusi
const SUP_DEBT = '💰 Bizdagi qarz';
const SUP_BATCHES = '📦 Oxirgi partiyalar';
const SUP_HISTORY = '📜 Hisob tarixi';

/**
 * Telegram bildirishnoma boti (long polling, qo'shimcha kutubxonasiz).
 * - Mijoz botga telefon raqamini ulaydi → raqam bo'yicha mijozga bog'lanadi (telegramChatId).
 * - Har sotuv/to'lovdan keyin shu mijozga formatlangan xabar yuboriladi.
 * TELEGRAM_BOT_TOKEN env bo'lmasa — bot butunlay o'chiq (no-op), ilova normal ishlaydi.
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('TelegramService');
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;
  private readonly shopName = process.env.SHOP_NAME || "Do'kon";
  private offset = 0;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  onModuleInit() {
    if (!this.token) {
      this.logger.warn("TELEGRAM_BOT_TOKEN yo'q — Telegram bot o'chirilgan");
      return;
    }
    this.stopped = false;
    void this.pollLoop();
    this.logger.log('Telegram bot ishga tushdi (long polling)');
  }

  onModuleDestroy() {
    this.stopped = true;
  }

  // ===== Telegram API =====
  private api(method: string): string {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  private async call(method: string, body: unknown): Promise<unknown> {
    const res = await fetch(this.api(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // ===== Long polling =====
  private async pollLoop(): Promise<void> {
    while (!this.stopped) {
      try {
        const url =
          `${this.api('getUpdates')}?timeout=30&offset=${this.offset}` +
          `&allowed_updates=${encodeURIComponent('["message"]')}`;
        const res = await fetch(url);
        const data = (await res.json()) as { ok?: boolean; result?: TgUpdate[] };
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update).catch((e) =>
              this.logger.error(`update xato: ${errMsg(e)}`),
            );
          }
        }
      } catch (e) {
        this.logger.error(`getUpdates xato: ${errMsg(e)}`);
        await sleep(3000);
      }
    }
  }

  // ===== Kiruvchi xabarlar =====
  private async handleUpdate(update: TgUpdate): Promise<void> {
    const msg = update.message;
    if (!msg?.chat?.id) return;
    const chatId = msg.chat.id;

    if (msg.contact) {
      await this.handleContact(msg);
      return;
    }
    if (typeof msg.text !== 'string') return;

    const text = msg.text.trim();

    // Mijoz sifatida ulangan bo'lsa — mijoz menyusi
    const customer = await this.findCustomerByChatId(chatId);
    if (customer) {
      if (text === BTN_DEBT) {
        await this.sendDebt(chatId, customer.id);
      } else if (text === BTN_LAST) {
        await this.sendLastPurchases(chatId, customer.id);
      } else if (text === BTN_HISTORY) {
        await this.sendHistory(chatId, customer.id);
      } else {
        await this.sendMenu(chatId, `Assalomu alaykum, ${customer.name}! Quyidagidan tanlang:`);
      }
      return;
    }

    // Ta'minotchi sifatida ulangan bo'lsa — ta'minotchi menyusi
    const supplier = await this.findSupplierByChatId(chatId);
    if (supplier) {
      if (text === SUP_DEBT) {
        await this.sendSupplierDebt(chatId, supplier.id);
      } else if (text === SUP_BATCHES) {
        await this.sendSupplierBatches(chatId, supplier.id);
      } else if (text === SUP_HISTORY) {
        await this.sendSupplierHistory(chatId, supplier.id);
      } else {
        await this.sendSupplierMenu(chatId, `Assalomu alaykum, ${supplier.name}! Quyidagidan tanlang:`);
      }
      return;
    }

    // Ulanmagan — raqam ulash tugmasini ko'rsatamiz
    await this.sendContactPrompt(chatId);
  }

  private async sendContactPrompt(chatId: number, text?: string): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text:
        text ??
        `Assalomu alaykum! "${this.shopName}" do'koni boti.\n\n` +
          'Xaridlaringiz va qarz holatini shu yerda olish uchun pastdagi tugma orqali ' +
          'telefon raqamingizni ulashing.',
      reply_markup: {
        keyboard: [[{ text: BTN_SHARE, request_contact: true }]],
        resize_keyboard: true,
      },
    });
  }

  private async sendMenu(chatId: number, text: string): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: {
        keyboard: [[{ text: BTN_LAST }, { text: BTN_DEBT }], [{ text: BTN_HISTORY }]],
        resize_keyboard: true,
      },
    });
  }

  private async handleContact(msg: TgMessage): Promise<void> {
    const chatId = msg.chat.id;
    const contact = msg.contact!;

    // Faqat o'z raqamini ulashishga ruxsat (boshqa odamnikini emas)
    if (contact.user_id && msg.from?.id && contact.user_id !== msg.from.id) {
      await this.sendContactPrompt(
        chatId,
        "Iltimos, faqat o'zingizning raqamingizni ulashing.",
      );
      return;
    }

    const digits = normalizePhone(contact.phone_number);

    // Avval mijoz, keyin ta'minotchi (bir raqam ikkalasida bo'lsa — mijoz ustun)
    const customer = await this.findCustomerByPhone(digits);
    if (customer) {
      await this.clearChatLinks(chatId);
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { telegramChatId: String(chatId) },
      });
      await this.sendMenu(
        chatId,
        `Rahmat, ${customer.name}! ✅ Endi xaridlaringiz va qarz holati shu yerga yuboriladi.\n\n` +
          "Quyidagi tugmalar orqali ma'lumotlarni ko'rishingiz mumkin:",
      );
      return;
    }

    const supplier = await this.findSupplierByPhone(digits);
    if (supplier) {
      await this.clearChatLinks(chatId);
      await this.prisma.supplier.update({
        where: { id: supplier.id },
        data: { telegramChatId: String(chatId) },
      });
      await this.sendSupplierMenu(
        chatId,
        `Rahmat, ${supplier.name}! ✅ Endi qabul qilingan tovarlar va bizdagi qarz holati shu yerga yuboriladi.\n\n` +
          "Quyidagi tugmalar orqali ma'lumotlarni ko'rishingiz mumkin:",
      );
      return;
    }

    // Topilmadi — tugmani QOLDIRAMIZ, admin qo'shgach qayta yuborsin
    await this.sendContactPrompt(
      chatId,
      `Raqamingiz (${contact.phone_number}) ro'yxatda topilmadi.\n` +
        "Do'kon egasi sizni qo'shgach, pastdagi tugma orqali raqamingizni qaytadan yuboring.",
    );
  }

  // Bitta chat = bitta rol: bu chatId'ni mijoz va ta'minotchidan uzamiz
  private async clearChatLinks(chatId: number): Promise<void> {
    await this.prisma.customer.updateMany({
      where: { telegramChatId: String(chatId) },
      data: { telegramChatId: null },
    });
    await this.prisma.supplier.updateMany({
      where: { telegramChatId: String(chatId) },
      data: { telegramChatId: null },
    });
  }

  private async findCustomerByChatId(chatId: number) {
    return this.prisma.customer.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, name: true },
    });
  }

  private async findSupplierByChatId(chatId: number) {
    return this.prisma.supplier.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { id: true, name: true },
    });
  }

  // ===== Mijoz so'rovlari (menyu tugmalari) =====
  private async sendDebt(chatId: number, customerId: number): Promise<void> {
    const bal = await this.customers.computeBalance(customerId);
    const text = bal.balance.gt(0)
      ? `💳 Joriy qarzingiz: ${fmtMoney(bal.balance)} so'm\n` +
        `Jami nasiya: ${fmtMoney(bal.totalCredit)} · To'langan: ${fmtMoney(bal.totalPaid)}`
      : "✅ Sizda qarz yo'q. Rahmat!";
    await this.send(String(chatId), text);
  }

  private async sendLastPurchases(chatId: number, customerId: number): Promise<void> {
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      orderBy: { saleDate: 'desc' },
      take: 3,
      include: { items: { include: { product: { select: { name: true, baseUnit: true } } } } },
    });
    if (sales.length === 0) {
      await this.send(String(chatId), "Hali xaridlaringiz yo'q.");
      return;
    }
    const blocks = sales.map((s) => {
      const lines = s.items.map(
        (i) =>
          `   • ${i.product.name} — ${fmtQty(i.quantity, i.product.baseUnit)} × ${fmtMoney(i.unitPrice)}`,
      );
      const status = s.paymentType === 'NASIYA' ? 'Nasiya' : "To'langan";
      return (
        `🧾 ${fmtDate(s.saleDate)}\n${lines.join('\n')}\n` +
        `   Jami: ${fmtMoney(s.totalAmount)} so'm (${status})`
      );
    });
    await this.send(String(chatId), `🧾 Oxirgi xaridlaringiz:\n\n${blocks.join('\n\n')}`);
  }

  private async sendHistory(chatId: number, customerId: number): Promise<void> {
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      orderBy: { saleDate: 'desc' },
      take: 10,
      include: { items: { select: { product: { select: { name: true } } } } },
    });
    if (sales.length === 0) {
      await this.send(String(chatId), "Xaridlar tarixi bo'sh.");
      return;
    }
    const lines = sales.map((s) => {
      const names = s.items.map((i) => i.product.name).join(', ') || 'Xarid';
      const status = s.paymentType === 'NASIYA' ? '📝' : '✅';
      return `${status} ${fmtDate(s.saleDate)} — ${fmtMoney(s.totalAmount)} so'm\n   ${names}`;
    });
    const bal = await this.customers.computeBalance(customerId);
    await this.send(
      String(chatId),
      `📜 Xaridlar tarixi (so'nggi ${sales.length}):\n\n${lines.join('\n')}\n\n` +
        `💳 Joriy qarz: ${fmtMoney(bal.balance)} so'm`,
    );
  }

  // UZ raqamlari: oxirgi 9 raqam bo'yicha moslaymiz
  private async findCustomerByPhone(digits: string) {
    if (digits.length < 7) return null;
    const last9 = digits.slice(-9);
    const candidates = await this.prisma.customer.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
    });
    return candidates.find((c) => normalizePhone(c.phone).slice(-9) === last9) ?? null;
  }

  private async findSupplierByPhone(digits: string) {
    if (digits.length < 7) return null;
    const last9 = digits.slice(-9);
    const candidates = await this.prisma.supplier.findMany({
      where: { phone: { not: null } },
      select: { id: true, name: true, phone: true },
    });
    return candidates.find((s) => normalizePhone(s.phone).slice(-9) === last9) ?? null;
  }

  // Ta'minotchiga qarzimiz = Σ(partiya tannarx qiymati) − Σ(to'lovlar)
  // (manba: suppliers.service.ts computeBalance — bu yerda aylanma bog'liqlikni
  //  oldini olish uchun takrorlangan)
  private async computeSupplierBalance(supplierId: number) {
    const [batches, paidAgg] = await Promise.all([
      this.prisma.batch.findMany({
        where: { supplierId },
        select: { quantityReceived: true, costPricePerUnit: true },
      }),
      this.prisma.supplierPayment.aggregate({
        where: { supplierId },
        _sum: { amount: true },
      }),
    ]);
    let totalPurchased = new D(0);
    for (const b of batches) {
      totalPurchased = totalPurchased.plus(new D(b.quantityReceived).mul(b.costPricePerUnit));
    }
    const totalPaid = paidAgg._sum.amount ?? new D(0);
    return { totalPurchased, totalPaid, balance: totalPurchased.minus(totalPaid) };
  }

  // ===== Ta'minotchi menyusi =====
  private async sendSupplierMenu(chatId: number, text: string): Promise<void> {
    await this.call('sendMessage', {
      chat_id: chatId,
      text,
      reply_markup: {
        keyboard: [[{ text: SUP_DEBT }, { text: SUP_BATCHES }], [{ text: SUP_HISTORY }]],
        resize_keyboard: true,
      },
    });
  }

  private async sendSupplierDebt(chatId: number, supplierId: number): Promise<void> {
    const bal = await this.computeSupplierBalance(supplierId);
    const text = bal.balance.gt(0)
      ? `💰 Sizga qarzimiz: ${fmtMoney(bal.balance)} so'm\n` +
        `Jami olingan tovar: ${fmtMoney(bal.totalPurchased)} · To'langan: ${fmtMoney(bal.totalPaid)}`
      : "✅ Sizga qarzimiz yo'q. Rahmat!";
    await this.send(String(chatId), text);
  }

  private async sendSupplierBatches(chatId: number, supplierId: number): Promise<void> {
    const batches = await this.prisma.batch.findMany({
      where: { supplierId },
      orderBy: { receivedDate: 'desc' },
      take: 3,
      include: { product: { select: { name: true, baseUnit: true } } },
    });
    if (batches.length === 0) {
      await this.send(String(chatId), "Hali partiya qabul qilinmagan.");
      return;
    }
    const blocks = batches.map((b) => {
      const total = new D(b.quantityReceived).mul(b.costPricePerUnit);
      return (
        `📦 ${fmtDate(b.receivedDate)}\n` +
        `   ${b.product.name} — ${fmtQty(b.quantityReceived, b.product.baseUnit)} × ${fmtMoney(b.costPricePerUnit)}\n` +
        `   Jami: ${fmtMoney(total)} so'm`
      );
    });
    await this.send(String(chatId), `📦 Oxirgi partiyalar:\n\n${blocks.join('\n\n')}`);
  }

  private async sendSupplierHistory(chatId: number, supplierId: number): Promise<void> {
    const [batches, payments] = await Promise.all([
      this.prisma.batch.findMany({
        where: { supplierId },
        orderBy: { receivedDate: 'desc' },
        take: 10,
        include: { product: { select: { name: true } } },
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId },
        orderBy: { paymentDate: 'desc' },
        take: 10,
      }),
    ]);
    type Row = { date: Date; line: string };
    const rows: Row[] = [
      ...batches.map((b) => ({
        date: b.receivedDate,
        line: `📦 ${fmtDate(b.receivedDate)} — ${b.product.name}: +${fmtMoney(new D(b.quantityReceived).mul(b.costPricePerUnit))}`,
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        line: `💵 ${fmtDate(p.paymentDate)} — to'lov: −${fmtMoney(p.amount)}`,
      })),
    ];
    if (rows.length === 0) {
      await this.send(String(chatId), "Hisob tarixi bo'sh.");
      return;
    }
    rows.sort((a, b) => b.date.getTime() - a.date.getTime());
    const lines = rows.slice(0, 10).map((r) => r.line);
    const bal = await this.computeSupplierBalance(supplierId);
    await this.send(
      String(chatId),
      `📜 Hisob tarixi (so'nggi ${lines.length}):\n\n${lines.join('\n')}\n\n` +
        `💰 Sizga qarzimiz: ${fmtMoney(bal.balance)} so'm`,
    );
  }

  // ===== Bildirishnomalar (fire-and-forget; xato savdoni buzmaydi) =====
  async notifySale(saleId: number): Promise<void> {
    if (!this.token) return;
    try {
      const sale = await this.prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          customer: true,
          items: { include: { product: { select: { name: true, baseUnit: true } } } },
        },
      });
      if (!sale?.customer?.telegramChatId) return;

      const lines = sale.items.map((i) => {
        const q = fmtQty(i.quantity, i.product.baseUnit);
        return `• ${i.product.name} — ${q} × ${fmtMoney(i.unitPrice)} = ${fmtMoney(i.lineTotal)}`;
      });

      const isCredit = sale.paymentType === 'NASIYA';
      const paid = isCredit ? new D(0) : sale.totalAmount;
      const saleDebt = isCredit ? sale.totalAmount : new D(0);
      const balance = (await this.customers.computeBalance(sale.customer.id)).balance;

      const text =
        `🧾 Xarid — "${this.shopName}"\n` +
        `${fmtDate(sale.saleDate)}\n\n` +
        `${lines.join('\n')}\n\n` +
        `Jami: ${fmtMoney(sale.totalAmount)} so'm\n` +
        `To'landi: ${fmtMoney(paid)} so'm (${PAYMENT_LABEL[sale.paymentType]})` +
        (saleDebt.gt(0) ? `\nBu xarid qarzga: ${fmtMoney(saleDebt)} so'm` : '') +
        `\n💳 Umumiy qarzingiz: ${fmtMoney(balance)} so'm`;

      await this.send(sale.customer.telegramChatId, text);
    } catch (e) {
      this.logger.error(`notifySale xato: ${errMsg(e)}`);
    }
  }

  async notifyPayment(paymentId: number): Promise<void> {
    if (!this.token) return;
    try {
      const payment = await this.prisma.debtPayment.findUnique({
        where: { id: paymentId },
        include: { customer: true },
      });
      if (!payment?.customer?.telegramChatId) return;

      const balance = (await this.customers.computeBalance(payment.customerId)).balance;
      const text =
        `💵 To'lov qabul qilindi — "${this.shopName}"\n` +
        `${fmtDate(payment.paymentDate)}\n\n` +
        `To'lov: ${fmtMoney(payment.amount)} so'm\n` +
        `💳 Qolgan qarzingiz: ${fmtMoney(balance)} so'm` +
        (payment.notes ? `\nIzoh: ${payment.notes}` : '');

      await this.send(payment.customer.telegramChatId, text);
    } catch (e) {
      this.logger.error(`notifyPayment xato: ${errMsg(e)}`);
    }
  }

  // ===== Ta'minotchi bildirishnomalari =====
  async notifySupplierBatch(batchId: number): Promise<void> {
    if (!this.token) return;
    try {
      const batch = await this.prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          supplier: true,
          product: { select: { name: true, baseUnit: true } },
        },
      });
      if (!batch?.supplier?.telegramChatId) return;

      const total = new D(batch.quantityReceived).mul(batch.costPricePerUnit);
      const paidAgg = await this.prisma.supplierPayment.aggregate({
        where: { batchId },
        _sum: { amount: true },
      });
      const paid = paidAgg._sum.amount ?? new D(0);
      const balance = (await this.computeSupplierBalance(batch.supplier.id)).balance;

      const text =
        `📦 Tovar qabul qilindi — "${this.shopName}"\n` +
        `${fmtDate(batch.receivedDate)}\n\n` +
        `${batch.product.name} — ${fmtQty(batch.quantityReceived, batch.product.baseUnit)} × ${fmtMoney(batch.costPricePerUnit)}\n` +
        `Jami: ${fmtMoney(total)} so'm` +
        (paid.gt(0) ? `\nTo'landi: ${fmtMoney(paid)} so'm` : '') +
        `\n💰 Sizga umumiy qarzimiz: ${fmtMoney(balance)} so'm`;

      await this.send(batch.supplier.telegramChatId, text);
    } catch (e) {
      this.logger.error(`notifySupplierBatch xato: ${errMsg(e)}`);
    }
  }

  async notifySupplierPayment(paymentId: number): Promise<void> {
    if (!this.token) return;
    try {
      const payment = await this.prisma.supplierPayment.findUnique({
        where: { id: paymentId },
        include: { supplier: true },
      });
      if (!payment?.supplier?.telegramChatId) return;

      const balance = (await this.computeSupplierBalance(payment.supplierId)).balance;
      const text =
        `💵 To'lov qildik — "${this.shopName}"\n` +
        `${fmtDate(payment.paymentDate)}\n\n` +
        `To'lov: ${fmtMoney(payment.amount)} so'm\n` +
        `💰 Sizga qolgan qarzimiz: ${fmtMoney(balance)} so'm` +
        (payment.notes ? `\nIzoh: ${payment.notes}` : '');

      await this.send(payment.supplier.telegramChatId, text);
    } catch (e) {
      this.logger.error(`notifySupplierPayment xato: ${errMsg(e)}`);
    }
  }

  private async send(chatId: string, text: string): Promise<void> {
    await this.call('sendMessage', { chat_id: chatId, text });
  }
}

// ===== Yordamchilar =====
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function normalizePhone(phone?: string | null): string {
  return (phone ?? '').replace(/\D/g, '');
}

function fmtMoney(v: Prisma.Decimal | string | number): string {
  const n = Math.round(Number(v));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function fmtQty(v: Prisma.Decimal, unit: string): string {
  const n = Number(v);
  const num = Number.isInteger(n) ? String(n) : String(n);
  return `${num} ${UNIT_LABEL[unit] ?? ''}`.trim();
}

function fmtDate(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ===== Telegram tiplari (minimal) =====
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}
interface TgMessage {
  chat: { id: number };
  from?: { id: number };
  text?: string;
  contact?: { phone_number: string; user_id?: number };
}
