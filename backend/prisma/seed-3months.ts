/**
 * 3 oylik realistik test ma'lumotlari generatori.
 * - ~5 000 000 so'm/kun o'rtacha savdo
 * - 30 xil tovar, har biriga 1-2 haftada yangi partiya (FIFO)
 * - 30 doimiy nasiya mijozi (qarz oldi-berdi tarixi bilan)
 *
 * Ishlatish:  npx ts-node --transpile-only prisma/seed-3months.ts
 *
 * DIQQAT: bu skript barcha mavjud ma'lumotni o'chiradi (TRUNCATE) va
 * to'liq izchil yangi to'plam yaratadi. Login: +998901234567 / admin123
 */
import { PaymentType, PrismaClient, Role, Unit } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------- yordamchilar ----------
const DAYS = 90;
const DAILY_TARGET = 5_000_000; // o'rtacha kunlik savdo (so'm)

function isoWeekLabel(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const startDate = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (DAYS - 1));
  return d;
})();

function dateAt(dayOffset: number, hour = 10, minute = 0): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const ri = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const rf = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const round = (n: number) => Math.round(n);

function weightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// ---------- mahsulot katalogi (30 ta) ----------
interface ProdDef {
  name: string;
  cat: string;
  unit: Unit;
  cost: number; // bazaviy tannarx (so'm)
  sale: number; // bazaviy sotuv narxi (so'm)
  qMin: number; // bitta sotuvdagi tipik minimal miqdor
  qMax: number;
  weight: number; // tanlanish chastotasi
  packSize?: number;
}

const CATALOG: ProdDef[] = [
  // Un / don
  { name: 'Un Oliy nav 25kg', cat: 'Un', unit: Unit.QOP, cost: 240000, sale: 282000, qMin: 1, qMax: 5, weight: 9, packSize: 25 },
  { name: 'Un 1-nav 50kg', cat: 'Un', unit: Unit.QOP, cost: 410000, sale: 468000, qMin: 1, qMax: 4, weight: 7, packSize: 50 },
  { name: 'Guruch Lazer', cat: 'Donli mahsulotlar', unit: Unit.KG, cost: 15200, sale: 18200, qMin: 5, qMax: 40, weight: 9 },
  { name: 'Guruch Devzira', cat: 'Donli mahsulotlar', unit: Unit.KG, cost: 27000, sale: 33000, qMin: 3, qMax: 20, weight: 6 },
  { name: 'Grechka', cat: 'Donli mahsulotlar', unit: Unit.KG, cost: 17000, sale: 21000, qMin: 2, qMax: 15, weight: 4 },
  { name: "No'xat", cat: 'Donli mahsulotlar', unit: Unit.KG, cost: 18500, sale: 22500, qMin: 3, qMax: 20, weight: 4 },
  { name: 'Mosh', cat: 'Donli mahsulotlar', unit: Unit.KG, cost: 21000, sale: 26000, qMin: 2, qMax: 15, weight: 3 },
  { name: 'Makaron Italmas 400g', cat: 'Donli mahsulotlar', unit: Unit.DONA, cost: 7600, sale: 9500, qMin: 5, qMax: 40, weight: 6 },
  { name: 'Vermishel 400g', cat: 'Donli mahsulotlar', unit: Unit.DONA, cost: 6800, sale: 8500, qMin: 5, qMax: 30, weight: 4 },
  // Yog'
  { name: "Paxta yog'i 5L", cat: "Yog'", unit: Unit.LITR, cost: 80000, sale: 95000, qMin: 1, qMax: 10, weight: 6 },
  { name: "Kungaboqar yog'i 1L", cat: "Yog'", unit: Unit.LITR, cost: 19500, sale: 24000, qMin: 3, qMax: 24, weight: 6 },
  { name: "Kungaboqar yog'i 5L", cat: "Yog'", unit: Unit.LITR, cost: 92000, sale: 110000, qMin: 1, qMax: 8, weight: 5 },
  // Shakar / tuz
  { name: 'Shakar 1kg', cat: 'Shakar', unit: Unit.KG, cost: 11500, sale: 14000, qMin: 5, qMax: 50, weight: 8 },
  { name: 'Shakar 50kg qop', cat: 'Shakar', unit: Unit.QOP, cost: 560000, sale: 650000, qMin: 1, qMax: 3, weight: 3, packSize: 50 },
  { name: 'Tuz yodlangan 1kg', cat: 'Ziravorlar', unit: Unit.KG, cost: 3200, sale: 4500, qMin: 5, qMax: 40, weight: 4 },
  // Ziravorlar / konserva
  { name: 'Qora murch 50g', cat: 'Ziravorlar', unit: Unit.DONA, cost: 9000, sale: 12000, qMin: 2, qMax: 12, weight: 2 },
  { name: 'Lavr bargi 10g', cat: 'Ziravorlar', unit: Unit.DONA, cost: 2500, sale: 3500, qMin: 3, qMax: 15, weight: 2 },
  { name: 'Tomat pastasi 500g', cat: 'Konserva', unit: Unit.DONA, cost: 11000, sale: 14500, qMin: 3, qMax: 20, weight: 3 },
  { name: 'Sgushyonka 380g', cat: 'Konserva', unit: Unit.DONA, cost: 13500, sale: 17000, qMin: 3, qMax: 18, weight: 3 },
  // Ichimliklar
  { name: 'Qora choy Ahmad 250g', cat: 'Ichimliklar', unit: Unit.DONA, cost: 22000, sale: 28000, qMin: 2, qMax: 15, weight: 4 },
  { name: "Ko'k choy 100g", cat: 'Ichimliklar', unit: Unit.DONA, cost: 8000, sale: 11000, qMin: 3, qMax: 18, weight: 3 },
  { name: 'Mineral suv 1.5L', cat: 'Ichimliklar', unit: Unit.DONA, cost: 4200, sale: 5500, qMin: 6, qMax: 48, weight: 5 },
  { name: 'Coca-Cola 1L', cat: 'Ichimliklar', unit: Unit.DONA, cost: 9500, sale: 13000, qMin: 4, qMax: 30, weight: 4 },
  { name: 'Sok Yashel 1L', cat: 'Ichimliklar', unit: Unit.DONA, cost: 11000, sale: 15000, qMin: 3, qMax: 20, weight: 3 },
  // Sut / non
  { name: 'Sut 1L Nestle', cat: 'Sut mahsulotlari', unit: Unit.DONA, cost: 11000, sale: 14000, qMin: 4, qMax: 24, weight: 4 },
  { name: 'Sariyog 200g', cat: 'Sut mahsulotlari', unit: Unit.DONA, cost: 18000, sale: 23000, qMin: 2, qMax: 15, weight: 3 },
  { name: 'Tuxum 30 dona', cat: 'Sut mahsulotlari', unit: Unit.QUTI, cost: 32000, sale: 39000, qMin: 1, qMax: 12, weight: 5 },
  // Gigiena / boshqa
  { name: 'Kir sovun 4x125g', cat: 'Gigiena', unit: Unit.DONA, cost: 9000, sale: 12500, qMin: 3, qMax: 20, weight: 3 },
  { name: 'Shampun Head&Shoulders', cat: 'Gigiena', unit: Unit.DONA, cost: 28000, sale: 36000, qMin: 1, qMax: 10, weight: 2 },
  { name: 'Tish pastasi Colgate', cat: 'Gigiena', unit: Unit.DONA, cost: 13000, sale: 17500, qMin: 2, qMax: 12, weight: 2 },
];

const CATEGORIES = Array.from(new Set(CATALOG.map((p) => p.cat)));
const SUPPLIERS = [
  { name: 'Toshkent Don Savdo', phone: '+998711234567' },
  { name: "Farg'ona Yog' Zavodi", phone: '+998732345678' },
  { name: 'Buxoro Optom Baza', phone: '+998653456789' },
  { name: 'Andijon Distribyutor', phone: '+998742345671' },
];

const CUSTOMER_NAMES = [
  'Karim aka', 'Salim aka', 'Olim aka', 'Rustam aka', 'Jamshid aka', 'Bobur aka',
  'Sherzod aka', 'Akmal aka', 'Dilshod aka', 'Farrux aka', 'Ulug\'bek aka', 'Sardor aka',
  'Aziz aka', 'Nodir aka', 'Qodir aka', 'Shavkat aka', 'Bahrom aka', 'Tohir aka',
  'Eldor aka', 'Ravshan aka', 'Mahmud aka', 'Sanjar aka', 'Ikrom aka', 'Otabek aka',
  'Davron aka', 'Hasan aka', 'Husan aka', 'Komil aka', 'Murod aka', 'Zafar aka',
];

// ---------- xotiradagi tuzilmalar ----------
interface MemBatch {
  tempId: number;
  prodIdx: number;
  supplierIdx: number;
  dayOffset: number;
  receivedDate: Date;
  qtyReceived: number;
  remaining: number;
  cost: number;
  sale: number;
}

interface MemAlloc { batchTempId: number; quantity: number; costPrice: number }
interface MemItem { prodIdx: number; quantity: number; unitPrice: number; lineTotal: number; allocs: MemAlloc[] }
interface MemSale {
  dayOffset: number;
  date: Date;
  userIdx: number;
  customerIdx: number | null;
  paymentType: PaymentType;
  totalAmount: number;
  totalCost: number;
  items: MemItem[];
}

async function main(): Promise<void> {
  console.log('🌱 3 oylik test data generatsiyasi boshlandi...');

  // ===== 1) PARTIYA JADVALI (har mahsulotga 7-14 kunda) =====
  const batches: MemBatch[] = [];
  let batchTemp = 1;
  // har mahsulotning kutilgan 90-kunlik birlik iste'moli (taxminiy)
  const totalWeight = CATALOG.reduce((s, p) => s + p.weight, 0);
  const totalRevenue = DAILY_TARGET * DAYS;

  CATALOG.forEach((p, idx) => {
    const expRevenue = totalRevenue * (p.weight / totalWeight);
    const expUnits = expRevenue / p.sale;
    const perDay = expUnits / DAYS;

    let day = 0;
    let bi = 0;
    while (day < DAYS) {
      const interval = ri(7, 14);
      // inflyatsiya: har partiyada narx sekin oshadi
      const infl = 1 + 0.004 * bi + rf(-0.01, 0.01);
      const cost = round(p.cost * infl);
      const sale = round(p.sale * infl);
      // shu interval iste'moli + zaxira (birinchi partiya kattaroq)
      const buffer = bi === 0 ? 2.0 : 1.4;
      let qty = Math.ceil(perDay * interval * buffer);
      if (qty < 5) qty = ri(5, 12);
      const d = dateAt(day, ri(8, 11), ri(0, 59));
      batches.push({
        tempId: batchTemp++,
        prodIdx: idx,
        supplierIdx: ri(0, SUPPLIERS.length - 1),
        dayOffset: day,
        receivedDate: d,
        qtyReceived: qty,
        remaining: qty,
        cost,
        sale,
      });
      day += interval;
      bi++;
    }
  });

  // mahsulot bo'yicha partiyalar (FIFO uchun sana bo'yicha tartib)
  const batchesByProduct: MemBatch[][] = CATALOG.map((_, idx) =>
    batches.filter((b) => b.prodIdx === idx).sort((a, b) => a.dayOffset - b.dayOffset),
  );

  // ===== 2) KUNLIK SOTUVLAR SIMULYATSIYASI =====
  const sales: MemSale[] = [];
  const weights = CATALOG.map((p) => p.weight);

  // mahsulot uchun shu sanada mavjud (kelgan) partiyalar
  const availableBatches = (prodIdx: number, dayOffset: number) =>
    batchesByProduct[prodIdx].filter((b) => b.dayOffset <= dayOffset && b.remaining > 0.0001);

  for (let day = 0; day < DAYS; day++) {
    // hafta oxiri (shanba/yakshanba) bir oz gavjumroq
    const dow = dateAt(day).getDay();
    const weekendBoost = dow === 0 || dow === 6 ? rf(1.05, 1.2) : 1;
    // 0.75-1.0 oralig'i: while-loop oxirgi sotuvda nishondan oshishini hisobga olib
    // realustik o'rtacha ~5M/kun chiqishi uchun pasaytirilgan
    const target = DAILY_TARGET * rf(0.75, 1.0) * weekendBoost;

    let dayTotal = 0;
    let guard = 0;
    while (dayTotal < target && guard++ < 400) {
      const nLines = [1, 1, 2, 2, 2, 3, 3, 4][ri(0, 7)];
      const usedProd = new Set<number>();
      const items: MemItem[] = [];
      let saleAmount = 0;
      let saleCost = 0;

      for (let li = 0; li < nLines; li++) {
        // stokda bor mahsulotni tanlash (bir necha urinish)
        let prodIdx = -1;
        for (let attempt = 0; attempt < 8; attempt++) {
          const cand = weightedIndex(weights);
          if (usedProd.has(cand)) continue;
          if (availableBatches(cand, day).length > 0) { prodIdx = cand; break; }
        }
        if (prodIdx < 0) continue;
        usedProd.add(prodIdx);

        const p = CATALOG[prodIdx];
        let qty = ri(p.qMin, p.qMax);
        const avail = availableBatches(prodIdx, day);
        const totalAvail = avail.reduce((s, b) => s + b.remaining, 0);
        if (qty > totalAvail) qty = Math.floor(totalAvail);
        if (qty <= 0) continue;

        // FIFO taqsimot
        const allocs: MemAlloc[] = [];
        let need = qty;
        let lineCost = 0;
        for (const b of avail) {
          if (need <= 0) break;
          const take = Math.min(need, b.remaining);
          if (take <= 0) continue;
          b.remaining -= take;
          allocs.push({ batchTempId: b.tempId, quantity: take, costPrice: b.cost });
          lineCost += take * b.cost;
          need -= take;
        }
        // sotuv narxi — eng eski (birinchi) ayrilgan partiyaning sale narxi
        const firstBatch = avail[0];
        const unitPrice = firstBatch.sale;
        const lineTotal = qty * unitPrice;

        items.push({ prodIdx, quantity: qty, unitPrice, lineTotal, allocs });
        saleAmount += lineTotal;
        saleCost += lineCost;
      }

      if (items.length === 0) break; // butun stok tugagan bo'lsa
      const ptIdx = weightedIndex([55, 20, 25]); // NAQD / KARTA / NASIYA
      const paymentType = [PaymentType.NAQD, PaymentType.KARTA, PaymentType.NASIYA][ptIdx];
      const customerIdx = paymentType === PaymentType.NASIYA ? ri(0, CUSTOMER_NAMES.length - 1) : null;

      sales.push({
        dayOffset: day,
        date: dateAt(day, ri(8, 19), ri(0, 59)),
        userIdx: Math.random() < 0.5 ? 0 : 1,
        customerIdx,
        paymentType,
        totalAmount: saleAmount,
        totalCost: round(saleCost),
        items,
      });
      dayTotal += saleAmount;
    }
  }

  // ===== 3) NASIYA TO'LOVLARI (30 mijoz, doimiy qarz oldi-berdi) =====
  // har mijozning nasiya sotuvlari (sana, summa) + boshlang'ich qarz
  const openingDebt: number[] = CUSTOMER_NAMES.map((_, i) =>
    i % 4 === 0 ? ri(3, 18) * 100000 : 0, // ~1/4 mijozda eski qarz
  );

  interface Pay { customerIdx: number; amount: number; date: Date; notes: string | null }
  const payments: Pay[] = [];

  for (let ci = 0; ci < CUSTOMER_NAMES.length; ci++) {
    // shu mijozning kredit hodisalari: boshlang'ich qarz (kun 0) + nasiya sotuvlar
    const events: { day: number; amount: number }[] = [];
    if (openingDebt[ci] > 0) events.push({ day: 0, amount: openingDebt[ci] });
    sales
      .filter((s) => s.customerIdx === ci)
      .forEach((s) => events.push({ day: s.dayOffset, amount: s.totalAmount }));
    if (events.length === 0) continue;
    events.sort((a, b) => a.day - b.day);

    // vaqt bo'ylab yurib, har ~10-18 kunda qisman to'lov
    let owed = 0;
    let evPtr = 0;
    let nextPayDay = events[0].day + ri(8, 16);
    for (let day = events[0].day; day <= DAYS - 1; day++) {
      while (evPtr < events.length && events[evPtr].day === day) {
        owed += events[evPtr].amount;
        evPtr++;
      }
      if (day >= nextPayDay && owed > 0) {
        // joriy qarzning 40-90% ini to'laydi
        const frac = rf(0.4, 0.9);
        const amount = Math.min(owed, round((owed * frac) / 1000) * 1000);
        if (amount > 0) {
          payments.push({
            customerIdx: ci,
            amount,
            date: dateAt(day, ri(9, 18), ri(0, 59)),
            notes: pick(['Qisman to\'lov', null, 'Naqd to\'lov', null]),
          });
          owed -= amount;
        }
        nextPayDay = day + ri(10, 18);
      }
    }
  }

  // ===== 4) XARAJATLAR =====
  interface Exp { day: number; category: string; amount: number; notes?: string }
  const expenses: Exp[] = [];
  for (let m = 0; m < 3; m++) {
    const base = m * 30;
    expenses.push({ day: base + 1, category: 'Ijara', amount: 2_500_000 });
    expenses.push({ day: base + 2, category: 'Ishchi maoshi', amount: 4_000_000 });
    expenses.push({ day: base + 5, category: 'Elektr', amount: ri(300, 520) * 1000 });
    expenses.push({ day: base + 8, category: 'Suv', amount: ri(80, 140) * 1000 });
    expenses.push({ day: base + 12, category: 'Transport', amount: ri(150, 280) * 1000 });
    expenses.push({ day: base + 20, category: 'Transport', amount: ri(150, 280) * 1000 });
    expenses.push({ day: base + 25, category: 'Boshqa', amount: ri(60, 200) * 1000, notes: 'Qopcha, paket' });
  }

  // ================= DB YOZISH =================
  console.log('🧹 Eski ma\'lumotlar tozalanmoqda...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "SaleItemBatch","SaleItem","Sale","DebtPayment","Customer",
      "Batch","Product","Category","Supplier","Expense","User"
    RESTART IDENTITY CASCADE
  `);

  // users
  const adminHash = await bcrypt.hash('admin123', 10);
  const sotHash = await bcrypt.hash('sotuvchi123', 10);
  const admin = await prisma.user.create({ data: { name: 'Admin', phone: '+998901234567', passwordHash: adminHash, role: Role.ADMIN } });
  const sotuvchi = await prisma.user.create({ data: { name: 'Sotuvchi Aka', phone: '+998907654321', passwordHash: sotHash, role: Role.SOTUVCHI } });
  const userIds = [admin.id, sotuvchi.id];

  // categories
  const catMap = new Map<string, number>();
  for (const name of CATEGORIES) {
    const c = await prisma.category.create({ data: { name } });
    catMap.set(name, c.id);
  }

  // suppliers
  const supplierIds: number[] = [];
  for (const s of SUPPLIERS) {
    const sup = await prisma.supplier.create({ data: s });
    supplierIds.push(sup.id);
  }

  // products
  const productIds: number[] = [];
  for (const p of CATALOG) {
    const prod = await prisma.product.create({
      data: {
        name: p.name,
        categoryId: catMap.get(p.cat)!,
        baseUnit: p.unit,
        packSize: p.packSize ?? null,
        defaultSalePrice: p.sale,
      },
    });
    productIds.push(prod.id);
  }

  // customers
  const customerIds: number[] = [];
  for (let i = 0; i < CUSTOMER_NAMES.length; i++) {
    const c = await prisma.customer.create({
      data: {
        name: CUSTOMER_NAMES[i],
        phone: `+9989${ri(0, 9)}${String(ri(1000000, 9999999))}`,
        openingDebt: openingDebt[i],
        createdAt: startDate,
      },
    });
    customerIds.push(c.id);
  }

  // batches (yakuniy remaining bilan)
  const batchIdMap = new Map<number, number>();
  for (const b of batches) {
    const created = await prisma.batch.create({
      data: {
        productId: productIds[b.prodIdx],
        supplierId: supplierIds[b.supplierIdx],
        receivedDate: b.receivedDate,
        weekLabel: isoWeekLabel(b.receivedDate),
        quantityReceived: b.qtyReceived,
        quantityRemaining: round(b.remaining * 1000) / 1000,
        costPricePerUnit: b.cost,
        salePricePerUnit: b.sale,
      },
    });
    batchIdMap.set(b.tempId, created.id);
  }

  // sales (nested items + batch allocations) — bo'laklarga bo'lib
  let done = 0;
  for (const s of sales) {
    await prisma.sale.create({
      data: {
        saleDate: s.date,
        userId: userIds[s.userIdx],
        customerId: s.customerIdx !== null ? customerIds[s.customerIdx] : null,
        paymentType: s.paymentType,
        totalAmount: s.totalAmount,
        totalCost: s.totalCost,
        items: {
          create: s.items.map((it) => ({
            productId: productIds[it.prodIdx],
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            lineTotal: it.lineTotal,
            batches: {
              create: it.allocs.map((a) => ({
                batchId: batchIdMap.get(a.batchTempId)!,
                quantity: a.quantity,
                costPrice: a.costPrice,
              })),
            },
          })),
        },
      },
    });
    if (++done % 200 === 0) console.log(`  ...sotuvlar: ${done}/${sales.length}`);
  }

  // debt payments
  if (payments.length) {
    await prisma.debtPayment.createMany({
      data: payments.map((p) => ({
        customerId: customerIds[p.customerIdx],
        amount: p.amount,
        paymentDate: p.date,
        notes: p.notes,
      })),
    });
  }

  // expenses
  await prisma.expense.createMany({
    data: expenses.map((e) => ({
      expenseDate: dateAt(e.day, 12, 0),
      category: e.category,
      amount: e.amount,
      notes: e.notes ?? null,
    })),
  });

  // ===== xulosa =====
  const totalRev = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalCost = sales.reduce((s, x) => s + x.totalCost, 0);
  const nasiyaCount = sales.filter((s) => s.paymentType === PaymentType.NASIYA).length;
  console.log('\n✅ Tayyor!');
  console.log(`  Mahsulot: ${CATALOG.length} | Partiya: ${batches.length} | Mijoz: ${CUSTOMER_NAMES.length}`);
  console.log(`  Sotuvlar: ${sales.length} (nasiya: ${nasiyaCount})`);
  console.log(`  Nasiya to'lovlari: ${payments.length} | Xarajatlar: ${expenses.length}`);
  console.log(`  Jami savdo: ${totalRev.toLocaleString('ru-RU')} so'm (~${round(totalRev / DAYS).toLocaleString('ru-RU')}/kun)`);
  console.log(`  Jami foyda: ${(totalRev - totalCost).toLocaleString('ru-RU')} so'm`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
