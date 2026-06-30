import { useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useUpdateBatch, type UpdateBatchPayload } from '../api/batches';
import { useUpdateDelivery } from '../api/deliveries';
import { useSuppliers } from '../api/suppliers';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { dateOnlyToIso } from '../lib/date';
import { formatThousands, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';
import type { Delivery } from '../types/api';

const UNIT_LABEL: Record<string, string> = {
  KG: 'kg', DONA: 'dona', LITR: 'L', QOP: 'qop', QUTI: 'quti',
};

interface BatchLine {
  id: number;
  productName: string;
  baseLabel: string;
  hasPack: boolean;
  packUnit: string;
  quantityRemaining: number;
  quantityReceived: string;
  costPricePerUnit: string;
  salePricePerUnit: string;
  packSalePrice: string;
}

interface FormValues {
  supplierId: number | '';
  receivedDate: string;
  notes: string;
  batches: BatchLine[];
}

interface OrigBatch {
  quantityReceived: number;
  costPricePerUnit: number;
  salePricePerUnit: number | null;
  packSalePrice: number | null;
}

function toFormValues(d: Delivery): FormValues {
  return {
    supplierId: d.supplierId ?? '',
    receivedDate: d.receivedDate.slice(0, 10),
    notes: d.notes ?? '',
    batches: (d.batches ?? []).map((b) => ({
      id: b.id,
      productName: b.product?.name ?? `#${b.id}`,
      baseLabel: UNIT_LABEL[b.product?.baseUnit ?? ''] ?? b.product?.baseUnit ?? 'birlik',
      hasPack: !!(b.product?.packUnit && b.product?.packSize && Number(b.product.packSize) > 0),
      packUnit: b.product?.packUnit ?? 'pachka',
      quantityRemaining: Number(b.quantityRemaining),
      quantityReceived: String(Number(b.quantityReceived)),
      costPricePerUnit: formatThousands(b.costPricePerUnit),
      salePricePerUnit: b.salePricePerUnit ? formatThousands(b.salePricePerUnit) : '',
      packSalePrice: b.packSalePrice ? formatThousands(b.packSalePrice) : '',
    })),
  };
}

interface Props {
  delivery: Delivery | null;
  onClose: () => void;
}

/**
 * Yetkazmani tahrirlash: sarlavha (ta'minotchi/sana/izoh — ichidagi barcha partiyalarga
 * tarqaladi) + har bir mahsulot-partiyasining kelgan miqdori va narxlari. Sotilgan miqdor saqlanadi.
 */
export function EditDeliveryModal({ delivery, onClose }: Props) {
  const toast = useToast();
  const suppliers = useSuppliers();
  const updateDelivery = useUpdateDelivery();
  const updateBatch = useUpdateBatch();
  const origRef = useRef<Map<number, OrigBatch>>(new Map());

  const { register, handleSubmit, reset, control, formState: { isSubmitting } } =
    useForm<FormValues>({ defaultValues: { supplierId: '', receivedDate: '', notes: '', batches: [] } });

  // keyName: '_key' — aks holda useFieldArray standart 'id' bilan batch id'mizni ustiga yozadi
  const { fields } = useFieldArray({ control, name: 'batches', keyName: '_key' });

  useEffect(() => {
    if (!delivery) return;
    reset(toFormValues(delivery));
    const map = new Map<number, OrigBatch>();
    for (const b of delivery.batches ?? []) {
      map.set(b.id, {
        quantityReceived: Number(b.quantityReceived),
        costPricePerUnit: Number(b.costPricePerUnit),
        salePricePerUnit: b.salePricePerUnit != null ? Number(b.salePricePerUnit) : null,
        packSalePrice: b.packSalePrice != null ? Number(b.packSalePrice) : null,
      });
    }
    origRef.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery?.id]);

  const supplierOptions = useMemo(() => suppliers.data ?? [], [suppliers.data]);

  if (!delivery) return null;

  const submit = async (v: FormValues) => {
    try {
      // 1) Sarlavha — ta'minotchi/sana/izoh (ichidagi partiyalarga ham tarqaladi)
      await updateDelivery.mutateAsync({
        id: delivery.id,
        payload: {
          supplierId: v.supplierId === '' ? null : Number(v.supplierId),
          receivedDate: dateOnlyToIso(v.receivedDate),
          notes: v.notes || undefined,
        },
      });

      // 2) O'zgargan partiyalar — miqdor/narx
      for (const line of v.batches) {
        const orig = origRef.current.get(line.id);
        if (!orig) continue;
        const payload: UpdateBatchPayload = {};

        const newQty = Number(line.quantityReceived);
        if (Number.isFinite(newQty) && newQty !== orig.quantityReceived) {
          payload.quantityReceived = newQty;
        }
        const newCost = parseAmount(line.costPricePerUnit);
        if (line.costPricePerUnit !== '' && newCost !== orig.costPricePerUnit) {
          payload.costPricePerUnit = newCost;
        }
        const newSale = parseAmount(line.salePricePerUnit);
        if (line.salePricePerUnit !== '' && newSale !== orig.salePricePerUnit) {
          payload.salePricePerUnit = newSale;
        }
        const newPack = parseAmount(line.packSalePrice);
        if (line.packSalePrice !== '' && newPack !== orig.packSalePrice) {
          payload.packSalePrice = newPack;
        }

        if (Object.keys(payload).length > 0) {
          await updateBatch.mutateAsync({ id: line.id, payload });
        }
      }

      toast.success('Yetkazma yangilandi');
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={delivery !== null}
      onClose={onClose}
      title="Yetkazmani tahrirlash"
      width={640}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-row">
          <Field label="Ta'minotchi">
            <select {...register('supplierId', { valueAsNumber: false })}>
              <option value="">— ta'minotchisiz —</option>
              {supplierOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sana">
            <input type="date" {...register('receivedDate', { required: true })} />
          </Field>
        </div>

        <div className="lines">
          {fields.map((field, index) => {
            const line = field;
            const orig = origRef.current.get(line.id);
            const sold = orig ? orig.quantityReceived - line.quantityRemaining : 0;
            return (
              <div className="line" key={field._key}>
                <div className="line-head">
                  <strong>{line.productName}</strong>
                  <small className="muted">#{line.id}</small>
                </div>
                <div className="form-row">
                  <Field label={`Kelgan miqdor (${line.baseLabel})`}>
                    <input
                      {...register(`batches.${index}.quantityReceived`, { required: true })}
                      inputMode="decimal"
                    />
                    {sold > 0 && (
                      <small className="hint">Sotilgan: <b className="num">{sold}</b> — kamida shuncha</small>
                    )}
                  </Field>
                  <Field label={`Kirim narxi — 1 ${line.baseLabel}`}>
                    <input {...moneyField(register(`batches.${index}.costPricePerUnit`))} />
                  </Field>
                </div>
                <div className="form-row">
                  <Field label={`Sotuv narxi — 1 ${line.baseLabel} (ixt.)`}>
                    <input {...moneyField(register(`batches.${index}.salePricePerUnit`))} placeholder="—" />
                  </Field>
                  {line.hasPack && (
                    <Field label={`Butun ${line.packUnit} narxi (ixt.)`}>
                      <input {...moneyField(register(`batches.${index}.packSalePrice`))} placeholder="—" />
                    </Field>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Field label="Izoh (ixt.)">
          <input {...register('notes')} />
        </Field>
      </form>
      <style>{`
        .form { display: flex; flex-direction: column; gap: 13px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .lines { display: flex; flex-direction: column; gap: 12px; }
        .line {
          display: flex; flex-direction: column; gap: 11px;
          border: 1px solid var(--line); border-radius: 12px; padding: 12px;
          background: var(--paper);
        }
        .line-head { display: flex; align-items: baseline; gap: 8px; }
        .line-head strong { font-size: 14px; color: var(--ink); }
        .line-head .muted { color: var(--ink-faint); font-weight: 500; }
        .hint { color: var(--ink-soft); font-size: 11.5px; }
        .hint b { color: var(--ink); }
      `}</style>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      <style>{`
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field span {
          font-size: 11.5px; color: var(--ink-soft); font-weight: 500;
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
      `}</style>
    </label>
  );
}
