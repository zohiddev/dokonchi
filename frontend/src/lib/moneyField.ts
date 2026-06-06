import type { ChangeEvent } from 'react';
import { formatThousands } from './format';

interface FieldLike {
  onChange: (e: ChangeEvent<HTMLInputElement>) => unknown;
}

/**
 * react-hook-form `register(...)` natijasini summa inputiga aylantiradi:
 * foydalanuvchi yozayotganda qiymatni "100 000" ko'rinishida formatlaydi.
 * Saqlashda `parseAmount(...)` bilan raqamga o'giriladi.
 *
 * Foydalanish: <input {...moneyField(register('amount', { required: '...' }))} />
 */
export function moneyField<T extends FieldLike>(field: T) {
  return {
    ...field,
    inputMode: 'numeric' as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = formatThousands(e.target.value);
      return field.onChange(e);
    },
  };
}
