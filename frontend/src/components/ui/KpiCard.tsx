import type { ReactNode } from 'react';

export type KpiTone = 'green' | 'amber' | 'brick';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: { value: string; trend: 'up' | 'down' };
  tone?: KpiTone;
}

export function KpiCard({ icon, label, value, delta, tone = 'green' }: KpiCardProps) {
  return (
    <div className={`kpi kpi-${tone}`}>
      <div className={`ic i-${tone}`}>{icon}</div>
      <div className="lbl">{label}</div>
      <div className="val serif">{value}</div>
      {delta && (
        <div className={`delta ${delta.trend === 'up' ? 'up' : 'down'}`}>
          {delta.trend === 'up' ? '▲' : '▼'} {delta.value}
        </div>
      )}

      <style>{`
        .kpi {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 18px 18px 16px;
          box-shadow: var(--shadow);
          position: relative; overflow: hidden;
        }
        .kpi::after {
          content: "";
          position: absolute; right: -20px; top: -20px;
          width: 80px; height: 80px; border-radius: 50%;
          opacity: .5;
        }
        .kpi-green::after { background: var(--green-soft); }
        .kpi-amber::after { background: var(--amber-soft); }
        .kpi-brick::after { background: var(--brick-soft); }
        .ic {
          width: 34px; height: 34px; border-radius: 9px;
          display: grid; place-items: center;
          margin-bottom: 14px; position: relative; z-index: 1;
        }
        .ic svg { width: 18px; height: 18px; stroke-width: 1.9; }
        .i-green { background: var(--green-soft); color: var(--green); }
        .i-amber { background: var(--amber-soft); color: var(--amber); }
        .i-brick { background: var(--brick-soft); color: var(--brick); }
        .lbl { font-size: 12.5px; color: var(--ink-soft); font-weight: 500; }
        .val { font-size: 27px; font-weight: 600; margin-top: 3px; letter-spacing: -.3px; color: var(--ink); }
        .delta { font-size: 12px; font-weight: 600; margin-top: 8px; display: inline-flex; align-items: center; gap: 4px; }
        .up { color: var(--green-2); }
        .down { color: var(--brick); }
      `}</style>
    </div>
  );
}
