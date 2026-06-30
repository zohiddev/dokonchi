import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export { DateRangeField } from './DateRangeField';

const SHARED_STYLE = `
  .flt-control {
    height: 38px;
    border: 1px solid var(--line-strong);
    border-radius: 9px;
    background: var(--card);
    color: var(--ink);
    font-family: inherit;
    font-size: 13px;
    outline: none;
  }
  .flt-control:focus { border-color: var(--accent); }
`;

/** Filtr paneli — chap tomonda nazoratlar, o'ng tomonda (ixt.) amal tugmasi */
export function FilterBar({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="filter-bar">
      <div className="fb-controls">{children}</div>
      {action && <div className="fb-action">{action}</div>}
      <style>{`
        .filter-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .fb-controls {
          display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
          flex: 1; min-width: 0;
        }
        .fb-action { flex-shrink: 0; }
        /* Mobile: filtrlar va amal tugmasi to'liq kenglikda ustma-ust */
        @media (max-width: 640px) {
          .filter-bar { flex-direction: column; align-items: stretch; gap: 10px; }
          .fb-controls { flex-direction: column; align-items: stretch; }
          .fb-controls > * { width: 100% !important; max-width: none !important; }
          .fb-action { order: -1; }
          .fb-action > * { width: 100%; }
          .fb-controls .ssel-trigger,
          .fb-controls .drp,
          .fb-controls .drp-trigger { width: 100%; max-width: none; }
        }
      `}</style>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Qidirish...',
  width = 240,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number;
}) {
  return (
    <div className="flt-search" style={{ width }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button type="button" className="flt-clear" onClick={() => onChange('')} title="Tozalash">
          ×
        </button>
      )}
      <style>{`
        .flt-search {
          display: flex; align-items: center; gap: 8px;
          height: 38px; padding: 0 12px;
          border: 1px solid var(--line-strong); border-radius: 9px;
          background: var(--card); max-width: 100%;
        }
        .flt-search:focus-within { border-color: var(--accent); }
        .flt-search svg { width: 16px; height: 16px; color: var(--ink-faint); flex-shrink: 0; }
        .flt-search input {
          border: none; background: none; outline: none;
          font-family: inherit; font-size: 13px; color: var(--ink); width: 100%;
        }
        .flt-clear {
          background: var(--line); border: none; color: var(--ink-soft);
          width: 18px; height: 18px; border-radius: 50%;
          cursor: pointer; font-size: 13px; line-height: 16px; flex-shrink: 0;
        }
        .flt-clear:hover { background: var(--brick-soft); color: var(--brick); }
      `}</style>
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
}) {
  return (
    <>
      <select
        className="flt-control flt-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <style>{`
        ${SHARED_STYLE}
        .flt-select { padding: 0 30px 0 12px; cursor: pointer; }
      `}</style>
    </>
  );
}

/** Qidiriladigan select — FilterSelect ko'rinishida, lekin ro'yxat ichidan yozib qidiriladi */
export function SearchableSelect({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder = 'Qidirish...',
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? options[0]?.label ?? '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openMenu = () => { setSearch(''); setOpen(true); };
  const pick = (v: string) => { onChange(v); setSearch(''); setOpen(false); };

  return (
    <div className={`ssel ${open ? 'open' : ''}`} ref={ref}>
      <button
        type="button"
        className="flt-control ssel-trigger"
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className={value ? '' : 'ssel-ph'}>{triggerLabel}</span>
        <svg className="ssel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="ssel-pop">
          <div className="ssel-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length) { e.preventDefault(); pick(filtered[0].value); }
              }}
              placeholder={placeholder}
            />
          </div>
          <div className="ssel-list">
            {filtered.length === 0 && <div className="ssel-empty">Topilmadi</div>}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`ssel-item ${o.value === value ? 'sel' : ''}`}
                onClick={() => pick(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        ${SHARED_STYLE}
        .ssel { position: relative; display: inline-block; }
        .ssel-trigger {
          display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
          min-width: 160px; max-width: 230px; padding: 0 8px 0 12px;
          cursor: pointer; text-align: left;
        }
        .ssel-trigger > span {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
        }
        .ssel-ph { color: var(--ink-soft); }
        .ssel-chev { width: 16px; height: 16px; color: var(--ink-faint); flex-shrink: 0; }
        .ssel.open .ssel-trigger { border-color: var(--accent); }
        .ssel.open .ssel-chev { transform: rotate(180deg); }

        .ssel-pop {
          position: absolute; z-index: 60; top: calc(100% + 6px); left: 0;
          width: max(100%, 240px); max-width: calc(100vw - 24px);
          display: flex; flex-direction: column;
          background: var(--card); border: 1px solid var(--line-strong);
          border-radius: 11px; box-shadow: var(--shadow); overflow: hidden;
        }
        .ssel-search {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; border-bottom: 1px solid var(--line);
        }
        .ssel-search svg { width: 15px; height: 15px; color: var(--ink-faint); flex-shrink: 0; }
        .ssel-search input {
          border: none; background: none; outline: none; width: 100%;
          font-family: inherit; font-size: 13px; color: var(--ink);
        }
        .ssel-list { max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; padding: 4px; }
        .ssel-empty { padding: 18px 12px; text-align: center; color: var(--ink-soft); font-size: 13px; flex-shrink: 0; }
        .ssel-item {
          flex-shrink: 0;
          text-align: left; padding: 9px 11px; border: none; background: none;
          color: var(--ink); font-size: 13px; line-height: 1.4; cursor: pointer; border-radius: 7px;
          font-family: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ssel-item:hover { background: var(--paper-2); }
        .ssel-item.sel { background: var(--accent-soft); color: var(--accent); font-weight: 600; }
      `}</style>
    </div>
  );
}

export function DateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <label className="flt-date">
      {label && <span>{label}</span>}
      <input
        className="flt-control"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <style>{`
        ${SHARED_STYLE}
        .flt-date { display: inline-flex; align-items: center; gap: 6px; }
        .flt-date > span {
          font-size: 11.5px; color: var(--ink-soft); font-weight: 600;
          text-transform: uppercase; letter-spacing: .3px;
        }
        .flt-date .flt-control { padding: 0 10px; }
      `}</style>
    </label>
  );
}
