// Production seed — FAQAT bitta admin foydalanuvchi yaratadi.
// Demo ma'lumot YO'Q, TRUNCATE YO'Q (mavjud ma'lumotlarga tegmaydi).
// Ishga tushirish:
//   docker compose -f docker-compose.prod.yml exec backend \
//     npx ts-node --transpile-only prisma/seed-prod.ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const name = process.env.ADMIN_NAME ?? 'Admin';
  const phone = process.env.ADMIN_PHONE ?? '+998901234567';
  const password = process.env.ADMIN_PASSWORD ?? 'admin123';

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log(`ℹ Admin allaqachon mavjud: ${existing.name} (${existing.phone}). O'zgartirilmadi.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { name, phone, passwordHash, role: Role.ADMIN },
  });
  console.log(`✓ Admin yaratildi: ${admin.name} (${admin.phone})`);
}

main()
  .catch((e) => {
    console.error('Seed-prod xato:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
