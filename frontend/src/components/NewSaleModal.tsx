import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useCategories } from '../api/products';
import { useCustomers, useCreateCustomer } from '../api/customers';
import { useInventory } from '../api/inventory';
import { useCreateSale, useSalePreview, type CreateSaleItemInput } from '../api/sales';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { money, qty as qtyFmt } from '../lib/format';
import type { InventoryRow, PaymentType } from '../types/api';

interface NewSaleModalProps {
  open: boolean;
  onClose: () => void;
}

interface CartLine {
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  stockRemaining: number;
}

export function NewSaleModal({ open, onClose }: NewSaleModalProps) {
  const toast = useToast();
  const inventory = useInventory();
  const categories = useCategories();
  const customers = useCustomers();
  const createCustomer = useCreateCustomer();
  const preview = useSalePreview();
  const createSale = useCreateSale();

  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'all'>('all');
  const [cart, setCart] = useState<Map<number, CartLine>>(new Map());

  const [paymentType, setPaymentType] = useState<PaymentType>('NAQD');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Inline yangi mijoz formasi
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Modal yopilganda holatni tozalash
  useEffect(() => {
    if (!open) {
      setCart(new Map());
      setSearch('');
      setActiveCategoryId('all');
      setPaymentType('NAQD');
      setCustomerId('');
      setNotes('');
      setNewCustOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      preview.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mahsulot ro'yxati — qidiruv + toifa filtri
  const filteredProducts = useMemo<InventoryRow[]>(() => {
    let list = inventory.data ?? [];
    if (activeCategoryId !== 'all') {
      list = list.filter((p) => p.category.id === activeCategoryId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [inventory.data, activeCategoryId, search]);

  // Cart → preview payload
  const validLines = useMemo<CreateSaleItemInput[]>(
    () =>
      Array.from(cart.values()).map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
    [cart],
  );

  // Live FIFO preview (250ms debounce)
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
  }, [validLines, open]);

  // Cart amallari
  const addToCart = (p: InventoryRow) => {
    const stockN = Number(p.totalRemaining);
    if (stockN <= 0) return;
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(p.productId);
      if (existing) {
        if (existing.quantity >= stockN) return prev;
        next.set(p.productId, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(p.productId, {
          productId: p.productId,
          productName: p.name,
          unit: p.baseUnit,
          quantity: 1,
          unitPrice: p.currentSalePrice ? Number(p.currentSalePrice) : 0,
          stockRemaining: stockN,
        });
      }
      return next;
    });
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      const q = Math.max(0, Math.min(line.quantity + delta, line.stockRemaining));
      if (q === 0) next.delete(productId);
      else next.set(productId, { ...line, quantity: q });
      return next;
    });
  };

  const setQty = (productId: number, value: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      const q = Math.max(0, Math.min(Number(value) || 0, line.stockRemaining));
      if (q === 0) next.delete(productId);
      else next.set(productId, { ...line, quantity: q });
      return next;
    });
  };

  const setPrice = (productId: number, value: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const line = next.get(productId);
      if (!line) return prev;
      next.set(productId, { ...line, unitPrice: Math.max(0, Number(value) || 0) });
      return next;
    });
  };

  const removeLine = (productId: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  };

  // Inline yangi mijoz qo'shish
  const submitNewCustomer = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const c = await createCustomer.mutateAsync({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || undefined,
      });
      setCustomerId(c.id);
      setNewCustOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      toast.success(`Mijoz qo'shildi: ${c.name}`);
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const cartCount = cart.size;
  const totalQty = Array.from(cart.values()).reduce((s, l) => s + l.quantity, 0);
  const cartTotal = preview.data
    ? Number(preview.data.totalAmount)
    : Array.from(cart.values()).reduce((s, l) => s + l.quantity * l.unitPrice, 0);

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
      toast.success(`Sotuv saqlandi · ${money(cartTotal, false)} so'm`);
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yangi sotuv" width={1080}>
      <div className="pos">
        {/* ===== CHAP: Mahsulot katalogi ===== */}
        <div className="pos-left">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Mahsulot nomi yoki shtrix-kod..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')} title="Tozalash">
                ×
              </button>
            )}
          </div>

          <div className="cat-pills">
            <button
              className={`pill ${activeCategoryId === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategoryId('all')}
            >
              Hammasi
            </button>
            {(categories.data ?? []).map((c) => (
              <button
                key={c.id}
                className={`pill ${activeCategoryId === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid">
            {inventory.isLoading && (
              <div className="grid-state"><Spinner /></div>
            )}
            {!inventory.isLoading && filteredProducts.length === 0 && (
              <div className="grid-empty">Mahsulot topilmadi</div>
            )}
            {filteredProducts.map((p) => {
              const stockN = Number(p.totalRemaining);
              const inCart = cart.get(p.productId);
              const outOfStock = stockN <= 0;
              return (
                <button
                  key={p.productId}
                  className={`pcard ${outOfStock ? 'out' : ''} ${inCart ? 'inCart' : ''}`}
                  onClick={() => addToCart(p)}
                  disabled={outOfStock}
                >
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-price num">
                    {p.currentSalePrice ? money(p.currentSalePrice, false) : '—'}
                    <small>so'm</small>
                  </div>
                  <div className={`pcard-stock ${outOfStock ? 'no' : stockN < 5 ? 'low' : ''}`}>
                    {outOfStock ? "qoldiq yo'q" : `${qtyFmt(stockN, p.baseUnit)} mavjud`}
                  </div>
                  {inCart && (
                    <div className="pcard-badge">{inCart.quantity}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== O'NG: Savat + FIFO + To'lov ===== */}
        <div className="pos-right">
          <div className="cart-head">
            <strong>Savat</strong>
            <span className="num">{cartCount} ta · {totalQty}</span>
          </div>

          <div className="cart">
            {cart.size === 0 && (
              <div className="cart-empty">
                <div className="emo">🛒</div>
                <small>Mahsulotlardan tanlang</small>
              </div>
            )}
            {Array.from(cart.values()).map((line) => (
              <div className="cart-line" key={line.productId}>
                <div className="cart-line-top">
                  <div className="cart-name">{line.productName}</div>
                  <button className="cart-rm" onClick={() => removeLine(line.productId)} title="O'chirish">
                    ×
                  </button>
                </div>
                <div className="cart-line-mid">
                  <div className="qty-ctl">
                    <button onClick={() => updateQty(line.productId, -1)} disabled={line.quantity <= 1}>−</button>
                    <input
                      className="qty-input num"
                      value={line.quantity}
                      onChange={(e) => setQty(line.productId, e.target.value)}
                      inputMode="decimal"
                    />
                    <button
                      onClick={() => updateQty(line.productId, 1)}
                      disabled={line.quantity >= line.stockRemaining}
                    >+</button>
                  </div>
                  <span className="x">×</span>
                  <input
                    className="price-input num"
                    value={line.unitPrice}
                    onChange={(e) => setPrice(line.productId, e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="cart-line-total num">
                  = {money(line.quantity * line.unitPrice, false)}
                </div>
              </div>
            ))}
          </div>

          {cart.size > 0 && (
            <div className="fifo">
              <div className="fifo-title">
                <span>FIFO hisob</span>
                {preview.isPending && <small>...</small>}
              </div>
              {preview.data && (
                <>
                  <div className="row"><span>Summa</span><span className="num">{money(preview.data.totalAmount, false)}</span></div>
                  <div className="row"><span>Tannarx</span><span className="num">{money(preview.data.totalCost, false)}</span></div>
                  <div className="row profit">
                    <span>Foyda</span>
                    <span className="num">{money(preview.data.totalProfit, false)}</span>
                  </div>
                </>
              )}
              {preview.isError && (
                <div className="fifo-err">{extractError(preview.error)}</div>
              )}
            </div>
          )}

          <div className="paybar">
            {(['NAQD', 'KARTA', 'NASIYA'] as PaymentType[]).map((p) => (
              <button
                key={p}
                className={`paytab ${paymentType === p ? 'active' : ''}`}
                onClick={() => setPaymentType(p)}
              >
                <span className="ic">{p === 'NAQD' ? '💵' : p === 'KARTA' ? '💳' : '📝'}</span>
                {p === 'NAQD' ? 'Naqd' : p === 'KARTA' ? 'Karta' : 'Nasiya'}
              </button>
            ))}
          </div>

          {paymentType === 'NASIYA' && (
            <div className="cust-block">
              {!newCustOpen ? (
                <>
                  <label className="lbl">Mijoz</label>
                  <div className="cust-row">
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">— tanlang —</option>
                      {(customers.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.phone ? ` · ${c.phone}` : ''}
                        </option>
                      ))}
                    </select>
                    <button className="add-cust" onClick={() => setNewCustOpen(true)} title="Yangi mijoz">
                      + Yangi
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={submitNewCustomer} className="newcust">
                  <div className="newcust-head">
                    <strong>Yangi mijoz</strong>
                    <button type="button" className="cancel" onClick={() => setNewCustOpen(false)}>
                      Bekor
                    </button>
                  </div>
                  <input
                    autoFocus
                    placeholder="Ism (masalan: Karim aka)"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                  />
                  <input
                    placeholder="Telefon (ixt.)"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    inputMode="tel"
                  />
                  <Button type="submit" disabled={!newCustName.trim() || createCustomer.isPending}>
                    {createCustomer.isPending ? 'Saqlanmoqda...' : "Saqlash va tanlash"}
                  </Button>
                </form>
              )}
            </div>
          )}

          <input
            className="notes-input"
            placeholder="Izoh (ixtiyoriy)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button
            className={`save ${canSubmit ? '' : 'disabled'}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {createSale.isPending ? (
              'Saqlanmoqda...'
            ) : (
              <>
                <span>Saqlash</span>
                <strong className="num">{money(cartTotal, false)} so'm</strong>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .pos {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 18px;
          min-height: 480px;
        }
        @media (max-width: 900px) {
          .pos { grid-template-columns: 1fr; }
        }

        .pos-left { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .search-bar {
          display: flex; align-items: center; gap: 9px;
          background: var(--paper-2);
          border: 1px solid var(--line-strong);
          border-radius: 11px;
          padding: 10px 14px;
        }
        .search-bar svg { width: 17px; height: 17px; color: var(--ink-faint); }
        .search-bar input {
          border: none; background: none; outline: none;
          font-family: inherit; font-size: 14px;
          width: 100%; color: var(--ink);
        }
        .clear-btn {
          background: var(--line); border: none; color: var(--ink-soft);
          width: 20px; height: 20px; border-radius: 50%;
          cursor: pointer; font-size: 14px; line-height: 18px;
        }
        .clear-btn:hover { background: var(--brick-soft); color: var(--brick); }

        .cat-pills {
          display: flex; gap: 6px;
          overflow-x: auto; padding-bottom: 4px;
          margin: -4px 0;
        }
        .cat-pills::-webkit-scrollbar { height: 4px; }
        .pill {
          flex-shrink: 0;
          padding: 6px 13px;
          border: 1px solid var(--line);
          background: var(--card);
          color: var(--ink-soft);
          font-size: 12.5px; font-weight: 600;
          border-radius: 16px; cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }
        .pill:hover { color: var(--ink); border-color: var(--line-strong); }
        .pill.active {
          background: var(--green); color: var(--paper-2); border-color: var(--green);
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
          overflow-y: auto;
          max-height: 460px;
          padding: 2px;
        }
        .grid-state, .grid-empty {
          grid-column: 1 / -1;
          padding: 32px;
          text-align: center;
          color: var(--ink-soft);
          font-size: 13.5px;
        }

        .pcard {
          position: relative;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px 12px 10px;
          cursor: pointer;
          font-family: inherit;
          text-align: left;
          display: flex; flex-direction: column; gap: 4px;
          transition: transform .12s, border-color .12s, box-shadow .12s;
        }
        .pcard:hover:not(:disabled) {
          border-color: var(--green-2);
          box-shadow: 0 4px 12px rgba(58, 90, 64, 0.08);
          transform: translateY(-1px);
        }
        .pcard:active:not(:disabled) { transform: translateY(0); }
        .pcard.out {
          opacity: .45; cursor: not-allowed;
          background: var(--paper);
        }
        .pcard.inCart { border-color: var(--green); border-width: 2px; padding: 11px 11px 9px; }
        .pcard-name {
          font-size: 13px; font-weight: 600; color: var(--ink);
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.3; min-height: 33px;
        }
        .pcard-price {
          font-family: 'Fraunces', serif;
          font-size: 18px; font-weight: 600; color: var(--green);
          letter-spacing: -.2px;
        }
        .pcard-price small {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 11px; color: var(--ink-faint); margin-left: 3px;
          font-weight: 400;
        }
        .pcard-stock {
          font-size: 11px; color: var(--ink-soft);
          padding-top: 2px;
        }
        .pcard-stock.low { color: var(--amber); font-weight: 600; }
        .pcard-stock.no { color: var(--brick); }
        .pcard-badge {
          position: absolute; top: -7px; right: -7px;
          background: var(--green); color: var(--paper-2);
          font-size: 11px; font-weight: 700;
          width: 22px; height: 22px; border-radius: 11px;
          display: grid; place-items: center;
          box-shadow: 0 2px 6px rgba(43,38,32,.18);
        }

        .pos-right {
          background: var(--paper-2);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 14px;
          display: flex; flex-direction: column; gap: 11px;
          min-width: 0;
        }
        .cart-head {
          display: flex; justify-content: space-between; align-items: baseline;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--line);
        }
        .cart-head strong { font-family: 'Fraunces', serif; font-size: 16px; }
        .cart-head .num { font-size: 12px; color: var(--ink-soft); }

        .cart {
          display: flex; flex-direction: column; gap: 8px;
          max-height: 280px; overflow-y: auto;
          min-height: 80px;
        }
        .cart-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 22px 14px; color: var(--ink-faint); gap: 6px;
        }
        .cart-empty .emo { font-size: 28px; opacity: .6; }
        .cart-empty small { font-size: 12.5px; }

        .cart-line {
          background: var(--card);
          border-radius: 10px;
          padding: 9px 11px;
          display: flex; flex-direction: column; gap: 5px;
        }
        .cart-line-top { display: flex; align-items: start; gap: 6px; }
        .cart-name {
          flex: 1; font-size: 13px; font-weight: 600; color: var(--ink);
          line-height: 1.3;
        }
        .cart-rm {
          background: none; border: none; color: var(--ink-faint);
          font-size: 18px; cursor: pointer; line-height: 1;
          width: 22px; height: 22px; border-radius: 5px;
        }
        .cart-rm:hover { color: var(--brick); background: var(--brick-soft); }

        .cart-line-mid {
          display: flex; align-items: center; gap: 4px;
          font-size: 12.5px;
        }
        .qty-ctl {
          display: flex; align-items: center;
          border: 1px solid var(--line-strong);
          border-radius: 7px; overflow: hidden;
        }
        .qty-ctl button {
          background: var(--paper-2); border: none;
          width: 24px; height: 28px;
          font-size: 14px; font-weight: 700; color: var(--ink-soft);
          cursor: pointer;
        }
        .qty-ctl button:hover:not(:disabled) { background: var(--paper); color: var(--ink); }
        .qty-ctl button:disabled { opacity: .35; cursor: not-allowed; }
        .qty-input {
          width: 44px; height: 28px;
          border: none; border-left: 1px solid var(--line); border-right: 1px solid var(--line);
          text-align: center; background: var(--card);
          outline: none; font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
        }
        .cart-line-mid .x { color: var(--ink-faint); padding: 0 2px; }
        .price-input {
          flex: 1; min-width: 0;
          height: 28px; padding: 0 8px;
          border: 1px solid var(--line-strong); border-radius: 7px;
          background: var(--paper-2);
          outline: none; font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
        }
        .price-input:focus { border-color: var(--green-2); background: var(--card); }
        .cart-line-total {
          text-align: right;
          font-size: 13.5px; font-weight: 700; color: var(--green);
        }

        .fifo {
          background: var(--green-soft);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12.5px;
        }
        .fifo-title {
          display: flex; justify-content: space-between;
          font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px;
          font-weight: 700; color: var(--green); margin-bottom: 6px;
        }
        .fifo-title small { color: var(--ink-soft); }
        .fifo .row {
          display: flex; justify-content: space-between;
          padding: 2px 0;
        }
        .fifo .row span:first-child { color: var(--ink-soft); }
        .fifo .row.profit {
          margin-top: 4px; padding-top: 6px;
          border-top: 1px dashed #cdd9c5;
          font-weight: 700;
        }
        .fifo .row.profit span:last-child { color: var(--green); }
        .fifo-err {
          color: var(--brick); font-size: 12px;
          padding: 4px 0;
        }

        .paybar {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px;
          background: var(--card);
          padding: 3px;
          border-radius: 11px;
          border: 1px solid var(--line);
        }
        .paytab {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 8px 4px;
          background: transparent; border: none;
          border-radius: 8px; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 600;
          color: var(--ink-soft);
        }
        .paytab .ic { font-size: 18px; }
        .paytab:hover { color: var(--ink); }
        .paytab.active { background: var(--green); color: var(--paper-2); }

        .cust-block { display: flex; flex-direction: column; gap: 5px; }
        .cust-block .lbl {
          font-size: 11px; color: var(--ink-soft); text-transform: uppercase;
          letter-spacing: .4px; font-weight: 600;
        }
        .cust-row { display: flex; gap: 6px; }
        .cust-row select {
          flex: 1; padding: 8px 10px;
          border: 1px solid var(--line-strong);
          border-radius: 8px; background: var(--card);
          font-family: inherit; font-size: 13px;
          outline: none;
        }
        .cust-row select:focus { border-color: var(--green-2); }
        .add-cust {
          background: var(--card);
          border: 1px dashed var(--green-2);
          color: var(--green);
          padding: 0 12px; border-radius: 8px;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          white-space: nowrap;
        }
        .add-cust:hover { background: var(--green-soft); }

        .newcust {
          background: var(--card);
          border: 1px solid var(--green-2);
          border-radius: 10px;
          padding: 11px;
          display: flex; flex-direction: column; gap: 7px;
        }
        .newcust-head {
          display: flex; justify-content: space-between; align-items: baseline;
        }
        .newcust-head strong { font-size: 13px; color: var(--green); }
        .newcust-head .cancel {
          background: none; border: none; color: var(--ink-soft);
          font-size: 12px; cursor: pointer; padding: 0;
        }
        .newcust-head .cancel:hover { color: var(--brick); }
        .newcust input {
          padding: 8px 10px;
          border: 1px solid var(--line-strong);
          border-radius: 7px; background: var(--paper-2);
          font-family: inherit; font-size: 13px; outline: none;
        }
        .newcust input:focus { border-color: var(--green-2); background: var(--card); }

        .notes-input {
          padding: 9px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 8px; background: var(--card);
          font-family: inherit; font-size: 13px; outline: none;
        }
        .notes-input:focus { border-color: var(--green-2); }

        .save {
          background: var(--green); color: var(--paper-2);
          border: none; border-radius: 11px;
          padding: 13px 16px;
          font-family: inherit; font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: flex; justify-content: space-between; align-items: center;
          box-shadow: 0 4px 12px rgba(58,90,64,.18);
          transition: filter .15s, transform .15s;
        }
        .save:hover:not(.disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .save.disabled, .save:disabled {
          background: var(--line-strong); color: var(--ink-faint);
          box-shadow: none; cursor: not-allowed;
        }
        .save strong { font-size: 15px; }
      `}</style>
    </Modal>
  );
}
