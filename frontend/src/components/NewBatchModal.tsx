import { useForm, useWatch } from 'react-hook-form';
import { useCreateBatch } from '../api/batches';
import { useProducts } from '../api/products';
import { useSuppliers } from '../api/suppliers';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { dateOnlyToIso } from '../lib/date';
import { money, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';

interface BatchFormValues {
  productId: number;
  supplierId?: number;
  receivedDate: string;
  quantityReceived: string;
  costPricePerUnit: string;
  salePricePerUnit?: string;
  amountPaid?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Mustaqil "Yangi partiya" modali — mahsulot/ta'minotchi ro'yxatini o'zi oladi,
 * partiyani o'zi saqlaydi. BatchesPage va boshqaruv panelidagi tezkor amalda ishlatiladi.
 */
export function NewBatchModal({ open, onClose }: Props) {
  const toast = useToast();
  const products = useProducts();
  const suppliers = useSuppliers();
  const createBatch = useCreateBatch();

  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, control, formState: { isSubmitting, errors } } =
    useForm<BatchFormValues>({ defaultValues: { receivedDate: today } });

  const supplierId = useWatch({ control, name: 'supplierId' });
  const quantityReceived = useWatch({ control, name: 'quantityReceived' });
  const costPricePerUnit = useWatch({ control, name: 'costPricePerUnit' });
  const amountPaid = useWatch({ control, name: 'amountPaid' });
  const batchTotal = (Number(quantityReceived) || 0) * parseAmount(costPricePerUnit);
  const paid = parseAmount(amountPaid);

  const close = () => {
    reset({ receivedDate: today });
    onClose();
  };

  const submit = async (v: BatchFormValues) => {
    try {
      await createBatch.mutateAsync({
        productId: Number(v.productId),
        supplierId: v.supplierId ? Number(v.supplierId) : undefined,
        receivedDate: dateOnlyToIso(v.receivedDate),
        quantityReceived: Number(v.quantityReceived),
        costPricePerUnit: parseAmount(v.costPricePerUnit),
        salePricePerUnit: v.salePricePerUnit ? parseAmount(v.salePricePerUnit) : undefined,
        amountPaid: v.supplierId && v.amountPaid ? parseAmount(v.amountPaid) : undefined,
        notes: v.notes || undefined,
      });
      toast.success("Partiya qo'shildi");
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Yangi partiya"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Mahsulot" error={errors.productId?.message}>
          <select {...register('productId', { required: 'Mahsulot kerak', valueAsNumber: true })} autoFocus>
            <option value="">— tanlang —</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Ta'minotchi">
            <select {...register('supplierId', { valueAsNumber: true })}>
              <option value="">— ixtiyoriy —</option>
              {(suppliers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sana" error={errors.receivedDate?.message}>
            <input type="date" {...register('receivedDate', { required: 'Sana kerak' })} />
          </Field>
        </div>
        <Field label="Kelgan miqdor" error={errors.quantityReceived?.message}>
          <input {...register('quantityReceived', { required: 'Miqdor kerak' })} inputMode="decimal" placeholder="50" />
        </Field>
        <div className="form-row">
          <Field label="Kirim narxi (so'm)" error={errors.costPricePerUnit?.message}>
            <input {...moneyField(register('costPricePerUnit', { required: 'Narx kerak' }))} placeholder="240 000" />
          </Field>
          <Field label="Sotuv narxi (ixt.)">
            <input {...moneyField(register('salePricePerUnit'))} placeholder="280 000" />
          </Field>
        </div>
        {supplierId ? (
          <Field label="To'langan summa (ixt.)">
            <input {...moneyField(register('amountPaid'))} placeholder="0" />
            <small className="paid-hint">
              Partiya summasi: <b className="num">{money(batchTotal, false)}</b>
              {paid > 0 && (
                <> · Qarz qoladi: <b className="num" style={{ color: 'var(--brick)' }}>{money(Math.max(0, batchTotal - paid), false)}</b></>
              )}
            </small>
          </Field>
        ) : null}
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} />
        </Field>
      </form>
      <style>{`
        .form { display: flex; flex-direction: column; gap: 13px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .paid-hint { font-size: 11.5px; color: var(--ink-faint); text-transform: none; letter-spacing: 0; }
        .paid-hint b { font-weight: 700; }
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
        .field input, .field select {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          outline: none; font-family: inherit;
        }
        .field input:focus, .field select:focus {
          border-color: var(--accent);
          background: var(--card);
        }
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}
