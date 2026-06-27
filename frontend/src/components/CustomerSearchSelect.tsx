import { useMemo, useState, type ReactNode } from 'react';

export interface PickableCustomer {
  id: number;
  name: string;
  phone?: string | null;
  /** Ro'yxatda o'ng tomonda ko'rsatiladigan qo'shimcha belgi (masalan qarz summasi) */
  meta?: ReactNode;
}

interface Props {
  items: PickableCustomer[];
  selected: PickableCustomer | null;
  onSelect: (c: PickableCustomer | null) => void;
  isLoading?: boolean;
  placeholder?: string;
  emptyText?: string;
  autoFocus?: boolean;
}

/**
 * Mijozni ism (yoki telefon) bo'yicha qidirib tanlash uchun qayta ishlatiladigan
 * komponent. Tanlangach tanlovni ko'rsatadi va "O'zgartirish" tugmasi beradi.
 */
export function CustomerSearchSelect({
  items,
  selected,
  onSelect,
  isLoading,
  placeholder = 'Mijoz ismini yozing...',
  emptyText = 'Mijoz topilmadi',
  autoFocus,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  if (selected) {
    return (
      <div className="csel-selected">
        <div className="csel-selected-main">
          <strong>{selected.name}</strong>
          {selected.phone && <small className="num">{selected.phone}</small>}
        </div>
        <button
          type="button"
          className="csel-change"
          onClick={() => {
            onSelect(null);
            setSearch('');
          }}
        >
          O'zgartirish
        </button>
        <style>{`
          .csel-selected {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 14px;
            background: var(--accent-soft, var(--paper-2));
            border: 1px solid var(--accent);
            border-radius: 11px;
          }
          .csel-selected-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
          .csel-selected-main strong { font-size: 14px; color: var(--ink); font-weight: 600; }
          .csel-selected-main small { font-size: 12px; color: var(--ink-soft); }
          .csel-change {
            background: var(--card); border: 1px solid var(--line-strong);
            color: var(--ink-soft); font-family: inherit;
            font-size: 12px; font-weight: 600;
            padding: 6px 11px; border-radius: 8px; cursor: pointer;
            white-space: nowrap;
          }
          .csel-change:hover { color: var(--accent); border-color: var(--accent); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="csel">
      <div className="csel-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      </div>

      <div className="csel-list">
        {isLoading && <div className="csel-state">Yuklanmoqda...</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="csel-state">{emptyText}</div>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            className="csel-item"
            onClick={() => onSelect(c)}
          >
            <span className="csel-item-main">
              <span className="csel-item-name">{c.name}</span>
              {c.phone && <span className="csel-item-phone num">{c.phone}</span>}
            </span>
            {c.meta && <span className="csel-item-meta">{c.meta}</span>}
          </button>
        ))}
      </div>

      <style>{`
        .csel { display: flex; flex-direction: column; gap: 8px; }
        .csel-search {
          display: flex; align-items: center; gap: 9px;
          background: var(--paper-2);
          border: 1px solid var(--line-strong);
          border-radius: 11px;
          padding: 10px 14px;
        }
        .csel-search svg { width: 17px; height: 17px; color: var(--ink-faint); flex-shrink: 0; }
        .csel-search input {
          border: none; background: none; outline: none;
          font-family: inherit; font-size: 14px;
          width: 100%; color: var(--ink);
        }
        .csel-list {
          display: flex; flex-direction: column;
          max-height: 260px; overflow-y: auto;
          border: 1px solid var(--line);
          border-radius: 11px;
          background: var(--card);
        }
        .csel-state {
          padding: 22px 14px; text-align: center;
          color: var(--ink-soft); font-size: 13px;
        }
        .csel-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px;
          background: none; border: none;
          border-bottom: 1px solid var(--line);
          cursor: pointer; font-family: inherit;
          text-align: left; width: 100%;
        }
        .csel-item:last-child { border-bottom: none; }
        .csel-item:hover { background: var(--paper-2); }
        .csel-item-main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .csel-item-name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
        .csel-item-phone { font-size: 11.5px; color: var(--ink-soft); }
        .csel-item-meta { flex-shrink: 0; }
      `}</style>
    </div>
  );
}
