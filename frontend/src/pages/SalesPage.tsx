import { useState } from 'react';
import { useSales } from '../api/sales';
import { useCustomers } from '../api/customers';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchableSelect, DateRangeField, type SelectOption } from '../components/ui/Filters';
import { Pagination } from '../components/ui/Pagination';
import { PaymentTag } from '../components/ui/Tag';
import { useNewSale } from '../components/NewSaleContext';
import { dateTime, money } from '../lib/format';
import type { PaymentType, Sale } from '../types/api';

const PAGE_SIZE = 15;

export function SalesPage() {
  const { open } = useNewSale();
  const customers = useCustomers();

  const [payFilter, setPayFilter] = useState<PaymentType | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const hasFilter = !!(payFilter || customerId || from || to);
  const reset1 = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const clearAll = () => { setPayFilter(''); setCustomerId(''); setFrom(''); setTo(''); setPage(1); };

  const sales = useSales({
    paymentType: payFilter || undefined,
    customerId: customerId ? Number(customerId) : undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const total = sales.data?.total ?? 0;

  const customerOptions: SelectOption[] = [
    { value: '', label: 'Barcha mijoz' },
    ...(customers.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const columns: Column<Sale>[] = [
    {
      key: 'date',
      header: 'Vaqt',
      render: (s) => <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{dateTime(s.saleDate)}</span>,
      footer: () => 'Jami',
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
      footer: (rows) => {
        const sum = rows.reduce((acc, s) => acc + Number(s.totalAmount), 0);
        return <span className="num">{money(sum)}</span>;
      },
      align: 'right',
      width: '150px',
    },
    {
      key: 'cost',
      header: 'Tannarx',
      render: (s) => <span className="num" style={{ color: 'var(--ink-soft)' }}>{money(s.totalCost)}</span>,
      footer: (rows) => {
        const sum = rows.reduce((acc, s) => acc + Number(s.totalCost), 0);
        return <span className="num" style={{ color: 'var(--ink-soft)' }}>{money(sum)}</span>;
      },
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
      footer: (rows) => {
        const p = rows.reduce((acc, s) => acc + (Number(s.totalAmount) - Number(s.totalCost)), 0);
        return <span className="num" style={{ color: p > 0 ? 'var(--green-2)' : 'var(--ink-soft)' }}>{money(p)}</span>;
      },
      align: 'right',
      width: '160px',
    },
  ];

  return (
    <div>
      <FilterBar
        action={
          <Button onClick={open} icon={<IconPlus />}>
            Yangi sotuv
          </Button>
        }
      >
        <FilterSelect
          value={payFilter}
          onChange={reset1((v) => setPayFilter(v as PaymentType | ''))}
          ariaLabel="To'lov turi"
          options={[
            { value: '', label: "Barcha to'lov" },
            { value: 'NAQD', label: 'Naqd' },
            { value: 'KARTA', label: 'Karta' },
            { value: 'NASIYA', label: 'Nasiya' },
          ]}
        />
        <SearchableSelect
          value={customerId}
          onChange={reset1(setCustomerId)}
          ariaLabel="Mijoz"
          options={customerOptions}
          placeholder="Mijoz qidirish..."
        />
        <DateRangeField
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }}
        />
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>
        )}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={sales.data?.items}
          rowKey={(s) => s.id}
          isLoading={sales.isLoading}
          emptyTitle="Sotuvlar yo'q"
          emptyDescription={hasFilter ? "Filtrga mos sotuv topilmadi" : undefined}
          pageSize={false}
        />
        <Pagination
          page={page}
          pageCount={Math.ceil(total / PAGE_SIZE)}
          onChange={setPage}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </Card>
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
