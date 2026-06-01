interface StockBarProps {
  remaining: number;
  received: number;
  showLabel?: boolean;
}

export function StockBar({ remaining, received, showLabel = true }: StockBarProps) {
  const ratio = received > 0 ? Math.max(0, Math.min(1, remaining / received)) : 0;
  const percent = Math.round(ratio * 100);
  const tone = ratio === 0 ? 'gray' : ratio < 0.15 ? 'brick' : ratio < 0.4 ? 'amber' : 'green';

  return (
    <div className="stock-bar">
      {showLabel && (
        <div className={`stock-label tone-${tone}`}>
          <span className="num">{remaining}</span>
          <span className="of">/ {received}</span>
        </div>
      )}
      <div className="track">
        <div className={`fill tone-${tone}`} style={{ width: `${percent}%` }} />
      </div>

      <style>{`
        .stock-bar { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
        .stock-label { font-size: 12.5px; font-weight: 600; display: flex; align-items: baseline; gap: 4px; }
        .stock-label .of { font-size: 11px; color: var(--ink-faint); font-weight: 500; }
        .stock-label.tone-green { color: var(--green); }
        .stock-label.tone-amber { color: var(--amber); }
        .stock-label.tone-brick { color: var(--brick); }
        .stock-label.tone-gray  { color: var(--ink-faint); }
        .track {
          height: 6px;
          background: var(--line);
          border-radius: 3px;
          overflow: hidden;
        }
        .fill { height: 100%; transition: width .3s; }
        .fill.tone-green { background: var(--green-2); }
        .fill.tone-amber { background: var(--amber); }
        .fill.tone-brick { background: var(--brick); }
        .fill.tone-gray  { background: var(--ink-faint); }
      `}</style>
    </div>
  );
}
