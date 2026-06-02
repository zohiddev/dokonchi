import { Link } from 'react-router-dom';
import { useBatchAttention } from '../api/batches';
import { useSales } from '../api/sales';
import { useDashboard, useSalesTimeseries } from '../api/reports';
import { Card, CardBody, CardHead } from '../components/ui/Card';
import { SimpleBarChart } from '../components/ui/Charts';
import { DataTable, type Column } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { KpiCard } from '../components/ui/KpiCard';
import { PaymentTag, Tag } from '../components/ui/Tag';
import { money, qty, time } from '../lib/format';
import type { Batch, Sale } from '../types/api';

export function DashboardPage() {
  const dashboard = useDashboard();
  const timeseries = useSalesTimeseries('week');
  const attention = useBatchAttention();
  const recentSales = useSales({ limit: 5 });

  const d = dashboard.data;

  const recentColumns: Column<Sale>[] = [
    {
      key: 'time',
      header: 'Vaqt',
      render: (s) => <span className="num" style={{ color: 'var(--ink-soft)' }}>{time(s.saleDate)}</span>,
      width: '80px',
    },
    {
      key: 'items',
      header: 'Mahsulot',
      render: (s) => (s.items ?? []).map((i) => i.product?.name ?? '—').join(', ') || '—',
    },
    {
      key: 'pay',
      header: "To'lov",
      render: (s) => <PaymentTag type={s.paymentType} />,
      width: '90px',
    },
    {
      key: 'amount',
      header: 'Summa',
      render: (s) => <span className="num">{money(s.totalAmount)}</span>,
      align: 'right',
      width: '150px',
    },
    {
      key: 'profit',
      header: 'Foyda',
      render: (s) => {
        const p = Number(s.totalAmount) - Number(s.totalCost);
        return <span className="num" style={{ color: p > 0 ? 'var(--green-2)' : 'var(--ink-soft)' }}>{money(p)}</span>;
      },
      align: 'right',
      width: '150px',
    },
  ];

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
          label="Bu hafta foyda"
          value={money(d?.thisWeek.profit ?? 0, false)}
        />
        <KpiCard
          tone="brick"
          icon={<IconCard />}
          label="Jami nasiya"
          value={money(d?.debts.totalDebt ?? 0, false)}
        />
        <KpiCard
          tone="amber"
          icon={<IconBox />}
          label="Ombor qiymati"
          value={money(d?.inventory.totalValue ?? 0, false)}
        />
      </div>

      {/* Grafik + Diqqat talab */}
      <div className="row-2">
        <Card>
          <CardHead title="Haftalik savdo" subtitle="So'nggi 7 kun" />
          <CardBody>
            {timeseries.data && (
              <SimpleBarChart
                data={timeseries.data.map((p) => ({ label: p.label, value: Number(p.total) }))}
                height={210}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title="Diqqat talab"
            subtitle="Eski va kam qolgan partiyalar"
          />
          <CardBody>
            {attention.data && attention.data.length > 0 ? (
              <ul className="attention-list">
                {attention.data.map((b: Batch) => (
                  <li key={b.id}>
                    <div className="row">
                      <strong>{b.product?.name}</strong>
                      <Tag tone={Number(b.remainingRatio ?? 0) < 0.15 ? 'brick' : 'amber'}>
                        {Math.round((b.remainingRatio ?? 0) * 100)}%
                      </Tag>
                    </div>
                    <small>
                      Qoldiq: <span className="num">{qty(b.quantityRemaining, b.product?.baseUnit)}</span>
                      {' · '}
                      <span className="num">{b.ageDays} kun</span> eski
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                title="Hammasi yaxshi"
                description="Hozircha diqqat talab partiyalar yo'q"
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* So'nggi sotuvlar */}
      <Card>
        <CardHead
          title="So'nggi sotuvlar"
          right={
            <Link to="/sales" className="link-more">
              Barchasini ko'rish →
            </Link>
          }
        />
        <DataTable
          columns={recentColumns}
          data={recentSales.data}
          rowKey={(s) => s.id}
          isLoading={recentSales.isLoading}
          emptyTitle="Sotuvlar yo'q"
          compact
        />
      </Card>

      <style>{`
        .dashboard { display: flex; flex-direction: column; gap: 18px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .row-2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 14px; }
        .attention-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
        .attention-list li { padding-bottom: 11px; border-bottom: 1px dashed var(--line); }
        .attention-list li:last-child { border-bottom: none; padding-bottom: 0; }
        .attention-list .row { display: flex; align-items: center; gap: 8px; }
        .attention-list .row strong { flex: 1; font-size: 13.5px; font-weight: 600; }
        .attention-list small { font-size: 12px; color: var(--ink-soft); }
        .link-more {
          color: var(--green-2); font-size: 13px; font-weight: 600;
        }
        .link-more:hover { color: var(--green); }
        @media (max-width: 960px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .row-2 { grid-template-columns: 1fr; }
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
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
    </svg>
  );
}
