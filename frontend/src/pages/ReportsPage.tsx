import { useState } from 'react';
import { useMonthlySummary, useProfitByCategory } from '../api/reports';
import { Card, CardBody, CardHead } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { money } from '../lib/format';

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ReportsPage() {
  const [month, setMonth] = useState(currentMonthIso());
  const profit = useProfitByCategory();
  const summary = useMonthlySummary(month);

  const maxProfit = Math.max(
    1,
    ...(profit.data ?? []).map((p) => Math.max(0, Number(p.profit))),
  );

  return (
    <div className="reports-page">
      <div className="grid-2">
        <Card>
          <CardHead title="Toifa bo'yicha foyda" subtitle="Joriy oy" />
          <CardBody>
            {profit.isLoading && <Spinner label="Yuklanmoqda..." />}
            {profit.data && profit.data.length > 0 && (
              <ul className="cat-list">
                {profit.data.map((p) => {
                  const v = Math.max(0, Number(p.profit));
                  const w = (v / maxProfit) * 100;
                  return (
                    <li key={p.categoryId}>
                      <div className="cat-head">
                        <span>{p.name}</span>
                        <span className="num" style={{ color: 'var(--green-2)', fontWeight: 600 }}>
                          {money(p.profit)}
                        </span>
                      </div>
                      <div className="cat-bar">
                        <div className="fill" style={{ width: `${w}%` }} />
                      </div>
                      <div className="cat-meta">
                        <small>Savdo: <span className="num">{money(p.revenue, false)}</span></small>
                        <small>Tannarx: <span className="num">{money(p.cost, false)}</span></small>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {profit.data && profit.data.length === 0 && (
              <EmptyState title="Sotuv yo'q" description="Joriy oyda sotuvlar yo'q" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title="Oylik xulosa"
            right={
              <input
                className="month-pick"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            }
          />
          <CardBody>
            {summary.isLoading && <Spinner label="Yuklanmoqda..." />}
            {summary.data && (
              <div className="summary">
                <Row label="Savdo (yalpi)" value={money(summary.data.revenue)} tone="green" />
                <Row label="Tannarx (FIFO)" value={money(summary.data.cost)} tone="muted" />
                <Row label="Yalpi foyda" value={money(summary.data.grossProfit)} tone="green" bold />
                <Row label="Xarajat" value={money(summary.data.expenses)} tone="brick" />
                <hr />
                <Row
                  label="Sof foyda"
                  value={money(summary.data.netProfit)}
                  tone={Number(summary.data.netProfit) >= 0 ? 'green' : 'brick'}
                  big
                />
                <small className="hint">
                  Sotuvlar: <span className="num">{summary.data.salesCount}</span> ta · Yangi nasiya:
                  {' '}<span className="num">{money(summary.data.newCreditTotal, false)}</span>
                </small>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <style>{`
        .reports-page { display: flex; flex-direction: column; gap: 16px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 960px) { .grid-2 { grid-template-columns: 1fr; } }

        .cat-list { list-style: none; display: flex; flex-direction: column; gap: 14px; }
        .cat-head { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 5px; }
        .cat-head span:first-child { color: var(--ink); font-weight: 600; }
        .cat-bar {
          height: 8px; background: var(--paper);
          border-radius: 4px; overflow: hidden; margin-bottom: 5px;
        }
        .cat-bar .fill {
          height: 100%;
          background: linear-gradient(to right, var(--green-2), var(--green));
          border-radius: 4px;
          animation: grow .4s ease;
        }
        .cat-meta { display: flex; gap: 14px; font-size: 11.5px; color: var(--ink-soft); }

        .summary { display: flex; flex-direction: column; gap: 8px; }
        .summary hr { border: none; border-top: 1px dashed var(--line-strong); margin: 6px 0; }
        .summary .hint {
          margin-top: 10px; color: var(--ink-soft); font-size: 12px;
        }
        .month-pick {
          padding: 6px 9px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          background: var(--card);
          font-family: inherit; font-size: 12.5px;
          outline: none; color: var(--ink);
        }
        @keyframes grow {
          from { transform: scaleX(0); transform-origin: left; }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  bold,
  big,
}: {
  label: string;
  value: string;
  tone: 'green' | 'brick' | 'muted';
  bold?: boolean;
  big?: boolean;
}) {
  const colorMap = { green: 'var(--green-2)', brick: 'var(--brick)', muted: 'var(--ink-soft)' };
  return (
    <div className="row">
      <span className="lbl">{label}</span>
      <span
        className="num"
        style={{
          color: colorMap[tone],
          fontWeight: bold || big ? 700 : 500,
          fontSize: big ? 22 : 14,
        }}
      >
        {value}
      </span>
      <style>{`
        .row { display: flex; justify-content: space-between; align-items: baseline; }
        .row .lbl { color: var(--ink); font-size: 13px; }
      `}</style>
    </div>
  );
}
