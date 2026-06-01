import { useLocation } from 'react-router-dom';

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Boshqaruv paneli', subtitle: 'Umumiy holat va so\'nggi harakatlar' },
  '/sales': { title: 'Sotuvlar', subtitle: 'Sotuv tarixi va yangi sotuv' },
  '/batches': { title: 'Partiyalar', subtitle: 'Kelgan tovar bo\'lib-bo\'lib hisoblanadi' },
  '/inventory': { title: 'Ombor', subtitle: 'Joriy qoldiq va o\'rtacha tannarx' },
  '/products': { title: 'Mahsulotlar', subtitle: 'Katalog va narxlar' },
  '/debts': { title: 'Nasiya', subtitle: 'Qarzdorlar va to\'lovlar' },
  '/reports': { title: 'Hisobotlar', subtitle: 'Foyda, xarajat, oylik xulosa' },
  '/customers': { title: 'Mijozlar', subtitle: 'Barcha mijozlar (qarzdorlar bilan birga)' },
  '/users': { title: 'Xodimlar', subtitle: "Tizim foydalanuvchilarini boshqarish (faqat ADMIN)" },
};

interface TopbarProps {
  onNewSale?: () => void;
}

export function Topbar({ onNewSale }: TopbarProps) {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] ?? { title: '', subtitle: '' };

  return (
    <header className="topbar">
      <div>
        <div className="page-title serif">{meta.title}</div>
        {meta.subtitle && <div className="page-sub">{meta.subtitle}</div>}
      </div>

      <div className="topbar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input placeholder="Qidirish..." />
      </div>

      <button className="btn-new-sale" onClick={onNewSale}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Yangi sotuv
      </button>

      <style>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 18px 30px;
          background: var(--paper-2);
          border-bottom: 1px solid var(--line);
        }
        .page-title { font-size: 23px; font-weight: 600; color: var(--ink); }
        .page-sub { font-size: 12.5px; color: var(--ink-soft); margin-top: 1px; }
        .topbar-search {
          margin-left: auto;
          display: flex; align-items: center; gap: 9px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 11px;
          padding: 9px 14px;
          width: 260px;
        }
        .topbar-search input {
          border: none; background: none; outline: none;
          font-family: inherit; font-size: 13.5px;
          width: 100%; color: var(--ink);
        }
        .topbar-search svg {
          width: 16px; height: 16px;
          color: var(--ink-faint); stroke-width: 1.8;
        }
        .btn-new-sale {
          display: inline-flex; align-items: center; gap: 7px;
          background: var(--green);
          color: var(--paper-2);
          font-weight: 600; font-size: 13.5px;
          border: none; border-radius: 11px;
          padding: 10px 16px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: filter .15s, transform .15s;
        }
        .btn-new-sale:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .btn-new-sale svg { width: 16px; height: 16px; }
        @media (max-width: 780px) {
          .topbar { padding: 14px 18px; gap: 10px; }
          .topbar-search { width: 160px; }
          .page-sub { display: none; }
        }
      `}</style>
    </header>
  );
}
