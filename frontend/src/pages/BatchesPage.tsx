import { useMemo, useState } from 'react';
import { useBatches } from '../api/batches';
import { useProducts } from '../api/products';
import { useSuppliers } from '../api/suppliers';
import { NewBatchModal } from '../components/NewBatchModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchInput, DateRangeField, type SelectOption } from '../components/ui/Filters';
import { StatusPill } from '../components/ui/Tag';
import { StockBar } from '../components/ui/StockBar';
import { date, money } from '../lib/format';
import type { Batch } from '../types/api';

type BatchStatus = 'active' | 'slow' | 'old' | 'finished';

function batchStatus(b: Batch): BatchStatus {
  const rem = Number(b.quantityRemaining);
  const recv = Number(b.quantityReceived);
  if (rem <= 0) return 'finished';
  const age = (Date.now() - new Date(b.receivedDate).getTime()) / (1000 * 60 * 60 * 24);
  const ratio = recv > 0 ? rem / recv : 0;
  if (age > 21 && ratio < 0.3) return 'old';
  if (age > 14) return 'slow';
  return 'active';
}

export function BatchesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const batches = useBatches({});
  const products = useProducts({});
  const suppliers = useSuppliers();

  // Filtrlar (client-side)
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [status, setStatus] = useState<'all' | BatchStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (batches.data ?? []).filter((b) => {
      if (productId !== 'all' && b.productId !== Number(productId)) return false;
      if (supplierId === 'none' && b.supplierId) return false;
      if (supplierId !== 'all' && supplierId !== 'none' && b.supplierId !== Number(supplierId)) return false;
      if (status !== 'all' && batchStatus(b) !== status) return false;
      const day = b.receivedDate.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (q) {
        const hay = `${b.product?.name ?? ''} ${b.supplier?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [batches.data, search, productId, supplierId, status, from, to]);

  const productOptions: SelectOption[] = [
    { value: 'all', label: 'Barcha mahsulot' },
    ...(products.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
  ];
  const supplierOptions: SelectOption[] = [
    { value: 'all', label: "Barcha ta'minotchi" },
    { value: 'none', label: "Ta'minotchisiz" },
    ...(suppliers.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const hasFilter = !!(search || productId !== 'all' || supplierId !== 'all' || status !== 'all' || from || to);
  const clearAll = () => {
    setSearch(''); setProductId('all'); setSupplierId('all'); setStatus('all'); setFrom(''); setTo('');
  };

  const columns: Column<Batch>[] = [
    {
      key: 'id',
      header: '№',
      render: (b) => <span className="num" style={{ color: 'var(--ink-soft)' }}>#{b.id}</span>,
      width: '60px',
    },
    {
      key: 'product',
      header: 'Mahsulot',
      render: (b) => (
        <div>
          <strong>{b.product?.name}</strong>
          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>
            {b.supplier?.name ?? "— ta'minotchi yo'q"}
          </small>
        </div>
      ),
    },
    {
      key: 'week',
      header: 'Hafta',
      render: (b) => (
        <div>
          <span className="num" style={{ fontSize: 12.5 }}>{b.weekLabel}</span>
          <small style={{ display: 'block', color: 'var(--ink-faint)' }}>{date(b.receivedDate, true)}</small>
        </div>
      ),
      width: '120px',
    },
    {
      key: 'cost',
      header: 'Kirim narxi',
      render: (b) => <span className="num">{money(b.costPricePerUnit)}</span>,
      align: 'right',
      width: '140px',
    },
    {
      key: 'stock',
      header: 'Qoldiq',
      render: (b) => (
        <StockBar remaining={Number(b.quantityRemaining)} received={Number(b.quantityReceived)} />
      ),
      width: '180px',
    },
    {
      key: 'status',
      header: 'Holat',
      render: (b) => <StatusPill status={batchStatus(b)} />,
      width: '100px',
    },
  ];

  return (
    <div>
      <FilterBar
        action={
          <Button onClick={() => setModalOpen(true)} icon={<IconPlus />}>
            Yangi partiya
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Mahsulot yoki ta'minotchi..." />
        <FilterSelect value={productId} onChange={setProductId} ariaLabel="Mahsulot" options={productOptions} />
        <FilterSelect value={supplierId} onChange={setSupplierId} ariaLabel="Ta'minotchi" options={supplierOptions} />
        <FilterSelect
          value={status}
          onChange={(v) => setStatus(v as 'all' | BatchStatus)}
          ariaLabel="Holat"
          options={[
            { value: 'all', label: 'Barcha holat' },
            { value: 'active', label: 'Sotilyapti' },
            { value: 'slow', label: 'Sekin' },
            { value: 'old', label: 'Eski' },
            { value: 'finished', label: 'Tugagan' },
          ]}
        />
        <DateRangeField
          from={from}
          to={to}
          onChange={(f, t) => { setFrom(f); setTo(t); }}
        />
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(b) => b.id}
          isLoading={batches.isLoading}
          emptyTitle="Partiya yo'q"
          emptyDescription={hasFilter ? 'Filtrga mos partiya topilmadi' : undefined}
          resetKey={`${search}|${productId}|${supplierId}|${status}|${from}|${to}`}
        />
      </Card>

      <NewBatchModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
