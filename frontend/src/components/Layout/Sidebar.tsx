import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

interface NavItemDef extends NavItem {
  adminOnly?: boolean;
}

const NAV: NavItemDef[] = [
  { to: '/', label: 'Boshqaruv paneli', icon: <IconHome /> },
  { to: '/sales', label: 'Sotuvlar', icon: <IconCart /> },
  { to: '/cash', label: 'Kassa', icon: <IconCashRegister /> },
  { to: '/expenses', label: 'Xarajatlar', icon: <IconReceipt /> },
  { to: '/batches', label: 'Partiyalar', icon: <IconBox /> },
  { to: '/suppliers', label: "Ta'minotchilar", icon: <IconTruck /> },
  { to: '/inventory', label: 'Ombor', icon: <IconWarehouse /> },
  { to: '/products', label: 'Mahsulotlar', icon: <IconTag /> },
  { to: '/customers', label: 'Mijozlar', icon: <IconUserCircle /> },
  { to: '/debts', label: 'Nasiya', icon: <IconWallet /> },
  { to: '/reports', label: 'Hisobotlar', icon: <IconChart /> },
  { to: '/users', label: 'Xodimlar', icon: <IconUsers />, adminOnly: true },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const initials = (user?.name ?? '?').charAt(0).toUpperCase();
  const visibleNav = NAV.filter((n) => !n.adminOnly || user?.role === 'ADMIN');

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark"><img src="/logo-mark.png" alt="Do'konchi" /></div>
        <div>
          <h1>Do'konchi</h1>
          <span>Hisob-kitob</span>
        </div>
      </div>

      <nav className="nav-group">
        <div className="nav-label">Menyu</div>
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="av">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{user?.name ?? "Foydalanuvchi"}</b>
            <small>{user?.role === 'ADMIN' ? 'Administrator' : 'Sotuvchi'}</small>
          </div>
          <button className="logout-btn" onClick={logout} title="Chiqish">
            <IconExit />
          </button>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 248px;
          flex-shrink: 0;
          background: var(--ink);
          color: #d4dae5;
          display: flex;
          flex-direction: column;
          padding: 22px 14px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .sidebar .brand { display: flex; align-items: center; gap: 11px; padding: 6px 10px 22px; }
        .sidebar .brand .mark {
          width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
          background: #fff; overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08);
        }
        .sidebar .brand .mark img { width: 100%; height: 100%; object-fit: contain; display: block; }
        .sidebar .brand h1 { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; letter-spacing: .2px; line-height: 1.1; }
        .sidebar .brand span { font-size: 11px; color: #9c9482; letter-spacing: .4px; text-transform: uppercase; }
        .nav-group { margin-top: 6px; flex: 1; }
        .nav-label { font-size: 10.5px; letter-spacing: 1.2px; text-transform: uppercase; color: #857c6c; padding: 14px 12px 6px; }
        .nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 10px;
          color: #c8bfac; font-size: 14px; font-weight: 500;
          transition: background .15s, color .15s; margin-bottom: 2px;
          text-decoration: none;
        }
        .nav-item svg { width: 18px; height: 18px; flex-shrink: 0; stroke-width: 1.7; }
        .nav-item:hover { background: rgba(255, 255, 255, .05); color: #fff; }
        .nav-item.active { background: var(--accent); color: #fff; box-shadow: var(--shadow); }
        .sidebar-foot { margin-top: auto; padding: 14px 12px 4px; border-top: 1px solid rgba(255, 255, 255, .08); }
        .user-chip { display: flex; align-items: center; gap: 10px; }
        .user-chip .av {
          width: 34px; height: 34px; border-radius: 9px;
          background: var(--amber-soft); color: var(--amber);
          display: grid; place-items: center;
          font-weight: 700; font-family: 'Fraunces', serif;
        }
        .user-chip b { font-size: 13.5px; color: #f5f7fa; font-weight: 600; display: block; }
        .user-chip small { font-size: 11.5px; color: #857c6c; }
        .logout-btn {
          background: transparent; border: none; color: #857c6c;
          cursor: pointer; padding: 6px; border-radius: 6px;
          transition: color .15s, background .15s;
        }
        .logout-btn:hover { color: #fff; background: rgba(255,255,255,.06); }
        .logout-btn svg { width: 18px; height: 18px; stroke-width: 1.7; }
        @media (max-width: 880px) {
          .sidebar { display: none; }
        }
      `}</style>
    </aside>
  );
}

/* Inline ikona komponentlari (lucide-style outline) */
function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 11.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.6L21 8H6" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </svg>
  );
}
function IconWarehouse() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V8l9-4 9 4v13" />
      <path d="M8 21V12h8v9" />
      <path d="M8 16h8" />
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
function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M16 12h4" />
      <path d="M3 7V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 4 5-7" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3l1 1.5L6 3l1 1.5L8 3l1 1.5L10 3l1 1.5L12 3l1 1.5L14 3l1 1.5L16 3l1 1.5L18 3l1 1.5L20 3v18l-1-1.5L18 21l-1-1.5L16 21l-1-1.5L14 21l-1-1.5L12 21l-1-1.5L10 21l-1-1.5L8 21l-1-1.5L6 21l-1-1.5L4 21z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}
function IconCashRegister() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="11" rx="2" />
      <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" />
      <path d="M7 14h2M11 14h2M15 14h2M7 18h10" />
    </svg>
  );
}
function IconTruck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 3v5h-7" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </svg>
  );
}
function IconUserCircle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 19a6 6 0 0 1 11 0" />
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
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
