import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useCashflowTrend,
  useMonthlySummary,
  useOverview,
  useProfitByCategory,
  useSalesHeatmap,
  useSlowMovers,
  useTopCustomers,
  useTopProducts,
  type AnalyticsPeriod,
  type TopProductMetric,
} from '../api/reports';
import { Card, CardBody, CardHead } from '../components/ui/Card';
import { CashflowAreaChart, HorizontalBarChart } from '../components/ui/Charts';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Spinner } from '../components/ui/Spinner';
import { Tag } from '../components/ui/Tag';
import { money, percent, qty } from '../lib/format';

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ReportsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [topMetric, setTopMetric] = useState<TopProductMetric>('profit');
  const [slowDays, setSlowDays] = useState(30);
  const [cashflowDays, setCashflowDays] = useState(30);
  const [month, setMonth] = useState(currentMonthIso());

  const overview = useOverview(period);
  const topProducts = useTopProducts(period, topMetric, 10);
  const topCustomers = useTopCustomers(period, 10);
  const slowMovers = useSlowMovers(slowDays);
  const cashflow = useCashflowTrend(cashflowDays);
  const heatmap = useSalesHeatmap(period);
  const profitByCategory = useProfitByCategory();
  const monthlySummary = useMonthlySummary(month);

  return (
    <div className="rep-page">
      <div className="period-bar">
        <span className="lbl">Davr:</span>
        <FilterTabs<AnalyticsPeriod>
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: 'Hafta' },
            { value: 'month', label: 'Oy' },
            { value: 'quarter', label: '3 oy' },
            { value: 'year', label: 'Yil' },
          ]}
        />
      </div>

      <ProKpiRow data={overview.data} />

      <Card>
        <CardHead
          title="Naqd oqim trendi"
          subtitle={`So'nggi ${cashflowDays} kun`}
          right={
            <FilterTabs<number>
              value={cashflowDays}
              onChange={setCashflowDays}
              options={[
                { value: 7, label: '7 kun' },
                { value: 14, label: '14 kun' },
                { value: 30, label: '30 kun' },
                { value: 60, label: '60 kun' },
              ]}
            />
          }
        />
        <CardBody>
          {cashflow.isLoading && <Spinner label="Yuklanmoqda..." />}
          {cashflow.data && cashflow.data.length === 0 && <EmptyState title="Ma'lumot yo'q" />}
          {cashflow.data && cashflow.data.length > 0 && (
            <CashflowAreaChart
              data={cashflow.data.map((d) => ({
                date: d.date,
                income: Number(d.income),
                outflow: Number(d.outflow),
                net: Number(d.net),
              }))}
              height={240}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Top mahsulotlar"
          subtitle="Sortirovka tanlanadi"
          right={
            <FilterTabs<TopProductMetric>
              value={topMetric}
              onChange={setTopMetric}
              options={[
                { value: 'profit', label: 'Foyda' },
                { value: 'revenue', label: 'Daromad' },
                { value: 'quantity', label: 'Miqdor' },
              ]}
            />
          }
        />
        {topProducts.isLoading && <div style={{ padding: 20 }}><Spinner /></div>}
        {topProducts.data && topProducts.data.length === 0 && (
          <EmptyState title="Ma'lumot yo'q" description="Bu davrda sotuvlar yo'q" />
        )}
        {topProducts.data && topProducts.data.length > 0 && (
          <ul className="rank-list">
            {topProducts.data.map((p, i) => (
              <li key={p.productId}>
                <span className="rank">#{i + 1}</span>
                <div className="rank-main">
                  <strong>{p.name}</strong>
                  <small>
                    <Tag tone="gray">{p.categoryName}</Tag>
                    <span className="num">{qty(p.quantity, p.unit)} sotildi</span>
                  </small>
                </div>
                <div className="rank-vals">
                  <div className="primary num">
                    {topMetric === 'profit' && money(p.profit, false)}
                    {topMetric === 'revenue' && money(p.revenue, false)}
                    {topMetric === 'quantity' && qty(p.quantity, p.unit)}
                  </div>
                  <small className="num">
                    {topMetric !== 'profit' && <>foyda: {money(p.profit, false)} · </>}
                    margin: <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                      {percent(p.margin, 1)}
                    </span>
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHead title="Top mijozlar" subtitle="Eng ko'p sotib oluvchilar" />
        {topCustomers.isLoading && <div style={{ padding: 20 }}><Spinner /></div>}
        {topCustomers.data && topCustomers.data.length === 0 && (
          <EmptyState title="Mijoz sotuvlar yo'q" />
        )}
        {topCustomers.data && topCustomers.data.length > 0 && (
          <ul className="rank-list">
            {topCustomers.data.map((c, i) => (
              <li key={c.customerId}>
                <span className="rank">#{i + 1}</span>
                <div className="rank-main">
                  <Link to={`/customers/${c.customerId}`} className="cust-link">
                    {c.name}
                  </Link>
                  <small>
                    {c.phone && <span className="num" style={{ color: 'var(--ink-soft)' }}>{c.phone} · </span>}
                    {c.salesCount} ta sotuv
                    {Number(c.creditAmount) > 0 && (
                      <> · <span style={{ color: 'var(--brick)' }}>nasiya: <span className="num">{money(c.creditAmount, false)}</span></span></>
                    )}
                  </small>
                </div>
                <div className="rank-vals">
                  <div className="primary num">{money(c.revenue, false)}</div>
                  <small className="num">foyda: {money(c.profit, false)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHead
          title="Eng band soatlar"
          subtitle="Sotuvlar hafta-kuni × soat bo'yicha"
        />
        <CardBody>
          {heatmap.isLoading && <Spinner />}
          {heatmap.data && <SalesHeatmap data={heatmap.data} />}
        </CardBody>
      </Card>

      <Card>
        <CardHead
          title="Sekin sotilganlar"
          subtitle="Omborda bor lekin sotilmagan"
          right={
            <FilterTabs<number>
              value={slowDays}
              onChange={setSlowDays}
              options={[
                { value: 7, label: '7+ kun' },
                { value: 14, label: '14+ kun' },
                { value: 30, label: '30+ kun' },
                { value: 60, label: '60+ kun' },
              ]}
            />
          }
        />
        {slowMovers.isLoading && <div style={{ padding: 20 }}><Spinner /></div>}
        {slowMovers.data && slowMovers.data.length === 0 && (
          <EmptyState
            title="Hammasi aylanyapti"
            description={`So'nggi ${slowDays} kun ichida hamma mahsulot sotilgan`}
          />
        )}
        {slowMovers.data && slowMovers.data.length > 0 && (
          <ul className="slow-list">
            {slowMovers.data.map((p) => (
              <li key={p.productId}>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.category} · qoldiq: <span className="num">{qty(p.totalRemaining, p.unit)}</span></small>
                </div>
                <div className="slow-meta">
                  <Tag tone={p.oldestBatchAgeDays > 60 ? 'brick' : p.oldestBatchAgeDays > 30 ? 'amber' : 'gray'}>
                    {p.oldestBatchAgeDays} kun
                  </Tag>
                  <small className="num">qiymat: {money(p.stockValue, false)}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid-2">
        <Card>
          <CardHead title="Toifa bo'yicha foyda" subtitle="Joriy oy" />
          <CardBody>
            {profitByCategory.isLoading && <Spinner />}
            {profitByCategory.data && profitByCategory.data.length === 0 && (
              <EmptyState title="Sotuv yo'q" />
            )}
            {profitByCategory.data && profitByCategory.data.length > 0 && (
              <HorizontalBarChart
                data={profitByCategory.data.map((p) => ({
                  label: p.name,
                  value: Math.max(0, Number(p.profit)),
                }))}
              />
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
            {monthlySummary.isLoading && <Spinner />}
            {monthlySummary.data && (
              <div className="summary">
                <Row label="Savdo (yalpi)" value={money(monthlySummary.data.revenue)} tone="green" />
                <Row label="Tannarx (FIFO)" value={money(monthlySummary.data.cost)} tone="muted" />
                <Row label="Yalpi foyda" value={money(monthlySummary.data.grossProfit)} tone="green" bold />
                <Row label="Xarajat" value={money(monthlySummary.data.expenses)} tone="brick" />
                <hr />
                <Row
                  label="Sof foyda"
                  value={money(monthlySummary.data.netProfit)}
                  tone={Number(monthlySummary.data.netProfit) >= 0 ? 'green' : 'brick'}
                  big
                />
                <small className="hint">
                  Sotuvlar: <span className="num">{monthlySummary.data.salesCount}</span> ta · Yangi nasiya:
                  {' '}<span className="num">{money(monthlySummary.data.newCreditTotal, false)}</span>
                </small>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <style>{`
        .rep-page { display: flex; flex-direction: column; gap: 16px; }

        .period-bar {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
          padding: 12px 16px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
        }
        .period-bar .lbl {
          font-size: 12px; color: var(--ink-soft); font-weight: 600;
          text-transform: uppercase; letter-spacing: .4px;
        }

        .rank-list { list-style: none; }
        .rank-list li {
          display: grid;
          grid-template-columns: 36px 1fr auto;
          gap: 12px; align-items: center;
          padding: 11px 20px;
          border-bottom: 1px solid var(--line);
        }
        .rank-list li:last-child { border-bottom: none; }
        .rank {
          font-family: 'Fraunces', serif;
          font-size: 17px; font-weight: 700;
          color: var(--ink-soft); text-align: center;
        }
        .rank-list li:nth-child(1) .rank { color: var(--green); }
        .rank-list li:nth-child(2) .rank { color: var(--amber); }
        .rank-list li:nth-child(3) .rank { color: var(--brick); }
        .rank-main {
          display: flex; flex-direction: column; gap: 3px;
          min-width: 0;
        }
        .rank-main strong { font-size: 13.5px; color: var(--ink); font-weight: 600; }
        .rank-main small {
          font-size: 11.5px; color: var(--ink-soft);
          display: flex; gap: 6px; align-items: center; flex-wrap: wrap;
        }
        .cust-link { color: var(--ink); font-weight: 600; }
        .cust-link:hover { color: var(--accent); text-decoration: underline; }
        .rank-vals {
          text-align: right;
          display: flex; flex-direction: column; gap: 2px;
        }
        .rank-vals .primary {
          font-size: 14.5px; font-weight: 700; color: var(--ink);
        }
        .rank-vals small { font-size: 11px; color: var(--ink-soft); }

        .slow-list { list-style: none; }
        .slow-list li {
          display: flex; justify-content: space-between; align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid var(--line);
        }
        .slow-list li:last-child { border-bottom: none; }
        .slow-list strong { display: block; font-size: 13.5px; color: var(--ink); }
        .slow-list small { display: block; font-size: 11.5px; color: var(--ink-soft); }
        .slow-meta {
          display: flex; flex-direction: column; gap: 4px;
          align-items: flex-end;
        }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 960px) { .grid-2 { grid-template-columns: 1fr; } }

        .summary { display: flex; flex-direction: column; gap: 8px; }
        .summary hr { border: none; border-top: 1px dashed var(--line-strong); margin: 6px 0; }
        .summary .hint { margin-top: 10px; color: var(--ink-soft); font-size: 12px; }
        .month-pick {
          padding: 6px 9px; border: 1px solid var(--line-strong);
          border-radius: 8px; background: var(--card);
          font-family: inherit; font-size: 12.5px; outline: none; color: var(--ink);
        }
      `}</style>
    </div>
  );
}

function ProKpiRow({ data }: { data: ReturnType<typeof useOverview>['data'] }) {
  if (!data) return null;
  const margin = Number(data.margin);
  const growth = data.revenueGrowth ? Number(data.revenueGrowth) : null;

  return (
    <div className="pro-kpis">
      <ProKpi
        label="Jami daromad"
        value={money(data.revenue, false)}
        delta={growth !== null ? { value: percent(growth, 1), positive: growth >= 0 } : undefined}
      />
      <ProKpi
        label="Sof foyda"
        value={money(data.profit, false)}
        sub={`Margin ${percent(margin, 1)}`}
        tone={Number(data.profit) >= 0 ? 'green' : 'brick'}
      />
      <ProKpi label="Sotuv soni" value={String(data.salesCount)} />
      <ProKpi label="O'rtacha chek" value={money(data.avgTicket, false)} />
      <style>{`
        .pro-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 880px) { .pro-kpis { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .pro-kpis { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function ProKpi({
  label, value, sub, delta, tone,
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: string; positive: boolean };
  tone?: 'green' | 'brick';
}) {
  return (
    <div className="pkpi">
      <small className="pkpi-lbl">{label}</small>
      <strong className={`pkpi-val serif num ${tone ?? ''}`}>{value}</strong>
      {sub && <small className="pkpi-sub">{sub}</small>}
      {delta && (
        <small className={`pkpi-delta ${delta.positive ? 'up' : 'dn'}`}>
          {delta.positive ? '▲' : '▼'} {delta.value}
        </small>
      )}
      <style>{`
        .pkpi {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: 14px 16px;
          box-shadow: var(--shadow);
          display: flex; flex-direction: column; gap: 4px;
        }
        .pkpi-lbl {
          font-size: 11px; color: var(--ink-soft); font-weight: 700;
          text-transform: uppercase; letter-spacing: .5px;
        }
        .pkpi-val {
          font-size: 22px; font-weight: 600; color: var(--ink);
          letter-spacing: -.3px; margin-top: 2px;
        }
        .pkpi-val.green { color: var(--green); }
        .pkpi-val.brick { color: var(--brick); }
        .pkpi-sub { font-size: 11.5px; color: var(--ink-soft); }
        .pkpi-delta { font-size: 11.5px; font-weight: 600; }
        .pkpi-delta.up { color: var(--green-2); }
        .pkpi-delta.dn { color: var(--brick); }
      `}</style>
    </div>
  );
}

function SalesHeatmap({ data }: { data: ReturnType<typeof useSalesHeatmap>['data'] }) {
  const days = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya'];
  const matrix = data?.matrix ?? [];
  const max = Math.max(1, ...matrix.map((c) => Number(c.total)));
  const hours = useMemo(() => Array.from({ length: 17 }, (_, i) => i + 7), []);

  const cellFor = (day: number, hour: number) =>
    matrix.find((c) => c.day === day && c.hour === hour) ?? { total: '0', count: 0 };

  if (matrix.every((c) => c.count === 0)) {
    return <EmptyState title="Sotuvlar yo'q" description="Bu davrda hech qanday sotuv qayd etilmagan" />;
  }

  return (
    <div className="hm-wrap">
      <table className="hm">
        <thead>
          <tr>
            <th></th>
            {hours.map((h) => (
              <th key={h} className="num">{String(h).padStart(2, '0')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((dayLabel, day) => (
            <tr key={day}>
              <td className="day-lbl">{dayLabel}</td>
              {hours.map((h) => {
                const c = cellFor(day, h);
                const intensity = Number(c.total) / max;
                return (
                  <td
                    key={h}
                    className="hm-cell"
                    title={c.count > 0 ? `${c.count} sotuv · ${money(c.total)}` : ''}
                    style={{
                      background: c.count > 0
                        ? `rgba(47, 95, 216, ${Math.max(0.08, intensity)})`
                        : 'var(--paper)',
                      color: intensity > 0.5 ? 'var(--paper-2)' : 'var(--ink)',
                    }}
                  >
                    {c.count > 0 ? c.count : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <small className="hm-hint">
        Yacheykadagi raqam — sotuvlar soni. Rang quyuqligi — daromad miqdori.
      </small>
      <style>{`
        .hm-wrap { display: flex; flex-direction: column; gap: 8px; overflow-x: auto; }
        .hm { border-collapse: collapse; font-size: 11px; }
        .hm th, .hm td { padding: 6px 4px; text-align: center; min-width: 28px; }
        .hm th { color: var(--ink-soft); font-weight: 600; }
        .day-lbl {
          color: var(--ink); font-weight: 700;
          padding-right: 10px !important; text-align: right !important;
        }
        .hm-cell {
          font-weight: 600;
          font-family: 'IBM Plex Mono', monospace;
          border: 1px solid var(--paper);
          border-radius: 3px;
        }
        .hm-hint { color: var(--ink-soft); font-size: 11.5px; }
      `}</style>
    </div>
  );
}

function Row({
  label, value, tone, bold, big,
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
