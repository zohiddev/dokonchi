import { useEffect, useMemo, useState } from 'react';
import { useCustomers } from '../api/customers';
import { useInventory } from '../api/inventory';
import { useCreateSale, useSalePreview, type CreateSaleItemInput } from '../api/sales';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PaymentTag } from './ui/Tag';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { money, qty } from '../lib/format';
import type { PaymentType } from '../types/api';

interface NewSaleModalProps {
  open: boolean;
  onClose: () => void;
}

interface LineRow {
  id: string; // local key
  productId: number | '';
  quantity: string;
  unitPrice: string;
}

export function NewSaleModal({ open, onClose }: NewSaleModalProps) {
  const toast = useToast();
  const inventory = useInventory();
  const customers = useCustomers();

  const preview = useSalePreview();
  const createSale = useCreateSale();

  const [lines, setLines] = useState<LineRow[]>([
    { id: '1', productId: '', quantity: '', unitPrice: '' },
  ]);
  const [paymentType, setPaymentType] = useState<PaymentType>('NAQD');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Modal yopilganda formani tozalash
  useEffect(() => {
    if (!open) {
      setLines([{ id: '1', productId: '', quantity: '', unitPrice: '' }]);
      setPaymentType('NAQD');
      setCustomerId('');
      setNotes('');
      preview.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const productMap = useMemo(() => {
    const m = new Map<number, { name: string; unit: string; remaining: number; defaultPrice: number | null }>();
    (inventory.data ?? []).forEach((row) => {
      m.set(row.productId, {
        name: row.name,
        unit: row.baseUnit,
        remaining: Number(row.totalRemaining),
        defaultPrice: row.currentSalePrice ? Number(row.currentSalePrice) : null,
      });
    });
    return m;
  }, [inventory.data]);

  const validLines = useMemo<CreateSaleItemInput[]>(
    () =>
      lines
        .filter((l) => l.productId !== '' && l.quantity && l.unitPrice)
        .map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
    [lines],
  );

  // Preview ni jonli yangilash
  useEffect(() => {
    if (!open) return;
    if (validLines.length === 0) {
      preview.reset();
      return;
    }
    const t = setTimeout(() => {
      preview.mutate({
        paymentType,
        customerId: customerId ? Number(customerId) : undefined,
        items: validLines,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validLines, paymentType, customerId, open]);

  const updateLine = (id: string, patch: Partial<LineRow>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: String(Date.now()), productId: '', quantity: '', unitPrice: '' },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const canSubmit =
    validLines.length > 0 &&
    !preview.isError &&
    !createSale.isPending &&
    (paymentType !== 'NASIYA' || customerId !== '');

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await createSale.mutateAsync({
        paymentType,
        customerId: customerId ? Number(customerId) : undefined,
        notes: notes || undefined,
        items: validLines,
      });
      toast.success("Sotuv saqlandi");
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi sotuv"
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createSale.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <div className="sale-form">
        {/* Lines */}
        <div className="lines">
          {lines.map((l, idx) => {
            const product = l.productId ? productMap.get(Number(l.productId)) : undefined;
            return (
              <div key={l.id} className="line">
                <div className="line-num">{idx + 1}</div>
                <div className="line-product">
                  <select
                    value={l.productId}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : '';
                      const p = id ? productMap.get(id) : undefined;
                      updateLine(l.id, {
                        productId: id,
                        unitPrice: p?.defaultPrice ? String(p.defaultPrice) : l.unitPrice,
                      });
                    }}
                  >
                    <option value="">— mahsulot —</option>
                    {(inventory.data ?? []).map((p) => (
                      <option key={p.productId} value={p.productId} disabled={Number(p.totalRemaining) <= 0}>
                        {p.name} ({qty(p.totalRemaining, p.baseUnit)} mavjud)
                      </option>
                    ))}
                  </select>
                  {product && (
                    <small className="line-hint">
                      Omborda: <span className="num">{qty(product.remaining, product.unit)}</span>
                    </small>
                  )}
                </div>
                <input
                  className="qty"
                  inputMode="decimal"
                  placeholder="Miqdor"
                  value={l.quantity}
                  onChange={(e) => updateLine(l.id, { quantity: e.target.value })}
                />
                <input
                  className="price"
                  inputMode="numeric"
                  placeholder="Narx"
                  value={l.unitPrice}
                  onChange={(e) => updateLine(l.id, { unitPrice: e.target.value })}
                />
                <button className="x-btn" onClick={() => removeLine(l.id)} title="O'chirish">×</button>
              </div>
            );
          })}
          <button className="add-line" onClick={addLine}>+ Yana qator qo'shish</button>
        </div>

        {/* FIFO preview */}
        <div className="fifo-block">
          <div className="fifo-title">
            <span>FIFO avtomatik hisoblaydi</span>
            {preview.isPending && <small style={{ color: 'var(--ink-soft)' }}>hisoblanyapti...</small>}
          </div>
          {preview.data && preview.data.items.length > 0 && (
            <>
              <div className="fifo-rows">
                {preview.data.items.map((it) => (
                  <div key={it.productId} className="fifo-row">
                    <strong>{it.productName}</strong>
                    <small>
                      {it.allocations.map((a, i) => (
                        <span key={i} className="num">
                          {a.quantity} × {money(a.costPrice, false)}{i < it.allocations.length - 1 ? ' + ' : ''}
                        </span>
                      ))}
                    </small>
                  </div>
                ))}
              </div>
              <div className="fifo-totals">
                <div><span>Summa:</span> <span className="num">{money(preview.data.totalAmount)}</span></div>
                <div><span>Tannarx:</span> <span className="num">{money(preview.data.totalCost)}</span></div>
                <div className="profit"><span>Foyda:</span> <span className="num">{money(preview.data.totalProfit)}</span></div>
              </div>
            </>
          )}
          {preview.isError && (
            <div className="fifo-err">{extractError(preview.error)}</div>
          )}
          {!preview.data && !preview.isPending && !preview.isError && (
            <div className="fifo-empty">Mahsulot va miqdor kiriting</div>
          )}
        </div>

        {/* Payment + customer */}
        <div className="pay-row">
          <div className="pay-group">
            <label className="pay-label">To'lov turi</label>
            <div className="pay-tabs">
              {(['NAQD', 'KARTA', 'NASIYA'] as PaymentType[]).map((p) => (
                <button
                  key={p}
                  className={paymentType === p ? 'pt active' : 'pt'}
                  onClick={() => setPaymentType(p)}
                >
                  <PaymentTag type={p} />
                </button>
              ))}
            </div>
          </div>
          {paymentType === 'NASIYA' && (
            <div className="pay-group">
              <label className="pay-label">Mijoz</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">— tanlang —</option>
                {(customers.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <input
          className="notes-input"
          placeholder="Izoh (ixtiyoriy)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <style>{`
        .sale-form { display: flex; flex-direction: column; gap: 18px; }
        .lines { display: flex; flex-direction: column; gap: 8px; }
        .line {
          display: grid;
          grid-template-columns: 24px 1fr 100px 120px 28px;
          gap: 8px;
          align-items: start;
        }
        .line-num {
          width: 24px; height: 36px;
          display: grid; place-items: center;
          color: var(--ink-soft); font-size: 12px;
        }
        .line-product { display: flex; flex-direction: column; gap: 3px; }
        .line-product select,
        .line .qty, .line .price,
        .pay-group select, .notes-input {
          padding: 9px 11px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          font-family: inherit;
          outline: none;
        }
        .line-product select:focus, .line .qty:focus, .line .price:focus,
        .pay-group select:focus, .notes-input:focus {
          border-color: var(--green-2); background: var(--card);
        }
        .line .qty, .line .price { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
        .line-hint { font-size: 11.5px; color: var(--ink-soft); padding-left: 2px; }
        .x-btn {
          background: transparent; border: none;
          color: var(--ink-faint); cursor: pointer;
          font-size: 20px; line-height: 1;
          width: 28px; height: 36px; border-radius: 6px;
        }
        .x-btn:hover { color: var(--brick); background: var(--brick-soft); }
        .add-line {
          background: transparent; border: 1px dashed var(--line-strong);
          padding: 8px 12px; border-radius: 9px;
          color: var(--ink-soft); font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: inherit;
        }
        .add-line:hover { color: var(--green); border-color: var(--green-2); }

        .fifo-block {
          background: var(--green-soft);
          border: 1px solid #cdd9c5;
          border-radius: 12px;
          padding: 14px 16px;
        }
        .fifo-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 12.5px; color: var(--green); font-weight: 600;
          text-transform: uppercase; letter-spacing: .4px;
          margin-bottom: 10px;
        }
        .fifo-rows { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
        .fifo-row { display: flex; flex-direction: column; gap: 2px; }
        .fifo-row strong { font-size: 13px; color: var(--ink); font-weight: 600; }
        .fifo-row small { font-size: 12px; color: var(--green); }
        .fifo-totals {
          display: flex; gap: 18px;
          padding-top: 10px;
          border-top: 1px dashed #cdd9c5;
          font-size: 13px;
        }
        .fifo-totals > div { display: flex; gap: 6px; }
        .fifo-totals span:first-child { color: var(--ink-soft); }
        .fifo-totals span:last-child { color: var(--ink); font-weight: 600; }
        .fifo-totals .profit span:last-child { color: var(--green-2); }
        .fifo-err {
          color: var(--brick); font-size: 13px;
          padding: 8px 10px;
          background: var(--brick-soft);
          border-radius: 8px;
        }
        .fifo-empty { color: var(--ink-soft); font-size: 12.5px; font-style: italic; }

        .pay-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
        .pay-group { display: flex; flex-direction: column; gap: 5px; }
        .pay-label { font-size: 12px; color: var(--ink-soft); font-weight: 500; text-transform: uppercase; letter-spacing: .4px; }
        .pay-tabs { display: flex; gap: 6px; }
        .pt {
          background: var(--card); border: 1px solid var(--line);
          padding: 6px 10px; border-radius: 10px;
          cursor: pointer; font-family: inherit;
        }
        .pt.active { border-color: var(--green-2); background: var(--green-soft); }
        .notes-input { width: 100%; }
      `}</style>
    </Modal>
  );
}
