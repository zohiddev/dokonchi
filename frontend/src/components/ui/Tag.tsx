import type { ReactNode } from 'react';

export type TagTone = 'green' | 'amber' | 'brick' | 'gray';

export function Tag({
  children,
  tone = 'green',
}: {
  children: ReactNode;
  tone?: TagTone;
}) {
  return (
    <span className={`tag tag-${tone}`}>
      {children}
      <style>{`
        .tag {
          display: inline-flex; align-items: center;
          padding: 3px 10px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: .2px;
          white-space: nowrap;
        }
        .tag-green { background: var(--green-soft); color: var(--green); }
        .tag-amber { background: var(--amber-soft); color: var(--amber); }
        .tag-brick { background: var(--brick-soft); color: var(--brick); }
        .tag-gray  { background: #e9e2d4; color: var(--ink-soft); }
      `}</style>
    </span>
  );
}

// Maxsus statuslar uchun shortcut'lar
export function StatusPill({ status }: { status: 'active' | 'slow' | 'old' | 'finished' | 'paid' | 'debt' }) {
  const map: Record<string, { label: string; tone: TagTone }> = {
    active:   { label: 'Sotilyapti', tone: 'green' },
    slow:     { label: 'Sekin',      tone: 'amber' },
    old:      { label: 'Eski',       tone: 'brick' },
    finished: { label: 'Tugagan',    tone: 'gray'  },
    paid:     { label: "To'landi",   tone: 'green' },
    debt:     { label: 'Qarz',       tone: 'brick' },
  };
  const info = map[status];
  return <Tag tone={info.tone}>{info.label}</Tag>;
}

export function PaymentTag({ type }: { type: 'NAQD' | 'KARTA' | 'NASIYA' }) {
  if (type === 'NAQD') return <Tag tone="green">Naqd</Tag>;
  if (type === 'KARTA') return <Tag tone="amber">Karta</Tag>;
  return <Tag tone="brick">Nasiya</Tag>;
}
