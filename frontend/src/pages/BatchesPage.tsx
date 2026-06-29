import { useEffect, useMemo, useState } from 'react';
import { useDeliveries } from '../api/deliveries';
import { useProducts } from '../api/products';
import { useSuppliers } from '../api/suppliers';
import { NewDeliveryModal } from '../components/NewDeliveryModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { FilterBar, FilterSelect, SearchInput, DateRangeField, type SelectOption } from '../components/ui/Filters';
import { Pagination } from '../components/ui/Pagination';
import { Spinner } from '../components/ui/Spinner';
import { StatusPill } from '../components/ui/Tag';
import { StockBar } from '../components/ui/StockBar';
import { date, money } from '../lib/format';
import type { Batch, Delivery } from '../types/api';

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

// Yetkazma holati — ichidagi partiyalarning eng "og'ir" holati bo'yicha
function deliveryStatus(batches: Batch[]): BatchStatus {
  const statuses = batches.map(batchStatus);
  if (statuses.length && statuses.every((s) => s === 'finished')) return 'finished';
  if (statuses.includes('old')) return 'old';
  if (statuses.includes('slow')) return 'slow';
  return 'active';
}

export function BatchesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const deliveries = useDeliveries({});
  const products = useProducts({});
  const suppliers = useSuppliers();

  // Filtrlar (client-side)
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [status, setStatus] = useState<'all' | BatchStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (deliveries.data ?? []).filter((d) => {
      const batches = d.batches ?? [];
      if (supplierId === 'none' && d.supplierId) return false;
      if (supplierId !== 'all' && supplierId !== 'none' && d.supplierId !== Number(supplierId)) return false;
      if (productId !== 'all' && !batches.some((b) => b.productId === Number(productId))) return false;
      if (status !== 'all' && !batches.some((b) => batchStatus(b) === status)) return false;
      const day = d.receivedDate.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (q) {
        const hay = `${d.supplier?.name ?? ''} ${batches.map((b) => b.product?.name ?? '').join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deliveries.data, search, productId, supplierId, status, from, to]);

  // Client-side pagination
  const PAGE_SIZE = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Filtr o'zgarsa 1-sahifaga qaytamiz
  useEffect(() => {
    setPage(1);
  }, [search, productId, supplierId, status, from, to]);
  // Qatorlar kamaysa joriy sahifani diapazonga moslaymiz
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        {deliveries.isLoading ? (
          <div style={{ padding: '32px 24px', textAlign: 'center' }}><Spinner label="Yuklanmoqda..." /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Partiya yo'q"
            description={hasFilter ? 'Filtrga mos partiya topilmadi' : undefined}
          />
        ) : (
          <>
            <div className="dlist">
              {pageItems.map((d) => (
                <DeliveryRow
                  key={d.id}
                  delivery={d}
                  open={expanded.has(d.id)}
                  onToggle={() => toggle(d.id)}
                />
              ))}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onChange={setPage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </Card>

      <NewDeliveryModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <style>{`
        .dlist { display: flex; flex-direction: column; }
      `}</style>
    </div>
  );
}

function DeliveryRow({ delivery: d, open, onToggle }: { delivery: Delivery; open: boolean; onToggle: () => void }) {
  const batches = d.batches ?? [];
  const totalReceived = batches.reduce((s, b) => s + Number(b.quantityReceived), 0);
  const totalRemaining = batches.reduce((s, b) => s + Number(b.quantityRemaining), 0);
  const totalValue = batches.reduce((s, b) => s + Number(b.quantityReceived) * Number(b.costPricePerUnit), 0);
  const st = deliveryStatus(batches);

  return (
    <div className={`drow ${open ? 'open' : ''}`}>
      <button className="dhead" onClick={onToggle}>
        <span className={`chev ${open ? 'open' : ''}`} aria-hidden>▸</span>
        <div className="dmain">
          <strong>{d.supplier?.name ?? "— ta'minotchisiz"}</strong>
          <small>{batches.length} mahsulot · {date(d.receivedDate, true)} · {d.weekLabel}</small>
        </div>
        <div className="dstock">
          <StockBar remaining={totalRemaining} received={totalReceived} />
        </div>
        <div className="dval">
          <span className="num">{money(totalValue, false)}</span>
          <small>so'm</small>
        </div>
        <StatusPill status={st} />
      </button>

      {open && (
        <div className="dbody">
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th style={{ textAlign: 'right' }}>Kirim narxi</th>
                <th>Pachka foydasi</th>
                <th>Qoldiq</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.product?.name}</strong>
                    <small className="muted">#{b.id}</small>
                  </td>
                  <td style={{ textAlign: 'right' }} className="num">{money(b.costPricePerUnit)}</td>
                  <td><PackProfitCell batch={b} /></td>
                  <td><StockBar remaining={Number(b.quantityRemaining)} received={Number(b.quantityReceived)} /></td>
                  <td><StatusPill status={batchStatus(b)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {d.notes && <div className="dnotes">Izoh: {d.notes}</div>}
        </div>
      )}

      <style>{`
        .drow { border-bottom: 1px solid var(--line); }
        .drow:last-child { border-bottom: none; }
        .dhead {
          width: 100%; display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; background: none; border: none; cursor: pointer;
          font-family: inherit; text-align: left;
        }
        .dhead:hover { background: var(--paper-2); }
        .drow.open .dhead { background: var(--paper-2); }
        .chev { color: var(--ink-faint); transition: transform .15s; font-size: 13px; }
        .chev.open { transform: rotate(90deg); }
        .dmain { flex: 1; min-width: 0; }
        .dmain strong { display: block; font-size: 14px; color: var(--ink); }
        .dmain small { display: block; color: var(--ink-soft); font-size: 12px; margin-top: 1px; }
        .dstock { width: 160px; }
        .dval { width: 130px; text-align: right; }
        .dval .num { font-weight: 700; color: var(--ink); }
        .dval small { color: var(--ink-faint); font-size: 11px; margin-left: 3px; }
        .dbody { padding: 4px 18px 16px 40px; background: var(--paper); overflow-x: auto; }
        .dbody table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dbody thead th {
          padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--ink-faint);
          text-transform: uppercase; letter-spacing: .4px; text-align: left; white-space: nowrap;
        }
        .dbody tbody td { padding: 10px 12px; border-top: 1px solid var(--line); vertical-align: middle; }
        .dbody .muted { color: var(--ink-faint); margin-left: 6px; font-weight: 500; }
        .dnotes { margin-top: 10px; font-size: 12px; color: var(--ink-soft); }
        @media (max-width: 720px) {
          .dstock { display: none; }
        }
      `}</style>
    </div>
  );
}

/** Shu partiyaning narxlari bo'yicha 1 pachkadan qancha foyda qolishini ko'rsatadi */
function PackProfitCell({ batch: b }: { batch: Batch }) {
  const ps = b.product?.packSize ? Number(b.product.packSize) : 0;
  const pu = b.product?.packUnit;
  if (!ps || !pu) return <small style={{ color: 'var(--ink-faint)' }}>—</small>;

  const cost = Number(b.costPricePerUnit);
  const pieceSale =
    b.salePricePerUnit != null
      ? Number(b.salePricePerUnit)
      : b.product?.defaultSalePrice != null
        ? Number(b.product.defaultSalePrice)
        : null;
  const packSale =
    b.packSalePrice != null
      ? Number(b.packSalePrice)
      : b.product?.packSalePrice != null
        ? Number(b.product.packSalePrice)
        : null;

  const pieceProfit = pieceSale != null ? (pieceSale - cost) * ps : null;
  const wholeProfit = packSale != null ? packSale - cost * ps : null;

  if (pieceProfit == null && wholeProfit == null) {
    return <small style={{ color: 'var(--ink-faint)' }}>narx yo'q</small>;
  }
  const tone = (v: number) => (v >= 0 ? 'var(--green)' : 'var(--brick)');
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <small style={{ color: 'var(--ink-faint)' }}>1 {pu}:</small>
      {pieceProfit != null && (
        <div>dona: <b className="num" style={{ color: tone(pieceProfit) }}>{money(pieceProfit, false)}</b></div>
      )}
      {wholeProfit != null && (
        <div>butun: <b className="num" style={{ color: tone(wholeProfit) }}>{money(wholeProfit, false)}</b></div>
      )}
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
