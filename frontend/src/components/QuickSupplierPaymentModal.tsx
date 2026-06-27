import { useState } from 'react';
import { useSuppliers, usePaySupplier } from '../api/suppliers';
import { CustomerSearchSelect, type PickableCustomer } from './CustomerSearchSelect';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { formatThousands, money, parseAmount } from '../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Tezkor amal: ta'minotchiga qarzimizni to'lash — qidirib topib, summani kiritib to'lash.
 * Faqat qarzimiz bor ta'minotchilar ro'yxatda chiqadi (balance > 0).
 */
export function QuickSupplierPaymentModal({ open, onClose }: Props) {
  const toast = useToast();
  const suppliers = useSuppliers();
  const paySupplier = usePaySupplier();

  const [selected, setSelected] = useState<PickableCustomer | null>(null);
  const [balance, setBalance] = useState('0');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const debtors = (suppliers.data ?? []).filter((s) => Number(s.balance ?? 0) > 0);
  const items: PickableCustomer[] = debtors.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    meta: (
      <span className="num" style={{ color: 'var(--brick)', fontWeight: 600, fontSize: 12.5 }}>
        {money(s.balance ?? 0, false)}
      </span>
    ),
  }));

  const reset = () => {
    setSelected(null);
    setBalance('0');
    setAmount('');
    setNotes('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSelect = (c: PickableCustomer | null) => {
    setSelected(c);
    if (c) {
      const s = debtors.find((x) => x.id === c.id);
      setBalance(s?.balance ?? '0');
      setAmount(s?.balance ? formatThousands(s.balance) : '');
    }
  };

  const submit = async () => {
    if (!selected) return;
    const amt = parseAmount(amount);
    if (amt <= 0) {
      toast.error('Summani kiriting');
      return;
    }
    try {
      await paySupplier.mutateAsync({
        supplierId: selected.id,
        amount: amt,
        notes: notes.trim() || undefined,
      });
      toast.success(`To'lov saqlandi — ${selected.name}`);
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Ta'minotchiga to'lov"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={submit} disabled={!selected || paySupplier.isPending}>
            {paySupplier.isPending ? 'Saqlanmoqda...' : "To'lash"}
          </Button>
        </>
      }
    >
      <div className="qsp">
        <label className="qsp-lbl">Ta'minotchi</label>
        <CustomerSearchSelect
          items={items}
          selected={selected}
          onSelect={handleSelect}
          isLoading={suppliers.isLoading}
          emptyText="Qarzimiz bor ta'minotchi topilmadi"
          placeholder="Ta'minotchi nomini yozing..."
          autoFocus
        />

        {selected && (
          <>
            <div className="qsp-balance">
              <span>Bizning qarz:</span>
              <strong className="num">{money(balance)}</strong>
            </div>

            <label className="qsp-field">
              <span>To'lov summasi (so'm)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(formatThousands(e.target.value))}
                inputMode="numeric"
                placeholder="1 000 000"
                autoFocus
              />
            </label>

            <label className="qsp-field">
              <span>Izoh (ixtiyoriy)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tafsilot" />
            </label>
          </>
        )}
      </div>

      <style>{`
        .qsp { display: flex; flex-direction: column; gap: 13px; }
        .qsp-lbl, .qsp-field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .qsp-balance {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 13px; background: var(--brick-soft);
          border-radius: 10px; font-size: 13px;
        }
        .qsp-balance strong { color: var(--brick); }
        .qsp-field { display: flex; flex-direction: column; gap: 5px; }
        .qsp-field input {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          outline: none; font-family: inherit; color: var(--ink);
        }
        .qsp-field input:focus { border-color: var(--accent); background: var(--card); }
      `}</style>
    </Modal>
  );
}
