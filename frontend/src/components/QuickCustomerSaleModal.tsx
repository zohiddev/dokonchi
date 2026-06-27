import { useMemo, useState } from 'react';
import { useCustomers } from '../api/customers';
import { useInventory } from '../api/inventory';
import { useCreateSale, type CreateSaleItemInput } from '../api/sales';
import { CustomerSearchSelect, type PickableCustomer } from './CustomerSearchSelect';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { formatThousands, money, parseAmount, qty as qtyFmt } from '../lib/format';
import type { InventoryRow, PaymentType } from '../types/api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Berilsa — mijoz oldindan biriktiriladi va qidiruv ko'rsatilmaydi (mijoz sahifasi uchun) */
  lockedCustomer?: PickableCustomer | null;
}

interface Line {
  productId: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  stock: number;
}

/**
 * Tezkor amal: mijozga tovar sotish. Mijozni qidirib tanlab, sotiladigan tovarlarni
 * yozib saqlanadi — sotuv shu mijozga biriktiriladi (har qanday to'lov turida).
 * To'liq POS (FIFO/chek) emas — sodda variant.
 */
export function QuickCustomerSaleModal({ open, onClose, lockedCustomer }: Props) {
  const toast = useToast();
  const customers = useCustomers();
  const inventory = useInventory();
  const createSale = useCreateSale();

  const [selected, setSelected] = useState<PickableCustomer | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('NAQD');
  const [lines, setLines] = useState<Map<number, Line>>(new Map());
  const [search, setSearch] = useState('');

  // Sobit mijoz berilsa (mijoz sahifasi) — har doim o'sha mijoz; aks holda tanlangan mijoz
  const activeCustomer = lockedCustomer ?? selected;

  const items: PickableCustomer[] = (customers.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
  }));

  const matches = useMemo<InventoryRow[]>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (inventory.data ?? [])
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [inventory.data, search]);

  const reset = () => {
    setSelected(null);
    setPaymentType('NAQD');
    setLines(new Map());
    setSearch('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const addProduct = (p: InventoryRow) => {
    const stock = Number(p.totalRemaining);
    if (stock <= 0) return;
    setLines((prev) => {
      const next = new Map(prev);
      const existing = next.get(p.productId);
      if (existing) {
        if (existing.quantity < stock) {
          next.set(p.productId, { ...existing, quantity: existing.quantity + 1 });
        }
      } else {
        next.set(p.productId, {
          productId: p.productId,
          name: p.name,
          unit: p.baseUnit,
          quantity: 1,
          unitPrice: p.currentSalePrice ? Number(p.currentSalePrice) : 0,
          stock,
        });
      }
      return next;
    });
    setSearch('');
  };

  const updateQty = (productId: number, value: string) => {
    setLines((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      const q = Math.max(0, Math.min(Number(value) || 0, line.stock));
      if (q === 0) next.delete(productId);
      else next.set(productId, { ...line, quantity: q });
      return next;
    });
  };

  const stepQty = (productId: number, delta: number) => {
    setLines((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      const q = Math.max(0, Math.min(line.quantity + delta, line.stock));
      if (q === 0) next.delete(productId);
      else next.set(productId, { ...line, quantity: q });
      return next;
    });
  };

  const setPrice = (productId: number, value: string) => {
    setLines((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      next.set(productId, { ...line, unitPrice: Math.max(0, parseAmount(value)) });
      return next;
    });
  };

  const removeLine = (productId: number) => {
    setLines((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

  const lineList = Array.from(lines.values());
  const total = lineList.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const canSubmit = !!activeCustomer && lineList.length > 0 && !createSale.isPending;

  const submit = async () => {
    if (!canSubmit || !activeCustomer) return;
    const payload: CreateSaleItemInput[] = lineList.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    }));
    try {
      await createSale.mutateAsync({
        paymentType,
        customerId: activeCustomer.id,
        items: payload,
      });
      toast.success(`Sotuv saqlandi — ${activeCustomer.name} · ${money(total, false)} so'm`);
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Mijozga sotish"
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {createSale.isPending
              ? 'Saqlanmoqda...'
              : `Saqlash · ${money(total, false)} so'm`}
          </Button>
        </>
      }
    >
      <div className="qsale">
        <label className="qsale-lbl">Mijoz</label>
        {lockedCustomer ? (
          <div className="qsale-locked">
            <strong>{lockedCustomer.name}</strong>
            {lockedCustomer.phone && <small className="num">{lockedCustomer.phone}</small>}
          </div>
        ) : (
          <CustomerSearchSelect
            items={items}
            selected={selected}
            onSelect={setSelected}
            isLoading={customers.isLoading}
            placeholder="Mijoz ismini yozing..."
            autoFocus
          />
        )}

        {activeCustomer && (
          <>
            <div className="qsale-section">
              <label className="qsale-lbl">Tovar qo'shish</label>
              <div className="qsale-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mahsulot nomini yozing..."
                />
              </div>
              {matches.length > 0 && (
                <div className="qsale-matches">
                  {matches.map((p) => {
                    const stock = Number(p.totalRemaining);
                    const out = stock <= 0;
                    return (
                      <button
                        key={p.productId}
                        type="button"
                        className={`qsale-match ${out ? 'out' : ''}`}
                        onClick={() => addProduct(p)}
                        disabled={out}
                      >
                        <span className="qsale-match-name">{p.name}</span>
                        <span className="qsale-match-meta num">
                          {p.currentSalePrice ? money(p.currentSalePrice, false) : '—'}
                          <small>{out ? "qoldiq yo'q" : `${qtyFmt(stock, p.baseUnit)}`}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="qsale-lines">
              {lineList.length === 0 && (
                <div className="qsale-empty">Hali tovar qo'shilmadi</div>
              )}
              {lineList.map((l) => (
                <div className="qsale-line" key={l.productId}>
                  <div className="qsale-line-top">
                    <span className="qsale-line-name">{l.name}</span>
                    <button
                      type="button"
                      className="qsale-rm"
                      onClick={() => removeLine(l.productId)}
                      title="O'chirish"
                    >
                      ×
                    </button>
                  </div>
                  <div className="qsale-line-ctl">
                    <div className="qty-ctl">
                      <button type="button" onClick={() => stepQty(l.productId, -1)} disabled={l.quantity <= 1}>−</button>
                      <input
                        className="qty-input num"
                        value={l.quantity}
                        onChange={(e) => updateQty(l.productId, e.target.value)}
                        inputMode="decimal"
                      />
                      <button type="button" onClick={() => stepQty(l.productId, 1)} disabled={l.quantity >= l.stock}>+</button>
                    </div>
                    <span className="x">×</span>
                    <input
                      className="price-input num"
                      value={formatThousands(l.unitPrice)}
                      onChange={(e) => setPrice(l.productId, e.target.value)}
                      inputMode="numeric"
                    />
                    <span className="qsale-line-total num">= {money(l.quantity * l.unitPrice, false)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="paybar">
              {(['NAQD', 'KARTA', 'NASIYA'] as PaymentType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`paytab ${paymentType === p ? 'active' : ''}`}
                  onClick={() => setPaymentType(p)}
                >
                  <span className="ic">{p === 'NAQD' ? '💵' : p === 'KARTA' ? '💳' : '📝'}</span>
                  {p === 'NAQD' ? 'Naqd' : p === 'KARTA' ? 'Karta' : 'Nasiya'}
                </button>
              ))}
            </div>
            {paymentType === 'NASIYA' && (
              <small className="qsale-hint">
                Nasiya: bu summa <strong>{activeCustomer.name}</strong> qarziga yoziladi.
              </small>
            )}
          </>
        )}
      </div>

      <style>{`
        .qsale { display: flex; flex-direction: column; gap: 13px; }
        .qsale-lbl {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .qsale-locked {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px;
          background: var(--accent-soft, var(--paper-2));
          border: 1px solid var(--accent);
          border-radius: 11px;
        }
        .qsale-locked strong { font-size: 14px; color: var(--ink); font-weight: 600; }
        .qsale-locked small { font-size: 12px; color: var(--ink-soft); }
        .qsale-section { display: flex; flex-direction: column; gap: 7px; }
        .qsale-search {
          display: flex; align-items: center; gap: 9px;
          background: var(--paper-2);
          border: 1px solid var(--line-strong);
          border-radius: 11px;
          padding: 10px 14px;
        }
        .qsale-search svg { width: 17px; height: 17px; color: var(--ink-faint); flex-shrink: 0; }
        .qsale-search input {
          border: none; background: none; outline: none;
          font-family: inherit; font-size: 14px; width: 100%; color: var(--ink);
        }
        .qsale-matches {
          display: flex; flex-direction: column;
          border: 1px solid var(--line); border-radius: 11px;
          overflow: hidden; background: var(--card);
        }
        .qsale-match {
          display: flex; align-items: center; gap: 10px; justify-content: space-between;
          padding: 10px 13px; background: none; border: none;
          border-bottom: 1px solid var(--line);
          cursor: pointer; font-family: inherit; text-align: left; width: 100%;
        }
        .qsale-match:last-child { border-bottom: none; }
        .qsale-match:hover:not(:disabled) { background: var(--paper-2); }
        .qsale-match.out { opacity: .5; cursor: not-allowed; }
        .qsale-match-name { font-size: 13.5px; font-weight: 600; color: var(--ink); }
        .qsale-match-meta {
          display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
          font-size: 13px; color: var(--green); font-weight: 600;
        }
        .qsale-match-meta small { font-size: 10.5px; color: var(--ink-soft); font-weight: 400; }

        .qsale-lines { display: flex; flex-direction: column; gap: 8px; }
        .qsale-empty {
          padding: 16px; text-align: center; color: var(--ink-faint);
          font-size: 12.5px; border: 1px dashed var(--line-strong); border-radius: 11px;
        }
        .qsale-line {
          background: var(--paper-2); border: 1px solid var(--line);
          border-radius: 10px; padding: 9px 11px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .qsale-line-top { display: flex; align-items: start; gap: 6px; }
        .qsale-line-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--ink); }
        .qsale-rm {
          background: none; border: none; color: var(--ink-faint);
          font-size: 18px; cursor: pointer; line-height: 1;
          width: 22px; height: 22px; border-radius: 5px;
        }
        .qsale-rm:hover { color: var(--brick); background: var(--brick-soft); }
        .qsale-line-ctl { display: flex; align-items: center; gap: 6px; font-size: 12.5px; }
        .qty-ctl {
          display: flex; align-items: center;
          border: 1px solid var(--line-strong); border-radius: 7px; overflow: hidden;
        }
        .qty-ctl button {
          background: var(--card); border: none; width: 26px; height: 30px;
          font-size: 15px; font-weight: 700; color: var(--ink-soft); cursor: pointer;
        }
        .qty-ctl button:hover:not(:disabled) { background: var(--paper); color: var(--ink); }
        .qty-ctl button:disabled { opacity: .35; cursor: not-allowed; }
        .qty-input {
          width: 44px; height: 30px;
          border: none; border-left: 1px solid var(--line); border-right: 1px solid var(--line);
          text-align: center; background: var(--card); outline: none;
          font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
        }
        .qsale-line-ctl .x { color: var(--ink-faint); }
        .price-input {
          width: 96px; height: 30px; padding: 0 8px;
          border: 1px solid var(--line-strong); border-radius: 7px; background: var(--card);
          outline: none; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px;
        }
        .price-input:focus { border-color: var(--accent); }
        .qsale-line-total {
          flex: 1; text-align: right; font-size: 13px; font-weight: 700; color: var(--green);
        }

        .paybar {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;
          background: var(--paper-2); padding: 3px; border-radius: 11px;
          border: 1px solid var(--line);
        }
        .paytab {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 8px 4px; background: transparent; border: none;
          border-radius: 8px; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 600; color: var(--ink-soft);
        }
        .paytab .ic { font-size: 18px; }
        .paytab:hover { color: var(--ink); }
        .paytab.active { background: var(--accent); color: var(--paper-2); }
        .qsale-hint { font-size: 12px; color: var(--ink-soft); }
        .qsale-hint strong { color: var(--brick); }
      `}</style>
    </Modal>
  );
}
