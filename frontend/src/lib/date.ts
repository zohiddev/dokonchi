// "YYYY-MM-DD" formatdagi sanani hozirgi vaqt bilan birlashtiradi.
// Backend new Date("2026-06-02") ni UTC yarim tuni deb tushunadi →
// Toshkent vaqtida 05:00 chiqadi. Buning o'rniga tanlangan sana + hozirgi
// HH:MM:SS qo'shib jo'natamiz, shunda kassa tranzaksiyalari to'g'ri vaqtda ko'rinadi.
export function dateOnlyToIso(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const stamp = new Date(
    y,
    m - 1,
    d,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds(),
  );
  return stamp.toISOString();
}
