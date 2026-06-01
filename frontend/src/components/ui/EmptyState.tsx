import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h4 className="serif">{title}</h4>
      {description && <p>{description}</p>}
      {action && <div className="empty-action">{action}</div>}
      <style>{`
        .empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 24px;
          text-align: center;
          color: var(--ink-soft);
        }
        .empty-icon {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--paper);
          display: grid; place-items: center;
          margin-bottom: 14px;
          color: var(--ink-faint);
        }
        .empty-icon svg { width: 28px; height: 28px; stroke-width: 1.5; }
        .empty h4 {
          font-size: 17px;
          color: var(--ink);
          font-weight: 600;
          margin-bottom: 4px;
        }
        .empty p { font-size: 13px; max-width: 360px; }
        .empty-action { margin-top: 16px; }
      `}</style>
    </div>
  );
}
