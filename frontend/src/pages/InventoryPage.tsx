import { useMemo, useState } from 'react';
import { useInventory, useInventoryValuation } from '../api/inventory';
import { useSuppliers, useSupplierProducts } from '../api/suppliers';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, SearchableSelect, type SelectOption } from '../components/ui/Filters';
import { money, qty } from '../lib/format';
import type { InventoryRow } from '../types/api';

/** O'rtacha tannarx bo'yicha 1 pachkadan taxminiy foyda (narxlar partiyaga qarab o'zgaradi) */
function PackProfitCell({ row: r }: { row: InventoryRow }) {
  const ps = r.packSize ? Number(r.packSize) : 0;
  const pu = r.packUnit;
  const cost = r.avgCost != null ? Number(r.avgCost) : null;
  if (!ps || !pu || cost == null) return <small style={{ color: 'var(--ink-faint)' }}>—</small>;

  const pieceSale = r.currentSalePrice != null ? Number(r.currentSalePrice) : null;
  const packSale = r.currentPackSalePrice != null ? Number(r.currentPackSalePrice) : null;
  const pieceProfit = pieceSale != null ? (pieceSale - cost) * ps : null;
  const wholeProfit = packSale != null ? packSale - cost * ps : null;
  if (pieceProfit == null && wholeProfit == null) return <small style={{ color: 'var(--ink-faint)' }}>—</small>;

  const tone = (v: number) => (v >= 0 ? 'var(--green)' : 'var(--brick)');
  return (
    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
      <small style={{ color: 'var(--ink-faint)' }}>1 {pu} (taxm.):</small>
      {pieceProfit != null && (
        <div>dona: <b className="num" style={{ color: tone(pieceProfit) }}>{money(pieceProfit, false)}</b></div>
      )}
      {wholeProfit != null && (
        <div>butun: <b className="num" style={{ color: tone(wholeProfit) }}>{money(wholeProfit, false)}</b></div>
      )}
    </div>
  );
}

export function InventoryPage() {
  const inventory = useInventory();
  const valuation = useInventoryValuation();
  const suppliers = useSuppliers();

  // Filtrlar (searchable select)
  const [productId, setProductId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');

  // Ta'minotchi tanlansa — uning yetkazgan mahsulotlari bo'yicha filterlaymiz
  const supplierProducts = useSupplierProducts(supplierId !== 'all' ? Number(supplierId) : null);
  const supplierProductIds = useMemo(
    () => (supplierId !== 'all' ? new Set((supplierProducts.data ?? []).map((p) => p.id)) : null),
    [supplierId, supplierProducts.data],
  );

  const filtered = useMemo(() => {
    return (inventory.data ?? []).filter((r) => {
      if (productId !== 'all' && r.productId !== Number(productId)) return false;
      if (supplierProductIds && !supplierProductIds.has(r.productId)) return false;
      return true;
    });
  }, [inventory.data, productId, supplierProductIds]);

  // Mahsulot select — ombordagi mahsulotlardan
  const productOptions: SelectOption[] = [
    { value: 'all', label: 'Barcha mahsulot' },
    ...(inventory.data ?? []).map((r) => ({ value: String(r.productId), label: r.name })),
  ];
  const supplierOptions: SelectOption[] = [
    { value: 'all', label: "Barcha ta'minotchi" },
    ...(suppliers.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
  ];

  const hasFilter = productId !== 'all' || supplierId !== 'all';
  const clearAll = () => { setProductId('all'); setSupplierId('all'); };
  // Ta'minotchi tanlandi-yu lekin mahsulotlari hali yuklanmoqda
  const supplierLoading = supplierId !== 'all' && supplierProducts.isLoading;

  const columns: Column<InventoryRow>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      render: (r) => (
        <div>
          <strong>{r.name}</strong>
          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>{r.category.name}</small>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Birlik',
      render: (r) => r.baseUnit.toLowerCase(),
      width: '80px',
    },
    {
      key: 'batches',
      header: 'Partiyalar',
      render: (r) => (
        <span className="num" style={{ color: r.activeBatchCount > 0 ? 'var(--ink)' : 'var(--ink-faint)' }}>
          {r.activeBatchCount}
        </span>
      ),
      align: 'center',
      width: '100px',
    },
    {
      key: 'remaining',
      header: 'Qoldiq',
      render: (r) => (
        <span className="num" style={{
          fontWeight: 600,
          color: Number(r.totalRemaining) > 0 ? 'var(--ink)' : 'var(--brick)',
        }}>
          {qty(r.totalRemaining, r.baseUnit)}
        </span>
      ),
      align: 'right',
      width: '130px',
    },
    {
      key: 'avgCost',
      header: "O'rtacha tannarx",
      render: (r) =>
        r.avgCost ? (
          <span className="num">{money(r.avgCost, false)}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
      align: 'right',
      width: '160px',
    },
    {
      key: 'price',
      header: 'Sotuv narxi',
      render: (r) =>
        r.currentSalePrice ? (
          <span className="num">{money(r.currentSalePrice, false)}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
      align: 'right',
      width: '150px',
    },
    {
      key: 'packProfit',
      header: 'Pachka foydasi',
      render: (r) => <PackProfitCell row={r} />,
      align: 'right',
      width: '170px',
    },
  ];

  return (
    <div className="inv-page">
      <div className="inv-summary">
        <Card>
          <CardBody>
            <div className="info-block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <div>
                <strong>FIFO mantiqi</strong>
                <p>
                  Sotuv har doim <strong>eng eski</strong> partiyadan ayriladi.
                  Quyidagi "o'rtacha tannarx" — qoldiqlar bo'yicha vaznli o'rtacha (Σ(qoldiq × tannarx) / Σ qoldiq).
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <div className="value-block">
              <small>OMBOR QIYMATI</small>
              <strong className="serif num">{money(valuation.data?.totalValue ?? 0)}</strong>
              <small>{valuation.data?.batchCount ?? 0} ta faol partiya</small>
            </div>
          </CardBody>
        </Card>
      </div>

      <FilterBar>
        <SearchableSelect
          value={productId}
          onChange={setProductId}
          ariaLabel="Mahsulot"
          options={productOptions}
          placeholder="Mahsulot qidirish..."
        />
        <SearchableSelect
          value={supplierId}
          onChange={setSupplierId}
          ariaLabel="Ta'minotchi"
          options={supplierOptions}
          placeholder="Ta'minotchi qidirish..."
        />
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={supplierLoading ? undefined : filtered}
          rowKey={(r) => r.productId}
          isLoading={inventory.isLoading || supplierLoading}
          emptyTitle="Ombor bo'sh"
          emptyDescription={hasFilter ? 'Filtrga mos mahsulot topilmadi' : undefined}
          resetKey={`${productId}|${supplierId}`}
        />
      </Card>

      <style>{`
        .inv-page { display: flex; flex-direction: column; gap: 16px; }
        .inv-summary { display: grid; grid-template-columns: 1.7fr 1fr; gap: 14px; }
        .info-block {
          display: flex; gap: 12px;
          color: var(--ink-soft);
        }
        .info-block svg {
          width: 22px; height: 22px;
          color: var(--accent); flex-shrink: 0; margin-top: 2px;
        }
        .info-block strong {
          color: var(--ink); font-size: 14px; font-weight: 600;
          display: block; margin-bottom: 3px;
        }
        .info-block p { font-size: 13px; line-height: 1.5; }
        .value-block {
          display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
        }
        .value-block small:first-child {
          font-size: 11.5px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-soft); font-weight: 600;
        }
        .value-block strong {
          font-size: 26px; color: var(--accent); letter-spacing: -.3px;
        }
        .value-block small:last-child { color: var(--ink-faint); font-size: 12px; }
        @media (max-width: 880px) {
          .inv-summary { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
