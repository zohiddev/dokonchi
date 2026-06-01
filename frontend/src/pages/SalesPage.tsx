import { useState } from 'react';
import { useSales } from '../api/sales';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterTabs } from '../components/ui/FilterTabs';
import { PaymentTag } from '../components/ui/Tag';
import { useNewSale } from '../components/NewSaleContext';
import { dateTime, money } from '../lib/format';
import type { PaymentType, Sale } from '../types/api';

type PayFilter = 'ALL' | PaymentType;

export function SalesPage() {
  const { open } = useNewSale();
  const [payFilter, setPayFilter] = useState<PayFilter>('ALL');
  const sales = useSales({
    paymentType: payFilter === 'ALL' ? undefined : payFilter,
    limit: 100,
  });

  const columns: Column<Sale>[] = [
    {
      key: 'date',
      header: 'Vaqt',
      render: (s) => <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{dateTime(s.saleDate)}</span>,
      width: '150px',
    },
    {
      key: 'items',
      header: 'Mahsulotlar',
      render: (s) =>
        (s.items ?? []).map((i) => (
          <div key={i.id} style={{ fontSize: 13 }}>
            {i.product?.name}
            <span style={{ color: 'var(--ink-soft)' }}> × <span className="num">{i.quantity}</span></span>
          </div>
        )),
    },
    {
      key: 'customer',
      header: 'Mijoz',
      render: (s) => s.customer?.name ?? <small style={{ color: 'var(--ink-faint)' }}>—</small>,
      width: '140px',
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
      key: 'cost',
      header: 'Tannarx',
      render: (s) => <span className="num" style={{ color: 'var(--ink-soft)' }}>{money(s.totalCost)}</span>,
      align: 'right',
      width: '150px',
    },
    {
      key: 'profit',
      header: 'Foyda',
      render: (s) => {
        const p = Number(s.totalAmount) - Number(s.totalCost);
        return <span className="num" style={{ color: p > 0 ? 'var(--green-2)' : 'var(--ink-soft)', fontWeight: 600 }}>{money(p)}</span>;
      },
      align: 'right',
      width: '160px',
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <FilterTabs<PayFilter>
          value={payFilter}
          onChange={setPayFilter}
          options={[
            { value: 'ALL', label: 'Barchasi' },
            { value: 'NAQD', label: 'Naqd' },
            { value: 'KARTA', label: 'Karta' },
            { value: 'NASIYA', label: 'Nasiya' },
          ]}
        />
        <Button onClick={open} icon={<IconPlus />}>
          Yangi sotuv
        </Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={sales.data}
          rowKey={(s) => s.id}
          isLoading={sales.isLoading}
          emptyTitle="Sotuvlar yo'q"
        />
      </Card>

      <style>{`
        .page-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
