import { useEffect, useRef, useState } from 'react';

/* ── sana yordamchilari (lokal vaqt, UTC siljishlarisiz) ─────────────── */
const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function fromIso(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** 6 hafta = 42 katak, dushanbadan boshlab */
function monthGrid(base: Date): Date[] {
  const y = base.getFullYear();
  const mo = base.getMonth();
  const offset = (new Date(y, mo, 1).getDay() + 6) % 7; // Mon=0
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(y, mo, 1 - offset + i));
  return cells;
}

interface Preset {
  key: string;
  label: string;
  range: [Date, Date];
}

function buildPresets(): Preset[] {
  const today = startOfDay(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();

  const dow = (today.getDay() + 6) % 7;
  const lastMon = new Date(y, m, today.getDate() - dow - 7);
  const lastSun = new Date(lastMon.getFullYear(), lastMon.getMonth(), lastMon.getDate() + 6);

  const q = Math.floor(m / 3);
  let pq = q - 1;
  let py = y;
  if (pq < 0) { pq = 3; py -= 1; }

  return [
    { key: 'today', label: 'Bugun', range: [today, today] },
    { key: 'week', label: "O'tgan hafta", range: [lastMon, lastSun] },
    { key: 'month', label: "O'tgan oy", range: [new Date(y, m - 1, 1), new Date(y, m, 0)] },
    { key: 'quarter', label: "O'tgan chorak", range: [new Date(py, pq * 3, 1), new Date(py, pq * 3 + 3, 0)] },
    { key: 'year', label: "O'tgan yil", range: [new Date(y - 1, 0, 1), new Date(y - 1, 11, 31)] },
  ];
}

/* ── komponent ───────────────────────────────────────────────────────── */
export function DateRangeField({
  from,
  to,
  onChange,
  startLabel = 'Boshlanish sana',
  endLabel = 'Tugash sana',
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  startLabel?: string;
  endLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | null>(fromIso(from));
  const [end, setEnd] = useState<Date | null>(fromIso(to));
  const [hover, setHover] = useState<Date | null>(null);
  const [view, setView] = useState<Date>(() => firstOfMonth(fromIso(from) ?? new Date()));
  const wrapRef = useRef<HTMLDivElement>(null);

  // ochishda joriy filtrdan qoralamani tiklaymiz
  const openPicker = () => {
    const s = fromIso(from);
    const e = fromIso(to);
    setStart(s);
    setEnd(e);
    setHover(null);
    setView(firstOfMonth(s ?? new Date()));
    setOpen(true);
  };

  // tashqariga bosish / Escape => yopish
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const commit = (s: Date, e: Date) => {
    onChange(toIso(s), toIso(e));
    setOpen(false);
  };

  const clickDay = (d: Date) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
      setHover(null);
    } else {
      let s = start;
      let e = d;
      if (e.getTime() < s.getTime()) [s, e] = [e, s];
      setStart(s);
      setEnd(e);
      commit(s, e);
    }
  };

  const applyPreset = (p: Preset) => {
    setStart(p.range[0]);
    setEnd(p.range[1]);
    setView(firstOfMonth(p.range[0]));
    commit(p.range[0], p.range[1]);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStart(null);
    setEnd(null);
    setHover(null);
    onChange('', '');
  };

  // trigger uchun ko'rinadigan qiymat: ochiq bo'lsa qoralama, aks holda filtr
  const dispStart = open ? start : fromIso(from);
  const dispEnd = open ? end : fromIso(to);
  const hasValue = !!(dispStart || dispEnd);

  // tanlash jarayonida hover bilan oraliqni oldindan ko'rsatamiz
  let lo = start;
  let hi = end ?? (start && hover ? hover : null);
  if (lo && hi && hi.getTime() < lo.getTime()) [lo, hi] = [hi, lo];

  const today = startOfDay(new Date());
  const presets = buildPresets();
  const activePreset = presets.find(
    (p) => start && end && sameDay(p.range[0], start) && sameDay(p.range[1], end),
  )?.key;

  const renderMonth = (base: Date) => {
    const mo = base.getMonth();
    return (
      <div className="drp-grid" key={`${base.getFullYear()}-${mo}`}>
        {WEEKDAYS.map((w) => <div key={w} className="drp-dow">{w}</div>)}
        {monthGrid(base).map((cell) => {
          const inMonth = cell.getMonth() === mo;
          const isLo = lo && sameDay(cell, lo);
          const isHi = hi && sameDay(cell, hi);
          const t = cell.getTime();
          const inRange = lo && hi && t >= lo.getTime() && t <= hi.getTime();
          const cls = [
            'drp-day',
            inMonth ? '' : 'muted',
            inRange ? 'inrange' : '',
            isLo ? 'lo' : '',
            isHi ? 'hi' : '',
            sameDay(cell, today) ? 'today' : '',
          ].filter(Boolean).join(' ');
          return (
            <button
              type="button"
              key={t}
              className={cls}
              onClick={() => clickDay(cell)}
              onMouseEnter={() => start && !end && setHover(cell)}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    );
  };

  const right = addMonths(view, 1);

  return (
    <div className={`drp ${open ? 'open' : ''}`} ref={wrapRef}>
      <button type="button" className="drp-trigger" onClick={() => (open ? setOpen(false) : openPicker())}>
        <span className={dispStart ? 'drp-val' : 'drp-ph'}>{dispStart ? fmt(dispStart) : startLabel}</span>
        <span className="drp-arrow">→</span>
        <span className={dispEnd ? 'drp-val' : 'drp-ph'}>{dispEnd ? fmt(dispEnd) : endLabel}</span>
        {hasValue ? (
          <span className="drp-x" role="button" title="Tozalash" onClick={clear}>×</span>
        ) : (
          <svg className="drp-cal-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="drp-pop">
          <div className="drp-presets">
            {presets.map((p) => (
              <button
                type="button"
                key={p.key}
                className={`drp-preset ${activePreset === p.key ? 'active' : ''}`}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="drp-cal">
            <div className="drp-cal-head">
              <div className="drp-nav-group">
                <button type="button" className="drp-nav" title="Oldingi yil" onClick={() => setView(addMonths(view, -12))}>«</button>
                <button type="button" className="drp-nav" title="Oldingi oy" onClick={() => setView(addMonths(view, -1))}>‹</button>
              </div>
              <div className="drp-mtitle">{MONTHS[view.getMonth()]} {view.getFullYear()}</div>
              <div className="drp-mtitle">{MONTHS[right.getMonth()]} {right.getFullYear()}</div>
              <div className="drp-nav-group">
                <button type="button" className="drp-nav" title="Keyingi oy" onClick={() => setView(addMonths(view, 1))}>›</button>
                <button type="button" className="drp-nav" title="Keyingi yil" onClick={() => setView(addMonths(view, 12))}>»</button>
              </div>
            </div>
            <div className="drp-months">
              {renderMonth(view)}
              {renderMonth(right)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .drp { position: relative; display: inline-block; }
        .drp-trigger {
          display: inline-flex; align-items: center; gap: 8px;
          height: 38px; padding: 0 12px;
          border: 1px solid var(--line-strong); border-radius: 9px;
          background: var(--card); color: var(--ink); font-size: 13px; cursor: pointer;
        }
        .drp-trigger:hover { border-color: var(--ink-faint); }
        .drp.open .drp-trigger { border-color: var(--accent); }
        .drp-ph { color: var(--ink-faint); }
        .drp-val { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
        .drp-arrow { color: var(--ink-faint); }
        .drp-cal-ic { width: 15px; height: 15px; color: var(--ink-faint); flex-shrink: 0; }
        .drp-x {
          margin-left: 1px; width: 18px; height: 18px; border-radius: 50%;
          background: var(--line); color: var(--ink-soft);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 14px; line-height: 1; flex-shrink: 0;
        }
        .drp-x:hover { background: var(--brick-soft); color: var(--brick); }

        .drp-pop {
          position: absolute; z-index: 60; top: calc(100% + 6px); left: 0;
          display: flex; background: var(--card);
          border: 1px solid var(--line-strong); border-radius: 12px;
          box-shadow: var(--shadow); overflow: hidden;
          max-width: calc(100vw - 24px);
        }
        .drp-presets {
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px; border-right: 1px solid var(--line); min-width: 132px;
        }
        .drp-preset {
          text-align: left; padding: 9px 12px; border-radius: 8px;
          background: none; border: none; color: var(--ink);
          font-size: 13px; cursor: pointer; white-space: nowrap;
        }
        .drp-preset:hover { background: var(--paper-2); }
        .drp-preset.active { background: var(--accent-soft); color: var(--accent); font-weight: 600; }

        .drp-cal { padding: 12px 14px; }
        .drp-cal-head { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
        .drp-nav-group { display: flex; gap: 2px; }
        .drp-nav {
          width: 26px; height: 26px; border: none; border-radius: 6px;
          background: none; color: var(--ink-soft); cursor: pointer; font-size: 14px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .drp-nav:hover { background: var(--paper-2); color: var(--ink); }
        .drp-mtitle { flex: 1; text-align: center; font-weight: 600; font-size: 13.5px; }
        .drp-months { display: flex; gap: 22px; flex-wrap: wrap; }
        .drp-grid { display: grid; grid-template-columns: repeat(7, 34px); }
        .drp-dow {
          text-align: center; font-size: 11px; color: var(--ink-faint);
          font-weight: 600; height: 28px; line-height: 28px;
        }
        .drp-day {
          height: 32px; width: 34px; border: none; background: none; cursor: pointer;
          font-size: 12.5px; color: var(--ink); font-variant-numeric: tabular-nums;
        }
        .drp-day:hover { background: var(--paper-2); border-radius: 7px; }
        .drp-day.muted { color: var(--ink-faint); opacity: .5; }
        .drp-day.inrange { background: var(--accent-soft); border-radius: 0; }
        .drp-day.lo { border-top-left-radius: 7px; border-bottom-left-radius: 7px; }
        .drp-day.hi { border-top-right-radius: 7px; border-bottom-right-radius: 7px; }
        .drp-day.lo, .drp-day.hi {
          background: var(--accent); color: #fff; font-weight: 600;
        }
        .drp-day.today { box-shadow: inset 0 0 0 1.5px var(--accent); border-radius: 7px; }
        .drp-day.lo.today, .drp-day.hi.today { box-shadow: none; }
      `}</style>
    </div>
  );
}
