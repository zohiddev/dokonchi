// PWA ikonalari + logo-mark — haqiqiy logodan (scripts/logo-source.jpg) generatsiya.
// Do'kon belgisini ajratib (yozuvsiz), oq kvadrat plitkaga markazlab joylaymiz.
// Ishga tushirish:  node scripts/gen-icons.mjs   (frontend/ ichida)
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

const SRC = path.join(__dirname, 'logo-source.jpg');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// 1) Faqat do'kon belgisini ajratamiz: yuqori qism (yozuvsiz), atrofdagi oq fonni trim
const CROP_H = 705; // "dokonchi" yozuvidan yuqorisi
// avval kesamiz (yozuvni olib tashlaymiz), keyin alohida bosqichda trim
const cropped = await sharp(SRC)
  .extract({ left: 0, top: 0, width: 1024, height: CROP_H })
  .png()
  .toBuffer();
const symbol = await sharp(cropped)
  .trim() // bir xil (oq) fonni kesib, belgini qisib oladi
  .png()
  .toBuffer();

// Belgini kvadrat oq plitkaga markazlab joylash
async function tile(size, padRatio) {
  const inner = Math.round(size * (1 - 2 * padRatio));
  const fitted = await sharp(symbol)
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: fitted, gravity: 'center' }])
    .png()
    .toBuffer();
}

writeFileSync(path.join(outDir, 'icon-192.png'), await tile(192, 0.08));
writeFileSync(path.join(outDir, 'icon-512.png'), await tile(512, 0.08));
// maskable — Android "safe zone" uchun ko'proq padding
writeFileSync(path.join(outDir, 'icon-512-maskable.png'), await tile(512, 0.16));
// iOS "Bosh ekranga qo'shish"
writeFileSync(path.join(outDir, 'apple-touch-icon.png'), await tile(180, 0.1));
// brauzer tab
writeFileSync(path.join(outDir, 'favicon.png'), await tile(64, 0.06));
// ilova ichida (login, sidebar) ishlatish uchun
writeFileSync(path.join(outDir, 'logo-mark.png'), await tile(256, 0.08));

console.log('✓ Ikonkalar va logo-mark tayyor:', outDir);
