// Minimal reset — 0 dan test qilish uchun.
// Hamma jadvalni tozalaydi, FAQAT bitta admin + 6 ta toifa qoldiradi.
// Mahsulot / partiya / sotuv / mijoz qo'shilmaydi (ularni UI'da o'zingiz qo'shasiz).
//
// Ishga tushirish:  npx ts-node --transpile-only prisma/reset.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🧹 Reset boshlandi...');

  // Hamma jadvalni tozalash + ID sequence'larni 1 ga qaytarish
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "SaleItemBatch","SaleItem","Sale","DebtPayment","Customer",
      "Batch","Product","Category","Supplier","Expense","User"
    RESTART IDENTITY CASCADE
  `);

  // Bitta admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin',
      phone: '+998901234567',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Admin: ${admin.phone} / admin123`);

  // 6 ta toifa (mahsulot qo'shish uchun kerak)
  const categoryNames = ['Un', 'Donli mahsulotlar', "Yog'", 'Shakar', 'Ziravorlar', 'Ichimliklar'];
  await prisma.category.createMany({ data: categoryNames.map((name) => ({ name })) });
  console.log(`✓ Toifalar: ${categoryNames.length}`);

  console.log('✅ Reset tugadi. DB bo\'m-bo\'sh, faqat admin + toifalar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
