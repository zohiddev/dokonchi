import { useForm } from 'react-hook-form';
import { useCreateExpense } from '../api/expenses';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { dateOnlyToIso } from '../lib/date';

// Tipik xarajat toifalari — datalist orqali tavsiya qilamiz, lekin user
// xohlagan toifani yoza oladi (free-text)
const COMMON_CATEGORIES = [
  'Ijara',
  'Elektr',
  'Suv',
  'Gaz',
  'Internet',
  'Telefon',
  'Transport',
  'Ish haqi',
  'Tozalik',
  'Reklama',
  'Soliq',
  'Tovar yo\'qotish',
  "Qog'oz, qopcha",
  'Boshqa',
];

interface ExpenseFormValues {
  expenseDate: string;
  category: string;
  amount: string;
  notes?: string;
}

interface ExpenseModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string; // YYYY-MM-DD
}

export function ExpenseModal({ open, onClose, defaultDate }: ExpenseModalProps) {
  const toast = useToast();
  const createExpense = useCreateExpense();
  const today = new Date().toISOString().slice(0, 10);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ExpenseFormValues>({
    defaultValues: {
      expenseDate: defaultDate ?? today,
      category: '',
      amount: '',
      notes: '',
    },
  });

  const submit = async (v: ExpenseFormValues) => {
    try {
      await createExpense.mutateAsync({
        expenseDate: dateOnlyToIso(v.expenseDate),
        category: v.category,
        amount: Number(v.amount),
        notes: v.notes || undefined,
      });
      toast.success("Xarajat qo'shildi");
      reset({ expenseDate: defaultDate ?? today, category: '', amount: '', notes: '' });
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Yangi xarajat"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={createExpense.isPending}>
            {createExpense.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Sana" error={errors.expenseDate?.message}>
          <input
            type="date"
            {...register('expenseDate', { required: 'Sana kerak' })}
            max={today}
          />
        </Field>
        <Field label="Toifa" error={errors.category?.message}>
          <input
            list="expense-categories"
            {...register('category', { required: 'Toifa kerak' })}
            placeholder="Masalan: Ijara"
            autoFocus
          />
          <datalist id="expense-categories">
            {COMMON_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Summa (so'm)" error={errors.amount?.message}>
          <input
            {...register('amount', { required: 'Summa kerak' })}
            inputMode="numeric"
            placeholder="150000"
          />
        </Field>
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} placeholder="Tafsilot" />
        </Field>
      </form>

      <style>{`
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
        .field input:focus { border-color: var(--green-2); background: var(--card); }
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}
