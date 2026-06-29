// ESC/POS termal printerlar uchun bayt-builder va chek shabloni.
// 58mm = 32 belgi, 80mm = 48 belgi (Font A).
import { money } from './format';
import type { Sale } from '../types/api';

const ESC = 0x1b;
const GS = 0x1d;

// GS ! n — belgi o'lchami baytlari
const SIZE_NORMAL = 0x00;
const SIZE_DOUBLE_HEIGHT = 0x01;
const SIZE_DOUBLE_BOTH = 0x11;

export interface ReceiptSettings {
  shopName: string;
  line1: string; // manzil
  line2: string; // telefon
  footer: string;
  width: 32 | 48; // belgilar soni (58 / 80 mm)
  copies: number; // nusxalar soni
}

// Uzbek lotin matnini termal printer kod-sahifasiga mos ASCIIga keltirish.
// oʻ / gʻ kabi maxsus apostroflar oddiy ' ga, diakritiklar olib tashlanadi.
function toAscii(s: string): string {
  return s
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '');
}

function encode(s: string): number[] {
  const out: number[] = [];
  for (const ch of toAscii(s)) {
    const code = ch.charCodeAt(0);
    out.push(code < 128 ? code : 0x3f); // qolgan hammasi '?'
  }
  return out;
}

// Ikki ustunli qator: chap matn | o'ng matn, kenglikka moslab oraliq bilan.
function twoCol(left: string, right: string, width: number): string {
  const l = toAscii(left);
  const r = toAscii(right);
  const gap = width - l.length - r.length;
  if (gap >= 1) return l + ' '.repeat(gap) + r;
  // chap juda uzun — kesib, kamida 1 oraliq qoldiramiz
  const maxLeft = Math.max(0, width - r.length - 1);
  return l.slice(0, maxLeft) + ' ' + r;
}

function trimNum(v: string | number): string {
  const n = typeof v === 'string' ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/\.?0+$/, '');
}

function payLabel(t: Sale['paymentType']): string {
  return t === 'NAQD' ? 'Naqd' : t === 'KARTA' ? 'Karta' : 'Nasiya';
}

function dateTimeStr(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

class EscPos {
  private parts: number[] = [];

  raw(...bytes: number[]): this {
    for (const b of bytes) this.parts.push(b);
    return this;
  }

  init(): this {
    // ESC @ (reset) + ESC t 0 (CP437 kod sahifasi)
    return this.raw(ESC, 0x40).raw(ESC, 0x74, 0x00);
  }

  align(a: 'left' | 'center' | 'right'): this {
    return this.raw(ESC, 0x61, a === 'center' ? 1 : a === 'right' ? 2 : 0);
  }

  bold(on: boolean): this {
    return this.raw(ESC, 0x45, on ? 1 : 0);
  }

  size(n: number): this {
    return this.raw(GS, 0x21, n);
  }

  text(s: string): this {
    return this.raw(...encode(s));
  }

  line(s = ''): this {
    return this.text(s).raw(0x0a);
  }

  feed(n = 1): this {
    return this.raw(ESC, 0x64, n);
  }

  cut(): this {
    // GS V 66 0 — qog'ozni surib qisman kesish
    return this.raw(GS, 0x56, 0x42, 0x00);
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.parts);
  }
}

// Sotuvdan bitta chek baytlari.
export function buildReceipt(sale: Sale, s: ReceiptSettings): Uint8Array {
  const W = s.width;
  const p = new EscPos().init();

  // Sarlavha
  p.align('center').bold(true).size(SIZE_DOUBLE_BOTH).line(s.shopName);
  p.size(SIZE_NORMAL).bold(false);
  if (s.line1.trim()) p.line(s.line1);
  if (s.line2.trim()) p.line(s.line2);

  p.align('left').line('-'.repeat(W));

  // Meta
  p.line(twoCol(`Chek #${sale.id}`, dateTimeStr(sale.saleDate), W));
  if (sale.user?.name) p.line(`Sotuvchi: ${sale.user.name}`);
  if (sale.customer?.name) p.line(`Mijoz: ${sale.customer.name}`);

  p.line('-'.repeat(W));

  // Mahsulotlar
  for (const it of sale.items ?? []) {
    const name = it.product?.name ?? `Mahsulot #${it.productId}`;
    p.line(name);
    let left: string;
    if (it.saleMode === 'PACK' && it.packCount && Number(it.packCount) > 0) {
      // Butun pachka sotuvi: "1 karobka x 280 000" (aniq yumaloq narx)
      const packUnit = it.product?.packUnit || 'pachka';
      const packPrice = Number(it.lineTotal) / Number(it.packCount);
      left = `  ${trimNum(it.packCount)} ${packUnit} x ${money(packPrice, false)}`;
    } else {
      left = `  ${trimNum(it.quantity)} x ${money(it.unitPrice, false)}`;
    }
    p.line(twoCol(left, money(it.lineTotal, false), W));
  }

  p.line('-'.repeat(W));

  // Jami
  p.bold(true).size(SIZE_DOUBLE_HEIGHT);
  p.line(twoCol('JAMI', `${money(sale.totalAmount, false)} so'm`, W));
  p.size(SIZE_NORMAL).bold(false);
  p.line(`To'lov: ${payLabel(sale.paymentType)}`);
  if (sale.notes?.trim()) p.line(`Izoh: ${sale.notes}`);

  p.line('='.repeat(W));

  // Footer
  p.align('center');
  if (s.footer.trim()) p.line(s.footer);
  p.feed(4).cut();

  return p.bytes();
}

// Printer sozlanganini tekshirish uchun namuna chek.
export function buildTestReceipt(s: ReceiptSettings): Uint8Array {
  const W = s.width;
  const p = new EscPos().init();
  p.align('center').bold(true).size(SIZE_DOUBLE_BOTH).line(s.shopName);
  p.size(SIZE_NORMAL).bold(false);
  if (s.line1.trim()) p.line(s.line1);
  if (s.line2.trim()) p.line(s.line2);
  p.align('left').line('-'.repeat(W));
  p.line('SINOV CHEKI');
  p.line(twoCol('Holat', 'OK', W));
  p.line(twoCol('Kenglik', `${W} belgi`, W));
  p.line('='.repeat(W));
  p.align('center').line('Printer tayyor ✓'.replace('✓', '+'));
  p.feed(4).cut();
  return p.bytes();
}
