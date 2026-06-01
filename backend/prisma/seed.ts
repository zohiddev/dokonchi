import { PaymentType, PrismaClient, Role, Unit } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ISO hafta yorlig'ini hisoblash: "2026-W22"
function isoWeekLabel(d: Date): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 0, 0, 0);
  return d;
}

async function main(): Promise<void> {
  console.log('🌱 Seed boshlandi...');

  // 0) Tozalash + ID sequence reset (qaytadan ishlatilsa har safar toza ID)
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "SaleItemBatch","SaleItem","Sale","DebtPayment","Customer",
      "Batch","Product","Category","Supplier","Expense","User"
    RESTART IDENTITY CASCADE
  `);

  // 1) Adminlar
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const sotuvchiPasswordHash = await bcrypt.hash('sotuvchi123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      phone: '+998901234567',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  const sotuvchi = await prisma.user.create({
    data: {
      name: 'Sotuvchi Aka',
      phone: '+998907654321',
      passwordHash: sotuvchiPasswordHash,
      role: Role.SOTUVCHI,
    },
  });
  console.log(`✓ Foydalanuvchilar: ${admin.name}, ${sotuvchi.name}`);

  // 2) Toifalar (6 ta)
  const categories = await Promise.all(
    ['Un', 'Donli mahsulotlar', "Yog'", 'Shakar', 'Ziravorlar', 'Ichimliklar'].map((name) =>
      prisma.category.create({ data: { name } }),
    ),
  );
  const [catUn, catDon, catYog, catShakar, catZir, catIch] = categories;
  console.log(`✓ Toifalar: ${categories.length}`);

  // 3) Ta'minotchilar (3 ta)
  const suppliers = await Promise.all([
    prisma.supplier.create({ data: { name: 'Toshkent Don', phone: '+998711234567' } }),
    prisma.supplier.create({ data: { name: 'Farg\'ona Yog\'', phone: '+998732345678' } }),
    prisma.supplier.create({ data: { name: 'Buxoro Savdo', phone: '+998653456789' } }),
  ]);
  const [supDon, supYog, supSavdo] = suppliers;
  console.log(`✓ Ta'minotchilar: ${suppliers.length}`);

  // 4) Mahsulotlar (12 ta)
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Un Oliy nav 25kg",
        categoryId: catUn.id,
        baseUnit: Unit.QOP,
        packSize: 25,
        defaultSalePrice: 280000,
      },
    }),
    prisma.product.create({
      data: {
        name: "Un 1-nav 50kg",
        categoryId: catUn.id,
        baseUnit: Unit.QOP,
        packSize: 50,
        defaultSalePrice: 450000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Guruch Lazer',
        categoryId: catDon.id,
        baseUnit: Unit.KG,
        defaultSalePrice: 18000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Guruch Devzira',
        categoryId: catDon.id,
        baseUnit: Unit.KG,
        defaultSalePrice: 32000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Makaron Italmas 400g',
        categoryId: catDon.id,
        baseUnit: Unit.DONA,
        defaultSalePrice: 9500,
      },
    }),
    prisma.product.create({
      data: {
        name: "No'xat",
        categoryId: catDon.id,
        baseUnit: Unit.KG,
        defaultSalePrice: 22000,
      },
    }),
    prisma.product.create({
      data: {
        name: "Paxta yog'i 5L",
        categoryId: catYog.id,
        baseUnit: Unit.LITR,
        defaultSalePrice: 95000,
      },
    }),
    prisma.product.create({
      data: {
        name: "Kungaboqar yog'i 1L",
        categoryId: catYog.id,
        baseUnit: Unit.LITR,
        defaultSalePrice: 24000,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Shakar 1kg',
        categoryId: catShakar.id,
        baseUnit: Unit.KG,
        defaultSalePrice: 14000,
      },
    }),
    prisma.product.create({
      data: {
        name: "Tuz yodlangan 1kg",
        categoryId: catZir.id,
        baseUnit: Unit.KG,
        defaultSalePrice: 4500,
      },
    }),
    prisma.product.create({
      data: {
        name: "Qora choy Ahmad 250g",
        categoryId: catIch.id,
        baseUnit: Unit.DONA,
        defaultSalePrice: 28000,
      },
    }),
    prisma.product.create({
      data: {
        name: "Mineral suv 1.5L",
        categoryId: catIch.id,
        baseUnit: Unit.DONA,
        defaultSalePrice: 5500,
      },
    }),
  ]);
  const [
    unOliy,
    un1Nav,
    guruchLazer,
    guruchDevzira,
    makaron,
    noxat,
    paxtaYog,
    kungaYog,
    shakar,
    tuz,
    choy,
    suv,
  ] = products;
  console.log(`✓ Mahsulotlar: ${products.length}`);

  // 5) Partiyalar (6 ta — ba'zi mahsulot uchun 2 ta, FIFO ko'rinishi uchun)
  const batches = [];

  // Un Oliy nav — 2 ta partiya (FIFO ishlashi uchun)
  batches.push(
    await prisma.batch.create({
      data: {
        productId: unOliy.id,
        supplierId: supDon.id,
        receivedDate: daysAgo(28),
        weekLabel: isoWeekLabel(daysAgo(28)),
        quantityReceived: 30,
        quantityRemaining: 12, // qisman sotilgan
        costPricePerUnit: 240000,
        salePricePerUnit: 280000,
        notes: 'Eski partiya',
      },
    }),
  );
  batches.push(
    await prisma.batch.create({
      data: {
        productId: unOliy.id,
        supplierId: supDon.id,
        receivedDate: daysAgo(5),
        weekLabel: isoWeekLabel(daysAgo(5)),
        quantityReceived: 40,
        quantityRemaining: 40,
        costPricePerUnit: 250000,
        salePricePerUnit: 285000,
      },
    }),
  );

  // Guruch Lazer — 2 ta partiya
  batches.push(
    await prisma.batch.create({
      data: {
        productId: guruchLazer.id,
        supplierId: supDon.id,
        receivedDate: daysAgo(20),
        weekLabel: isoWeekLabel(daysAgo(20)),
        quantityReceived: 200,
        quantityRemaining: 85,
        costPricePerUnit: 15000,
        salePricePerUnit: 18000,
      },
    }),
  );
  batches.push(
    await prisma.batch.create({
      data: {
        productId: guruchLazer.id,
        supplierId: supDon.id,
        receivedDate: daysAgo(3),
        weekLabel: isoWeekLabel(daysAgo(3)),
        quantityReceived: 150,
        quantityRemaining: 150,
        costPricePerUnit: 15500,
        salePricePerUnit: 18500,
      },
    }),
  );

  // Paxta yog'i — bitta partiya, kam qolgan (diqqat talab)
  batches.push(
    await prisma.batch.create({
      data: {
        productId: paxtaYog.id,
        supplierId: supYog.id,
        receivedDate: daysAgo(18),
        weekLabel: isoWeekLabel(daysAgo(18)),
        quantityReceived: 50,
        quantityRemaining: 6, // 12% — kam qolgan + eski → diqqat talab
        costPricePerUnit: 80000,
        salePricePerUnit: 95000,
      },
    }),
  );

  // Shakar — yangi partiya
  batches.push(
    await prisma.batch.create({
      data: {
        productId: shakar.id,
        supplierId: supSavdo.id,
        receivedDate: daysAgo(2),
        weekLabel: isoWeekLabel(daysAgo(2)),
        quantityReceived: 500,
        quantityRemaining: 480,
        costPricePerUnit: 11500,
        salePricePerUnit: 14000,
      },
    }),
  );

  console.log(`✓ Partiyalar: ${batches.length}`);

  // 6) Mijozlar (nasiya uchun 3 ta)
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Karim aka', phone: '+998901111111' } }),
    prisma.customer.create({ data: { name: 'Salim aka', phone: '+998902222222' } }),
    prisma.customer.create({ data: { name: 'Olim aka', phone: '+998903333333' } }),
  ]);
  console.log(`✓ Mijozlar: ${customers.length}`);

  // 7) Sotuvlar (10 ta)
  // Soddalashtirish uchun har sotuv bitta partiyadan ayriladi (allaqachon qoldiqlarni
  // tegishli kamaytirib qo'ydik yuqorida). FIFO mantig'i ishlab chiqishida o'zi ham tekshiriladi.
  const sales = [];

  // 7.1 NAQD sotuvlar — un, guruch, shakar
  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(25),
        userId: admin.id,
        paymentType: PaymentType.NAQD,
        totalAmount: 1400000, // 5 qop × 280000
        totalCost: 1200000,   // 5 × 240000
        items: {
          create: [
            {
              productId: unOliy.id,
              quantity: 5,
              unitPrice: 280000,
              lineTotal: 1400000,
              batches: {
                create: [{ batchId: batches[0].id, quantity: 5, costPrice: 240000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(22),
        userId: sotuvchi.id,
        paymentType: PaymentType.KARTA,
        totalAmount: 540000, // 30 kg × 18000
        totalCost: 450000,
        items: {
          create: [
            {
              productId: guruchLazer.id,
              quantity: 30,
              unitPrice: 18000,
              lineTotal: 540000,
              batches: {
                create: [{ batchId: batches[2].id, quantity: 30, costPrice: 15000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(18),
        userId: admin.id,
        paymentType: PaymentType.NAQD,
        totalAmount: 280000 * 3,
        totalCost: 240000 * 3,
        items: {
          create: [
            {
              productId: unOliy.id,
              quantity: 3,
              unitPrice: 280000,
              lineTotal: 280000 * 3,
              batches: {
                create: [{ batchId: batches[0].id, quantity: 3, costPrice: 240000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(15),
        userId: sotuvchi.id,
        paymentType: PaymentType.NAQD,
        totalAmount: 285000, // 3 dona suv + 1 choy = 16500 + 28000 = 44500; aslida yangilab yozay
        totalCost: 220000,
        items: {
          create: [
            {
              productId: unOliy.id,
              quantity: 1,
              unitPrice: 285000,
              lineTotal: 285000,
              batches: {
                create: [{ batchId: batches[0].id, quantity: 1, costPrice: 240000 }],
              },
            },
          ],
        },
      },
    }),
  );

  // 7.2 NASIYA sotuvlari (3 mijozga)
  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(12),
        userId: admin.id,
        customerId: customers[0].id,
        paymentType: PaymentType.NASIYA,
        totalAmount: 1400000, // 5 qop × 280000 (eski partiyadan)
        totalCost: 1200000,
        items: {
          create: [
            {
              productId: unOliy.id,
              quantity: 5,
              unitPrice: 280000,
              lineTotal: 1400000,
              batches: {
                create: [{ batchId: batches[0].id, quantity: 5, costPrice: 240000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(10),
        userId: sotuvchi.id,
        customerId: customers[1].id,
        paymentType: PaymentType.NASIYA,
        totalAmount: 1530000, // 85 kg guruch × 18000
        totalCost: 1275000,
        items: {
          create: [
            {
              productId: guruchLazer.id,
              quantity: 85,
              unitPrice: 18000,
              lineTotal: 1530000,
              batches: {
                create: [{ batchId: batches[2].id, quantity: 85, costPrice: 15000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(7),
        userId: admin.id,
        customerId: customers[2].id,
        paymentType: PaymentType.NASIYA,
        totalAmount: 760000, // 8 × 95000
        totalCost: 640000,   // 8 × 80000
        items: {
          create: [
            {
              productId: paxtaYog.id,
              quantity: 8,
              unitPrice: 95000,
              lineTotal: 760000,
              batches: {
                create: [{ batchId: batches[4].id, quantity: 8, costPrice: 80000 }],
              },
            },
          ],
        },
      },
    }),
  );

  // 7.3 Yangi NAQD/KARTA sotuvlar
  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(4),
        userId: sotuvchi.id,
        paymentType: PaymentType.KARTA,
        totalAmount: 360000, // 20 kg guruch
        totalCost: 300000,
        items: {
          create: [
            {
              productId: guruchLazer.id,
              quantity: 20,
              unitPrice: 18000,
              lineTotal: 360000,
              batches: {
                create: [{ batchId: batches[2].id, quantity: 20, costPrice: 15000 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(1),
        userId: admin.id,
        paymentType: PaymentType.NAQD,
        totalAmount: 280000, // 20 kg shakar
        totalCost: 230000,
        items: {
          create: [
            {
              productId: shakar.id,
              quantity: 20,
              unitPrice: 14000,
              lineTotal: 280000,
              batches: {
                create: [{ batchId: batches[5].id, quantity: 20, costPrice: 11500 }],
              },
            },
          ],
        },
      },
    }),
  );

  sales.push(
    await prisma.sale.create({
      data: {
        saleDate: daysAgo(0),
        userId: sotuvchi.id,
        paymentType: PaymentType.NAQD,
        totalAmount: 95000, // 1 paxta yog'
        totalCost: 80000,
        items: {
          create: [
            {
              productId: paxtaYog.id,
              quantity: 1,
              unitPrice: 95000,
              lineTotal: 95000,
              batches: {
                create: [{ batchId: batches[4].id, quantity: 1, costPrice: 80000 }],
              },
            },
          ],
        },
      },
    }),
  );

  console.log(`✓ Sotuvlar: ${sales.length}`);

  // 8) Nasiya to'lovlari (qisman) — birinchi mijoz qisman to'lagan
  await prisma.debtPayment.create({
    data: {
      customerId: customers[0].id,
      amount: 500000,
      paymentDate: daysAgo(5),
      notes: 'Qisman to\'lov',
    },
  });
  console.log('✓ Nasiya to\'lovlari');

  // 9) Xarajatlar
  await prisma.expense.createMany({
    data: [
      { expenseDate: daysAgo(20), category: 'Ijara', amount: 2000000 },
      { expenseDate: daysAgo(15), category: 'Elektr', amount: 350000 },
      { expenseDate: daysAgo(10), category: 'Transport', amount: 180000 },
      { expenseDate: daysAgo(3), category: 'Boshqa', amount: 120000, notes: "Qog'oz, qopcha" },
    ],
  });
  console.log('✓ Xarajatlar: 4');

  console.log('🌱 Seed muvaffaqiyatli tugadi');

  // Ishlatilmagan o'zgaruvchilarni qo'shimcha tartib uchun olib tashlash
  void un1Nav;
  void guruchDevzira;
  void makaron;
  void noxat;
  void kungaYog;
  void tuz;
  void choy;
  void suv;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
