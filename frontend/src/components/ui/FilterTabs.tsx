interface Option<T extends string | number> {
  value: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (next: T) => void;
}

export function FilterTabs<T extends string | number>({ value, options, onChange }: FilterTabsProps<T>) {
  return (
    <div className="filter-tabs">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          className={`tab ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          <span>{opt.label}</span>
          {opt.count !== undefined && <span className="tab-count">{opt.count}</span>}
        </button>
      ))}
      <style>{`
        .filter-tabs {
          display: inline-flex;
          gap: 2px;
          background: var(--paper);
          padding: 4px;
          border-radius: 11px;
          border: 1px solid var(--line);
        }
        .tab {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent;
          border: none;
          color: var(--ink-soft);
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background .15s, color .15s;
          font-family: inherit;
        }
        .tab:hover { color: var(--ink); }
        .tab.active {
          background: var(--card);
          color: var(--ink);
          box-shadow: 0 1px 2px rgba(43, 38, 32, .06);
        }
        .tab-count {
          font-size: 10.5px;
          background: var(--paper);
          padding: 1px 7px;
          border-radius: 99px;
          color: var(--ink-soft);
        }
        .tab.active .tab-count {
          background: var(--green-soft);
          color: var(--green);
        }
      `}</style>
    </div>
  );
}
