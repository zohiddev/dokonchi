import { useForm } from 'react-hook-form';
import { usePayDebt } from '../api/debts';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { money, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';

interface PayFormValues {
  amount: string;
  notes?: string;
}

interface CustomerLike {
  id: number;
  name: string;
  balance?: string;
}

interface PayDebtModalProps {
  customer: CustomerLike | null;
  onClose: () => void;
  /** To'lovdan keyin chaqiriladi (yangi balans bilan) */
  onPaid?: (newBalance: string) => void;
}

export function PayDebtModal({ customer, onClose, onPaid }: PayDebtModalProps) {
  const payDebt = usePayDebt();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PayFormValues>();

  if (!customer) return null;

  const submit = async (v: PayFormValues) => {
    try {
      const result = await payDebt.mutateAsync({
        customerId: customer.id,
        amount: parseAmount(v.amount),
        notes: v.notes,
      });
      toast.success("To'lov qabul qilindi");
      reset();
      onPaid?.((result as { balance?: { balance: string } }).balance?.balance ?? '0');
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={customer !== null}
      onClose={() => { reset(); onClose(); }}
      title={`To'lov qabul qilish — ${customer.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={payDebt.isPending}>
            {payDebt.isPending ? 'Saqlanmoqda...' : 'Qabul qilish'}
          </Button>
        </>
      }
    >
      {customer.balance !== undefined && (
        <div className="pay-info">
          <div className="row">
            <span>Qarz qoldig'i:</span>
            <strong className="num" style={{ color: 'var(--brick)' }}>{money(customer.balance)}</strong>
          </div>
        </div>
      )}
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Summa (so'm)" error={errors.amount?.message}>
          <input
            {...moneyField(register('amount', { required: 'Summa kerak' }))}
            placeholder="500 000"
            autoFocus
          />
        </Field>
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} placeholder="Tafsilot" />
        </Field>
      </form>
      <style>{`
        .pay-info {
          padding: 11px 13px; background: var(--brick-soft);
          border-radius: 10px; margin-bottom: 14px;
        }
        .pay-info .row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px;
        }
        .form { display: flex; flex-direction: column; gap: 13px; }
      `}</style>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="err">{error}</small>}
      <style>{`
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .field input {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          outline: none; font-family: inherit;
        }
        .field input:focus { border-color: var(--accent); background: var(--card); }
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}
