import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} {...rest}>
      {icon && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
      <style>{`
        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: filter .15s, transform .15s, opacity .15s;
          font-family: inherit;
        }
        .btn:disabled { opacity: .5; cursor: not-allowed; }
        .btn:not(:disabled):hover { filter: brightness(1.08); transform: translateY(-1px); }
        .btn-icon { display: inline-flex; }
        .btn-icon svg { width: 16px; height: 16px; stroke-width: 2; }

        .btn-md { padding: 10px 16px; font-size: 13.5px; }
        .btn-sm { padding: 7px 12px; font-size: 12.5px; border-radius: 8px; }

        .btn-primary { background: var(--green); color: var(--paper-2); box-shadow: var(--shadow); }
        .btn-ghost {
          background: var(--card);
          color: var(--ink);
          border: 1px solid var(--line-strong);
        }
        .btn-danger { background: var(--brick); color: var(--paper-2); }
      `}</style>
    </button>
  );
}
