// PWA ikonalari yaratish: SVG bazasidan 192px, 512px (any), 512px (maskable) PNG'lar
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public');
mkdirSync(outDir, { recursive: true });

// Asosiy logo SVG — yashil radial + "D" (Fraunces-like serif)
function makeSvg({ size = 512, padding = 0, bg = '#3a5a40' }) {
  const r = size * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f7a52"/>
      <stop offset="100%" stop-color="#3a5a40"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="${bg}" rx="${padding > 0 ? 0 : r}" ry="${padding > 0 ? 0 : r}"/>
  <g transform="translate(${padding}, ${padding})">
    <rect width="${size - 2 * padding}" height="${size - 2 * padding}" fill="url(#g)" rx="${(size - 2 * padding) * 0.18}" ry="${(size - 2 * padding) * 0.18}"/>
    <text x="${size / 2}" y="${size / 2}"
          font-family="Georgia, 'Times New Roman', serif"
          font-weight="700"
          font-size="${size * 0.62}"
          fill="#fbf8f1"
          text-anchor="middle"
          dominant-baseline="central">D</text>
  </g>
</svg>`;
}

// favicon.svg — toza, padding'siz
writeFileSync(
  path.join(outDir, 'favicon.svg'),
  makeSvg({ size: 64, padding: 0, bg: '#3a5a40' }),
);

// 192x192 (any)
await sharp(Buffer.from(makeSvg({ size: 192, padding: 0 })))
  .png()
  .toFile(path.join(outDir, 'icon-192.png'));
console.log('icon-192.png yaratildi');

// 512x512 (any)
await sharp(Buffer.from(makeSvg({ size: 512, padding: 0 })))
  .png()
  .toFile(path.join(outDir, 'icon-512.png'));
console.log('icon-512.png yaratildi');

// 512x512 (maskable) — safe zone uchun ko'p padding (10%)
await sharp(Buffer.from(makeSvg({ size: 512, padding: 51, bg: '#3a5a40' })))
  .png()
  .toFile(path.join(outDir, 'icon-512-maskable.png'));
console.log('icon-512-maskable.png yaratildi');

// Apple touch icon — 180x180 (PWA "Bosh ekranga qo'shish" iOS uchun)
await sharp(Buffer.from(makeSvg({ size: 180, padding: 0 })))
  .png()
  .toFile(path.join(outDir, 'apple-touch-icon.png'));
console.log('apple-touch-icon.png yaratildi');

console.log('Tayyor!');
