import { NavLink } from 'react-router-dom';

interface BottomNavProps {
  onMore: () => void;
  moreActive?: boolean;
}

// Mobile uchun 4 ta asosiy kundalik nav + "Boshqa" drawer ochuvchi
export function BottomNav({ onMore, moreActive }: BottomNavProps) {
  return (
    <nav className="bnav" role="navigation">
      <NavLink to="/" end className={({ isActive }) => `bnav-tab ${isActive ? 'active' : ''}`}>
        <IconHome />
        <span>Bosh</span>
      </NavLink>
      <NavLink to="/sales" className={({ isActive }) => `bnav-tab ${isActive ? 'active' : ''}`}>
        <IconCart />
        <span>Sotuv</span>
      </NavLink>
      <NavLink to="/cash" className={({ isActive }) => `bnav-tab ${isActive ? 'active' : ''}`}>
        <IconCash />
        <span>Kassa</span>
      </NavLink>
      <NavLink to="/debts" className={({ isActive }) => `bnav-tab ${isActive ? 'active' : ''}`}>
        <IconWallet />
        <span>Nasiya</span>
      </NavLink>
      <button
        type="button"
        className={`bnav-tab ${moreActive ? 'active' : ''}`}
        onClick={onMore}
      >
        <IconMore />
        <span>Boshqa</span>
      </button>

      <style>{`
        .bnav {
          display: none;
        }
        @media (max-width: 880px) {
          .bnav {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: var(--card);
            border-top: 1px solid var(--line);
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
            z-index: 90;
            box-shadow: 0 -4px 12px rgba(26, 34, 48, .04);
          }
        }
        .bnav-tab {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px;
          padding: 6px 4px;
          background: transparent; border: none;
          color: var(--ink-soft);
          font-family: inherit;
          text-decoration: none;
          cursor: pointer;
          border-radius: 8px;
          transition: color .15s, background .15s;
        }
        .bnav-tab svg { width: 22px; height: 22px; stroke-width: 1.7; }
        .bnav-tab span {
          font-size: 10.5px; font-weight: 600;
          letter-spacing: .2px;
        }
        .bnav-tab.active {
          color: var(--accent);
        }
        .bnav-tab.active svg { stroke-width: 2.1; }
        .bnav-tab:active {
          background: var(--paper);
        }
      `}</style>
    </nav>
  );
}

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
function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="18" height="11" rx="2" />
      <path d="M5 10V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" />
      <path d="M7 14h2M11 14h2M15 14h2M7 18h10" />
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
function IconMore() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
