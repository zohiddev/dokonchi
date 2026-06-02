import { useState } from 'react';
import { useDailyCash, type CashTransaction, type CashTransactionKind } from '../api/cash';
import { ExpenseModal } from '../components/ExpenseModal';
import { Button } from '../components/ui/Button';
import { Card, CardHead } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { money, time } from '../lib/format';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const KIND_META: Record<CashTransactionKind, { label: string; tone: 'green' | 'amber' | 'brick' | 'gray'; icon: string }> = {
  'sale-cash': { label: 'Naqd sotuv', tone: 'green', icon: '💵' },
  'sale-card': { label: 'Karta sotuv', tone: 'amber', icon: '💳' },
  'debt-payment': { label: "Nasiya to'lov", tone: 'green', icon: '📥' },
  'expense': { label: 'Xarajat', tone: 'brick', icon: '📤' },
  'batch-purchase': { label: 'Partiya xaridi', tone: 'brick', icon: '📦' },
};

export function CashPage() {
  const [date, setDate] = useState(todayIso());
  const [expModalOpen, setExpModalOpen] = useState(false);
  const daily = useDailyCash(date);
  const d = daily.data;

  return (
    <div className="cash-page">
      {/* Sana tanlash + tezkor amallar */}
      <div className="date-bar">
        <label>
          <span>Sana:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayIso()}
          />
        </label>
        <small className="hint">
          Naqd sotuv + karta + nasiya to'lov = <strong>kirim</strong>;
          xarajat + partiya xaridi = <strong>chiqim</strong>
        </small>
        <Button onClick={() => setExpModalOpen(true)} icon={<IconMinus />}>
          Xarajat qo'shish
        </Button>
      </div>

      <ExpenseModal
        open={expModalOpen}
        onClose={() => setExpModalOpen(false)}
        defaultDate={date}
      />

      {daily.isLoading && <Spinner label="Yuklanmoqda..." />}

      {d && (
        <>
          {/* KPI cards */}
          <div className="kpi-row">
            <CashKpi
              tone="green"
              icon={<IconArrowDown />}
              label="Kirim"
              value={money(d.income.total, false)}
              breakdown={[
                { label: 'Naqd', value: d.income.naqd.amount, count: d.income.naqd.count },
                { label: 'Karta', value: d.income.karta.amount, count: d.income.karta.count },
                { label: "Nasiya to'lov", value: d.income.debtPayments.amount, count: d.income.debtPayments.count },
              ]}
            />
            <CashKpi
              tone="brick"
              icon={<IconArrowUp />}
              label="Chiqim"
              value={money(d.outflow.total, false)}
              breakdown={[
                { label: 'Xarajat', value: d.outflow.expenses.amount, count: d.outflow.expenses.count },
                { label: 'Partiya xaridi', value: d.outflow.batchPurchases.amount, count: d.outflow.batchPurchases.count },
              ]}
            />
            <CashKpi
              tone={Number(d.netCash) >= 0 ? 'green' : 'brick'}
              icon={<IconWallet />}
              label="Sof balans"
              value={money(d.netCash, false)}
              breakdown={null}
              highlight
            />
            <CashKpi
              tone="amber"
              icon={<IconClock />}
              label="Nasiya sotuv"
              subtitle="(kelajakda tushadi)"
              value={money(d.creditSales.amount, false)}
              breakdown={[
                { label: 'Sotuvlar', value: d.creditSales.amount, count: d.creditSales.count },
              ]}
            />
          </div>

          {/* Transactions log */}
          <Card>
            <CardHead
              title="Tranzaksiyalar"
              subtitle={`${d.transactions.length} ta · ${d.date}`}
            />
            {d.transactions.length === 0 ? (
              <EmptyState
                title="Tranzaksiya yo'q"
                description="Bu sanada hech qanday kirim yoki chiqim qayd etilmagan"
              />
            ) : (
              <ul className="tx-list">
                {d.transactions.map((tx) => (
                  <TxRow key={`${tx.kind}-${tx.refId}`} tx={tx} />
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <style>{`
        .cash-page { display: flex; flex-direction: column; gap: 16px; }
        .date-bar {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
          padding: 14px 18px; background: var(--card);
          border: 1px solid var(--line); border-radius: 12px;
        }
        .date-bar label { display: flex; align-items: center; gap: 8px; }
        .date-bar label span {
          font-size: 12px; color: var(--ink-soft); text-transform: uppercase;
          letter-spacing: .4px; font-weight: 500;
        }
        .date-bar input {
          padding: 7px 11px; border: 1px solid var(--line-strong);
          border-radius: 8px; background: var(--paper-2);
          font-family: inherit; outline: none;
        }
        .date-bar input:focus { border-color: var(--green-2); background: var(--card); }
        .date-bar .hint { color: var(--ink-soft); font-size: 12.5px; }
        .date-bar .hint strong { color: var(--ink); font-weight: 600; }

        .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        @media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .kpi-row { grid-template-columns: 1fr; } }

        .tx-list { list-style: none; }
      `}</style>
    </div>
  );
}

interface CashKpiProps {
  tone: 'green' | 'amber' | 'brick';
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  value: string;
  breakdown: { label: string; value: string; count: number }[] | null;
  highlight?: boolean;
}

function CashKpi({ tone, icon, label, subtitle, value, breakdown, highlight }: CashKpiProps) {
  return (
    <div className={`cash-kpi tone-${tone} ${highlight ? 'highlight' : ''}`}>
      <div className="head">
        <div className={`ic i-${tone}`}>{icon}</div>
        <div>
          <small className="lbl">{label}</small>
          {subtitle && <small className="sub">{subtitle}</small>}
        </div>
      </div>
      <strong className="val serif num">{value}</strong>
      {breakdown && (
        <ul className="bd">
          {breakdown.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span>
              <span className="num">
                {money(b.value, false)} <small>({b.count})</small>
              </span>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .cash-kpi {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 16px 18px;
          box-shadow: var(--shadow);
          display: flex; flex-direction: column; gap: 10px;
        }
        .cash-kpi.highlight {
          border-color: ${tone === 'green' ? 'var(--green-2)' : tone === 'brick' ? 'var(--brick)' : 'var(--line)'};
          border-width: 2px;
        }
        .head { display: flex; align-items: center; gap: 11px; }
        .ic {
          width: 32px; height: 32px; border-radius: 9px;
          display: grid; place-items: center; flex-shrink: 0;
        }
        .ic svg { width: 16px; height: 16px; stroke-width: 1.9; }
        .i-green { background: var(--green-soft); color: var(--green); }
        .i-amber { background: var(--amber-soft); color: var(--amber); }
        .i-brick { background: var(--brick-soft); color: var(--brick); }
        .lbl {
          font-size: 11.5px; color: var(--ink-soft); font-weight: 600;
          text-transform: uppercase; letter-spacing: .5px; display: block;
        }
        .sub { font-size: 11px; color: var(--ink-faint); display: block; margin-top: 1px; }
        .val { font-size: 22px; font-weight: 600; color: var(--ink); letter-spacing: -.2px; }
        .bd { list-style: none; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
        .bd li {
          display: flex; justify-content: space-between;
          font-size: 12px; padding: 2px 0;
        }
        .bd li span:first-child { color: var(--ink-soft); }
        .bd li span:last-child { color: var(--ink); font-weight: 500; }
        .bd li small { color: var(--ink-faint); font-weight: 400; }
      `}</style>
    </div>
  );
}

function TxRow({ tx }: { tx: CashTransaction }) {
  const meta = KIND_META[tx.kind];
  const sign = tx.direction === 'in' ? '+' : '−';
  const color = tx.direction === 'in' ? 'var(--green-2)' : 'var(--brick)';

  return (
    <li className="tx">
      <div className="tx-time num">{time(tx.time)}</div>
      <div className={`tx-badge tone-${meta.tone}`}>
        <span className="emoji">{meta.icon}</span>
        <span>{meta.label}</span>
      </div>
      <div className="tx-desc">{tx.description}</div>
      <div className="tx-amount num" style={{ color }}>
        {sign} {money(tx.amount, false)}
      </div>
      <style>{`
        .tx {
          display: grid;
          grid-template-columns: 60px 140px 1fr 150px;
          gap: 12px; align-items: center;
          padding: 11px 20px;
          border-bottom: 1px solid var(--line);
          font-size: 13px;
        }
        .tx:last-child { border-bottom: none; }
        .tx-time { color: var(--ink-soft); font-size: 12.5px; }
        .tx-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 600;
          padding: 3px 9px; border-radius: 7px;
          width: fit-content;
        }
        .tx-badge.tone-green { background: var(--green-soft); color: var(--green); }
        .tx-badge.tone-amber { background: var(--amber-soft); color: var(--amber); }
        .tx-badge.tone-brick { background: var(--brick-soft); color: var(--brick); }
        .tx-badge.tone-gray { background: #e9e2d4; color: var(--ink-soft); }
        .tx-badge .emoji { font-size: 13px; }
        .tx-desc { color: var(--ink); }
        .tx-amount { font-weight: 600; text-align: right; }
        @media (max-width: 760px) {
          .tx { grid-template-columns: 1fr auto; gap: 6px; padding: 11px 14px; }
          .tx-time, .tx-badge { grid-column: 1; }
          .tx-desc { grid-column: 1 / -1; color: var(--ink-soft); font-size: 12px; }
          .tx-amount { grid-column: 2; grid-row: 1 / span 2; }
        }
      `}</style>
    </li>
  );
}

function IconArrowDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function IconArrowUp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
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
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconMinus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}
