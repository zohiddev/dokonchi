import { useState } from 'react';
import { useDashboard } from '../api/reports';
import { NewDeliveryModal } from '../components/NewDeliveryModal';
import { QuickCustomerSaleModal } from '../components/QuickCustomerSaleModal';
import { QuickDebtPaymentModal } from '../components/QuickDebtPaymentModal';
import { QuickSupplierPaymentModal } from '../components/QuickSupplierPaymentModal';
import { KpiCard } from '../components/ui/KpiCard';
import { money } from '../lib/format';

export function DashboardPage() {
  const dashboard = useDashboard();
  const d = dashboard.data;

  const [payOpen, setPayOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [supplierPayOpen, setSupplierPayOpen] = useState(false);

  return (
    <div className="dashboard">
      {/* KPI grid */}
      <div className="kpi-grid">
        <KpiCard
          tone="green"
          icon={<IconCash />}
          label="Bugungi savdo"
          value={money(d?.today.revenue ?? 0, false)}
        />
        <KpiCard
          tone="green"
          icon={<IconTrend />}
          label="Bugungi foyda"
          value={money(d?.today.profit ?? 0, false)}
        />
        <KpiCard
          tone="brick"
          icon={<IconCard />}
          label="Bugungi jami nasiya"
          value={money(d?.today.newCredit ?? 0, false)}
        />
        <KpiCard
          tone="amber"
          icon={<IconReceipt />}
          label="Bugungi jami xarajat"
          value={money(d?.today.expenses ?? 0, false)}
        />
      </div>

      {/* Tezkor amallar */}
      <section className="quick-actions">
        <button className="qa-card pay" onClick={() => setPayOpen(true)}>
          <span className="qa-ic"><IconReceive /></span>
          <span className="qa-text">
            <strong>Qarz to'lash</strong>
            <small>Mijoz qarzini qaytardi — pulni qabul qiling</small>
          </span>
          <span className="qa-arrow">→</span>
        </button>

        <button className="qa-card sale" onClick={() => setSaleOpen(true)}>
          <span className="qa-ic"><IconSell /></span>
          <span className="qa-text">
            <strong>Mijozga sotish</strong>
            <small>Mijozni tanlab tovar soting</small>
          </span>
          <span className="qa-arrow">→</span>
        </button>

        <button className="qa-card batch" onClick={() => setBatchOpen(true)}>
          <span className="qa-ic"><IconBatch /></span>
          <span className="qa-text">
            <strong>Partiya qo'shish</strong>
            <small>Ta'minotchidan kelgan yangi tovar</small>
          </span>
          <span className="qa-arrow">→</span>
        </button>

        <button className="qa-card supplier" onClick={() => setSupplierPayOpen(true)}>
          <span className="qa-ic"><IconSupplierPay /></span>
          <span className="qa-text">
            <strong>Ta'minotchiga to'lash</strong>
            <small>Ta'minotchiga qarzimizni to'lang</small>
          </span>
          <span className="qa-arrow">→</span>
        </button>
      </section>

      <QuickDebtPaymentModal open={payOpen} onClose={() => setPayOpen(false)} />
      <QuickCustomerSaleModal open={saleOpen} onClose={() => setSaleOpen(false)} />
      <NewDeliveryModal open={batchOpen} onClose={() => setBatchOpen(false)} />
      <QuickSupplierPaymentModal open={supplierPayOpen} onClose={() => setSupplierPayOpen(false)} />

      <style>{`
        .dashboard { display: flex; flex-direction: column; gap: 18px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }

        .quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .qa-card {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 20px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius, 14px);
          box-shadow: var(--shadow);
          cursor: pointer; font-family: inherit; text-align: left;
          transition: transform .14s, border-color .14s, box-shadow .14s;
        }
        .qa-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(26,34,48,.10); }
        .qa-card.pay:hover { border-color: var(--green); }
        .qa-card.sale:hover { border-color: var(--accent); }
        .qa-card.batch:hover { border-color: var(--amber); }
        .qa-card.supplier:hover { border-color: var(--brick); }
        .qa-ic {
          flex-shrink: 0;
          width: 48px; height: 48px; border-radius: 13px;
          display: grid; place-items: center;
        }
        .qa-card.pay .qa-ic { background: var(--green-soft); color: var(--green); }
        .qa-card.sale .qa-ic { background: var(--accent-soft, var(--paper-2)); color: var(--accent); }
        .qa-card.batch .qa-ic { background: var(--amber-soft); color: var(--amber); }
        .qa-card.supplier .qa-ic { background: var(--brick-soft); color: var(--brick); }
        .qa-ic svg { width: 24px; height: 24px; }
        .qa-text { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .qa-text strong { font-size: 15.5px; font-weight: 700; color: var(--ink); }
        .qa-text small { font-size: 12.5px; color: var(--ink-soft); }
        .qa-arrow {
          flex-shrink: 0; font-size: 20px; color: var(--ink-faint);
          transition: transform .14s, color .14s;
        }
        .qa-card:hover .qa-arrow { transform: translateX(3px); }
        .qa-card.pay:hover .qa-arrow { color: var(--green); }
        .qa-card.sale:hover .qa-arrow { color: var(--accent); }
        .qa-card.batch:hover .qa-arrow { color: var(--amber); }
        .qa-card.supplier:hover .qa-arrow { color: var(--brick); }

        @media (max-width: 960px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .quick-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <circle cx="12" cy="12.5" r="3" />
      <path d="M6 6V4M18 6V4M6 21v-2M18 21v-2" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M14 6h7v7" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 11h18" />
      <path d="M7 16h4" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3l-2.5 1.5L14 3l-2 1.5L10 3 7.5 4.5 5 3z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}
function IconReceive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 18h16" />
    </svg>
  );
}
function IconSell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  );
}
function IconBatch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 22V11" />
    </svg>
  );
}
function IconSupplierPay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h13v10H3z" />
      <path d="M16 10h3l2 3v4h-5" />
      <circle cx="7.5" cy="12" r="1.6" />
      <circle cx="18" cy="17" r="1.6" />
    </svg>
  );
}
