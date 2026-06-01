import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div className={`ui-card ${className}`} style={padding ? undefined : { padding: 0 }}>
      {children}
      <style>{`
        .ui-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }
      `}</style>
    </div>
  );
}

export function CardHead({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="card-head">
      <div className="card-head-text">
        <h3 className="serif">{title}</h3>
        {subtitle && <small>{subtitle}</small>}
      </div>
      {right && <div className="card-head-right">{right}</div>}
      <style>{`
        .card-head {
          display: flex; align-items: center; gap: 12px;
          padding: 17px 20px;
          border-bottom: 1px solid var(--line);
        }
        .card-head-text { flex: 1; min-width: 0; }
        .card-head h3 { font-size: 17px; font-weight: 600; color: var(--ink); }
        .card-head small { font-size: 12.5px; color: var(--ink-soft); }
      `}</style>
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-body ${className}`}>
      {children}
      <style>{`
        .card-body { padding: 18px 20px; }
      `}</style>
    </div>
  );
}
