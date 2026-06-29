// Mahsulot toifalarini seed qiladi — idempotent (mavjudini buzmaydi, faqat qo'shadi).
// TRUNCATE/DELETE YO'Q. Name unique bo'lgani uchun qayta ishga tushirsa ham xavfsiz.
// Ishga tushirish (prod, dokonchi-api konteyneri ichida):
//   docker exec -i <dokonchi-api-cid> npx ts-node --transpile-only prisma/seed-categories.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Un',
  'Donli mahsulotlar',
  "Yog'",
  'Shakar',
  'Ziravorlar',
  'Konserva',
  'Ichimliklar',
  'Sut mahsulotlari',
  'Gigiena',
];

async function main(): Promise<void> {
  let added = 0;
  for (const name of CATEGORIES) {
    const res = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    if (res) added++;
  }
  const total = await prisma.category.count();
  console.log(`✓ Toifalar tekshirildi (${CATEGORIES.length} ta). DB'da jami: ${total} ta.`);
}

main()
  .catch((e) => {
    console.error('Seed-categories xato:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
