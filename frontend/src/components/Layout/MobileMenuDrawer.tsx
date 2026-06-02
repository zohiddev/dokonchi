import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface MobileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface DrawerItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  tone?: 'amber' | 'brick' | 'green';
}

// Bottom navda yo'q qolgan barcha menyu — drawer ichida grid bo'lib chiqadi.
export function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
  const { user, logout } = useAuth();

  // ESC bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock ochiq paytda
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const items: DrawerItem[] = [
    { to: '/batches', label: 'Partiyalar', icon: <IconBox /> },
    { to: '/suppliers', label: "Ta'minotchilar", icon: <IconTruck /> },
    { to: '/inventory', label: 'Ombor', icon: <IconWarehouse /> },
    { to: '/products', label: 'Mahsulotlar', icon: <IconTag /> },
    { to: '/customers', label: 'Mijozlar', icon: <IconUserCircle /> },
    { to: '/expenses', label: 'Xarajatlar', icon: <IconReceipt />, tone: 'brick' },
    { to: '/reports', label: 'Hisobotlar', icon: <IconChart /> },
  ];
  if (user?.role === 'ADMIN') {
    items.push({ to: '/users', label: 'Xodimlar', icon: <IconUsers />, tone: 'amber' });
  }

  return createPortal(
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-handle" />

        <div className="drawer-head">
          <strong className="serif">Boshqa bo'limlar</strong>
          {user && (
            <div className="user-chip-sm">
              <span className="av">{user.name.charAt(0).toUpperCase()}</span>
              <span>{user.name}</span>
            </div>
          )}
        </div>

        <div className="drawer-grid">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `dcell tone-${item.tone ?? 'green'} ${isActive ? 'active' : ''}`}
            >
              <div className="dcell-ic">{item.icon}</div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <button className="logout-row" onClick={() => { logout(); onClose(); }}>
          <IconExit />
          <span>Chiqish</span>
        </button>
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed; inset: 0;
          background: rgba(43, 38, 32, .5);
          backdrop-filter: blur(2px);
          z-index: 110;
          display: flex;
          align-items: flex-end;
          animation: dr-fade .2s ease;
        }
        .drawer {
          width: 100%;
          background: var(--card);
          border-radius: 18px 18px 0 0;
          padding: 8px 18px calc(20px + env(safe-area-inset-bottom));
          max-height: 88vh;
          overflow-y: auto;
          animation: dr-slide .25s cubic-bezier(.2,.7,.3,1);
          box-shadow: 0 -8px 28px rgba(43, 38, 32, .18);
        }
        .drawer-handle {
          width: 42px; height: 4px;
          background: var(--line-strong);
          border-radius: 4px;
          margin: 0 auto 12px;
        }
        .drawer-head {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--line);
        }
        .drawer-head strong { font-size: 16px; }
        .user-chip-sm {
          display: flex; align-items: center; gap: 7px;
          font-size: 12.5px; color: var(--ink-soft);
        }
        .user-chip-sm .av {
          width: 24px; height: 24px;
          border-radius: 6px;
          background: var(--amber-soft); color: var(--amber);
          display: grid; place-items: center;
          font-family: 'Fraunces', serif; font-weight: 700;
          font-size: 12px;
        }
        .drawer-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 16px 0;
        }
        @media (max-width: 380px) {
          .drawer-grid { grid-template-columns: repeat(3, 1fr); }
        }
        .dcell {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 6px;
          padding: 14px 6px;
          background: var(--paper-2);
          border: 1px solid var(--line);
          border-radius: 12px;
          color: var(--ink);
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 600;
          text-align: center;
          line-height: 1.2;
          transition: transform .12s, background .12s;
        }
        .dcell:active { transform: scale(.96); background: var(--paper); }
        .dcell.active { border-color: var(--green); background: var(--green-soft); }
        .dcell-ic {
          width: 36px; height: 36px;
          border-radius: 9px;
          display: grid; place-items: center;
        }
        .dcell-ic svg { width: 19px; height: 19px; stroke-width: 1.7; }
        .dcell.tone-green .dcell-ic { background: var(--green-soft); color: var(--green); }
        .dcell.tone-amber .dcell-ic { background: var(--amber-soft); color: var(--amber); }
        .dcell.tone-brick .dcell-ic { background: var(--brick-soft); color: var(--brick); }
        .dcell.active .dcell-ic { background: var(--green); color: var(--paper-2); }

        .logout-row {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink-soft);
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit; font-size: 13.5px; font-weight: 600;
        }
        .logout-row svg { width: 16px; height: 16px; stroke-width: 1.8; }
        .logout-row:active { background: var(--paper); color: var(--brick); }

        @keyframes dr-fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes dr-slide {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

// Ikona komponentlari (Sidebar bilan o'xshash)
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" /><path d="M16 8h4l3 3v5h-7" />
      <circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" />
    </svg>
  );
}
function IconWarehouse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V8l9-4 9 4v13" /><path d="M8 21V12h8v9" /><path d="M8 16h8" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 12.6l-8 8a2 2 0 0 1-2.8 0L3 13.8V4h9.8l7.8 7.8a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="8.5" r="1.5" />
    </svg>
  );
}
function IconUserCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" />
      <path d="M6.5 19a6 6 0 0 1 11 0" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2z" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-7" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconExit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
    </svg>
  );
}
