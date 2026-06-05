// Chek shabloni sozlamalari — localStorage'da saqlanadi.
import type { ReceiptSettings } from './escpos';

const KEY = 'dokonchi:printer:settings';

export const DEFAULT_SETTINGS: ReceiptSettings = {
  shopName: 'DOKONCHI',
  line1: '',
  line2: '',
  footer: 'Xaridingiz uchun rahmat!',
  width: 48,
  copies: 1,
};

export function loadSettings(): ReceiptSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ReceiptSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: ReceiptSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
