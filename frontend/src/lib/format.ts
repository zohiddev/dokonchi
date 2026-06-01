// Pul: "1 250 000 so'm" (bo'sh joy ajratuvchi)
export function money(value: number | string | null | undefined, withCurrency = true): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  const formatted = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return withCurrency ? `${formatted} so'm` : formatted;
}

// Miqdor: "12.5 kg" yoki "5 dona"
export function qty(value: number | string | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  // Butun bo'lsa kasr ko'rsatmaymiz
  const num = Number.isInteger(n) ? n.toString() : n.toFixed(3).replace(/\.?0+$/, '');
  const unitLabel = unit ? ` ${unitLabelFor(unit)}` : '';
  return `${num}${unitLabel}`;
}

function unitLabelFor(unit: string): string {
  switch (unit) {
    case 'KG':
      return 'kg';
    case 'DONA':
      return 'dona';
    case 'LITR':
      return 'L';
    case 'QOP':
      return 'qop';
    case 'QUTI':
      return 'quti';
    default:
      return unit.toLowerCase();
  }
}

// Sana: "29.05" yoki "29.05.2026"
export function date(value: string | Date | null | undefined, withYear = false): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  if (!withYear) return `${dd}.${mm}`;
  return `${dd}.${mm}.${d.getFullYear()}`;
}

// Vaqt: "14:32"
export function time(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return `${date(value, true)} ${time(value)}`;
}

// Foiz: 0.12 → "12%"
export function percent(value: number | string | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(fractionDigits)}%`;
}
