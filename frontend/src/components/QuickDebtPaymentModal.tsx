import { useState } from 'react';
import { useDebts, usePayDebt } from '../api/debts';
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
 * Tezkor amal: mijoz qarzini qaytarganda — qidirib topib, summani kiritib qabul qilish.
 * Faqat qarzdor mijozlar ro'yxatda chiqadi (balans > 0).
 */
export function QuickDebtPaymentModal({ open, onClose }: Props) {
  const toast = useToast();
  const debts = useDebts();
  const payDebt = usePayDebt();

  const [selected, setSelected] = useState<PickableCustomer | null>(null);
  const [balance, setBalance] = useState('0');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const items: PickableCustomer[] = (debts.data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    phone: d.phone,
    meta: (
      <span className="num" style={{ color: 'var(--brick)', fontWeight: 600, fontSize: 12.5 }}>
        {money(d.balance, false)}
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
      const d = debts.data?.find((x) => x.id === c.id);
      setBalance(d?.balance ?? '0');
      setAmount(d?.balance ? formatThousands(d.balance) : '');
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
      await payDebt.mutateAsync({
        customerId: selected.id,
        amount: amt,
        notes: notes.trim() || undefined,
      });
      toast.success(`To'lov qabul qilindi — ${selected.name}`);
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Qarz to'lovini qabul qilish"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={submit} disabled={!selected || payDebt.isPending}>
            {payDebt.isPending ? 'Saqlanmoqda...' : 'Qabul qilish'}
          </Button>
        </>
      }
    >
      <div className="qpay">
        <label className="qpay-lbl">Mijoz</label>
        <CustomerSearchSelect
          items={items}
          selected={selected}
          onSelect={handleSelect}
          isLoading={debts.isLoading}
          emptyText="Qarzdor mijoz topilmadi"
          placeholder="Qarzdor mijoz ismini yozing..."
          autoFocus
        />

        {selected && (
          <>
            <div className="qpay-balance">
              <span>Qarz qoldig'i:</span>
              <strong className="num">{money(balance)}</strong>
            </div>

            <label className="qpay-field">
              <span>To'lov summasi (so'm)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(formatThousands(e.target.value))}
                inputMode="numeric"
                placeholder="500 000"
                autoFocus
              />
            </label>

            <label className="qpay-field">
              <span>Izoh (ixtiyoriy)</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tafsilot"
              />
            </label>
          </>
        )}
      </div>

      <style>{`
        .qpay { display: flex; flex-direction: column; gap: 13px; }
        .qpay-lbl, .qpay-field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .qpay-balance {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 13px; background: var(--brick-soft);
          border-radius: 10px; font-size: 13px;
        }
        .qpay-balance strong { color: var(--brick); }
        .qpay-field { display: flex; flex-direction: column; gap: 5px; }
        .qpay-field input {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          outline: none; font-family: inherit; color: var(--ink);
        }
        .qpay-field input:focus { border-color: var(--accent); background: var(--card); }
      `}</style>
    </Modal>
  );
}
