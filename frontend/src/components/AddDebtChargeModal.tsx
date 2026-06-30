import { useForm } from 'react-hook-form';
import { useAddDebtCharge } from '../api/debts';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { money, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';

interface ChargeFormValues {
  amount: string;
  chargeDate: string;
  notes?: string;
}

interface CustomerLike {
  id: number;
  name: string;
  balance?: string;
}

interface AddDebtChargeModalProps {
  customer: CustomerLike | null;
  onClose: () => void;
}

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function AddDebtChargeModal({ customer, onClose }: AddDebtChargeModalProps) {
  const addCharge = useAddDebtCharge();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChargeFormValues>({
    defaultValues: { chargeDate: todayStr() },
  });

  if (!customer) return null;

  const close = () => { reset({ chargeDate: todayStr() }); onClose(); };

  const submit = async (v: ChargeFormValues) => {
    try {
      await addCharge.mutateAsync({
        customerId: customer.id,
        amount: parseAmount(v.amount),
        chargeDate: v.chargeDate || undefined,
        notes: v.notes,
      });
      toast.success("Eski qarz qo'shildi");
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={customer !== null}
      onClose={close}
      title={`Eski qarz qo'shish — ${customer.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={addCharge.isPending}>
            {addCharge.isPending ? 'Saqlanmoqda...' : "Qo'shish"}
          </Button>
        </>
      }
    >
      {customer.balance !== undefined && (
        <div className="charge-info">
          <div className="row">
            <span>Hozirgi qarz:</span>
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
        <Field label="Sana" error={errors.chargeDate?.message}>
          <input type="date" {...register('chargeDate', { required: 'Sana kerak' })} />
        </Field>
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} placeholder="Masalan: o'tgan oydan qolgan qarz" />
        </Field>
      </form>
      <style>{`
        .charge-info {
          padding: 11px 13px; background: var(--brick-soft);
          border-radius: 10px; margin-bottom: 14px;
        }
        .charge-info .row {
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
