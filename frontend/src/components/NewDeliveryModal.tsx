import { useEffect, useMemo } from 'react';
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { useCreateDelivery } from '../api/deliveries';
import { useProducts } from '../api/products';
import { useSuppliers, useSupplierProducts } from '../api/suppliers';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { dateOnlyToIso } from '../lib/date';
import { money, parseAmount, formatThousands } from '../lib/format';
import { moneyField } from '../lib/moneyField';
import type { Product } from '../types/api';

const UNIT_LABEL: Record<string, string> = {
  KG: 'kg', DONA: 'dona', LITR: 'L', QOP: 'qop', QUTI: 'quti',
};

type EntryMode = 'pack' | 'base';

interface LineValues {
  productId: number | '';
  mode: EntryMode;
  // Base rejimi
  quantityReceived: string;
  costPricePerUnit: string;
  // Pachka rejimi
  packQuantity: string;
  costPerPack: string;
  // Ixtiyoriy narxlar
  salePricePerUnit: string;
  packSalePrice: string;
}

interface DeliveryFormValues {
  supplierId?: number | '';
  receivedDate: string;
  amountPaid?: string;
  notes?: string;
  lines: LineValues[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  // Ta'minotchi sahifasidan ochilsa — shu ta'minotchi oldindan tanlangan bo'ladi
  defaultSupplierId?: number | null;
}

const emptyLine = (): LineValues => ({
  productId: '',
  mode: 'base',
  quantityReceived: '',
  costPricePerUnit: '',
  packQuantity: '',
  costPerPack: '',
  salePricePerUnit: '',
  packSalePrice: '',
});

/** Mahsulot bo'yicha pachka/base hosilalarini hisoblaydi (qator hint va jami summa uchun) */
function computeLine(line: LineValues | undefined, product: Product | undefined) {
  const packSize = product?.packSize ? Number(product.packSize) : 0;
  const hasPack = !!(product?.packUnit && packSize > 0);
  const mode: EntryMode = hasPack ? (line?.mode ?? 'pack') : 'base';
  const derivedQty = mode === 'pack'
    ? (Number(line?.packQuantity) || 0) * packSize
    : Number(line?.quantityReceived) || 0;
  const derivedUnitCost = mode === 'pack'
    ? (packSize > 0 ? parseAmount(line?.costPerPack) / packSize : 0)
    : parseAmount(line?.costPricePerUnit);
  const total = mode === 'pack'
    ? (Number(line?.packQuantity) || 0) * parseAmount(line?.costPerPack)
    : (Number(line?.quantityReceived) || 0) * parseAmount(line?.costPricePerUnit);
  return { packSize, hasPack, mode, derivedQty, derivedUnitCost, total };
}

/**
 * Ko'p mahsulotli "Yangi yetkazma" modali — bitta ta'minotchi/sana/to'lov ostida
 * bir nechta mahsulotni bitta kirimda qo'shadi. Har qator alohida partiya (batch) bo'ladi.
 */
export function NewDeliveryModal({ open, onClose, defaultSupplierId }: Props) {
  const toast = useToast();
  const products = useProducts();
  const suppliers = useSuppliers();
  const createDelivery = useCreateDelivery();

  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, control, setValue, formState: { isSubmitting, errors } } =
    useForm<DeliveryFormValues>({
      defaultValues: { receivedDate: today, lines: [emptyLine()] },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const supplierId = useWatch({ control, name: 'supplierId' });
  const amountPaid = useWatch({ control, name: 'amountPaid' });
  const lines = useWatch({ control, name: 'lines' });

  const allProducts = useMemo(() => products.data ?? [], [products.data]);
  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of allProducts) map.set(p.id, p);
    return map;
  }, [allProducts]);

  // Ta'minotchi tanlansa — uning avval yetkazgan mahsulotlari bo'yicha filterlaymiz.
  // Tarix bo'lmasa (yangi ta'minotchi) yoki ta'minotchi tanlanmagan bo'lsa — hamma mahsulot.
  const supplierProducts = useSupplierProducts(supplierId ? Number(supplierId) : null);
  const filteredBySupplier = !!supplierId && (supplierProducts.data?.length ?? 0) > 0;
  const lineProducts = filteredBySupplier ? supplierProducts.data! : allProducts;

  // Ta'minotchi sahifasidan kelinsa — ta'minotchi qulflanadi (o'zgartirib bo'lmaydi)
  const lockSupplier = defaultSupplierId != null;
  const lockedSupplierName =
    (suppliers.data ?? []).find((s) => s.id === defaultSupplierId)?.name ?? '';

  // Yetkazma umumiy summasi = Σ qator summalari
  const grandTotal = useMemo(() => {
    return (lines ?? []).reduce((sum, line) => {
      const product = line?.productId ? productById.get(Number(line.productId)) : undefined;
      return sum + computeLine(line, product).total;
    }, 0);
  }, [lines, productById]);

  const paid = parseAmount(amountPaid);

  const close = () => {
    reset({ receivedDate: today, lines: [emptyLine()] });
    onClose();
  };

  // Modal ochilganda formani tozalaymiz; ta'minotchi sahifasidan kelinsa — o'sha ta'minotchi tanlangan bo'ladi
  useEffect(() => {
    if (open) {
      reset({ receivedDate: today, supplierId: defaultSupplierId ?? undefined, lines: [emptyLine()] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSupplierId]);

  const submit = async (v: DeliveryFormValues) => {
    // Qatorlarni tekshiramiz va payload qatorlarini yig'amiz
    const payloadLines = [];
    for (let i = 0; i < v.lines.length; i++) {
      const line = v.lines[i];
      if (!line.productId) {
        toast.error(`${i + 1}-qatorda mahsulot tanlanmagan`);
        return;
      }
      const product = productById.get(Number(line.productId));
      const { hasPack, mode } = computeLine(line, product);
      const usePack = hasPack && mode === 'pack';

      if (usePack) {
        if (!(Number(line.packQuantity) > 0) || !line.costPerPack) {
          toast.error(`"${product?.name}" — pachka soni va narxini kiriting`);
          return;
        }
      } else if (!(Number(line.quantityReceived) > 0) || !line.costPricePerUnit) {
        toast.error(`"${product?.name}" — miqdor va kirim narxini kiriting`);
        return;
      }

      payloadLines.push({
        productId: Number(line.productId),
        ...(usePack
          ? { packQuantity: Number(line.packQuantity), costPerPack: parseAmount(line.costPerPack) }
          : { quantityReceived: Number(line.quantityReceived), costPricePerUnit: parseAmount(line.costPricePerUnit) }),
        salePricePerUnit: line.salePricePerUnit ? parseAmount(line.salePricePerUnit) : undefined,
        packSalePrice: hasPack && line.packSalePrice ? parseAmount(line.packSalePrice) : undefined,
      });
    }

    // Qulflangan bo'lsa — ta'minotchi har doim defaultSupplierId (forma qiymatidan qat'i nazar)
    const sid = lockSupplier ? defaultSupplierId ?? undefined : v.supplierId ? Number(v.supplierId) : undefined;

    try {
      await createDelivery.mutateAsync({
        supplierId: sid,
        receivedDate: dateOnlyToIso(v.receivedDate),
        amountPaid: sid && v.amountPaid ? parseAmount(v.amountPaid) : undefined,
        notes: v.notes || undefined,
        lines: payloadLines,
      });
      toast.success(`Partiya qo'shildi (${payloadLines.length} mahsulot)`);
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
      width={640}
      footer={
        <>
          <div className="grand">
            Jami: <b className="num">{money(grandTotal, false)}</b> so'm
            {supplierId && paid > 0 && (
              <span className="debt"> · Qarz: <b className="num">{money(Math.max(0, grandTotal - paid), false)}</b></span>
            )}
          </div>
          <div className="actions">
            <Button variant="ghost" onClick={close}>Bekor</Button>
            <Button onClick={handleSubmit(submit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </div>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-row">
          <Field label="Ta'minotchi">
            {lockSupplier ? (
              <div className="locked-supplier" title="Ta'minotchi sahifasidan tanlangan">
                <span>{lockedSupplierName}</span>
                <IconLock />
              </div>
            ) : (
              <select {...register('supplierId', { valueAsNumber: true })}>
                <option value="">— ixtiyoriy —</option>
                {(suppliers.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Sana" error={errors.receivedDate?.message}>
            <input type="date" {...register('receivedDate', { required: 'Sana kerak' })} />
          </Field>
        </div>

        {filteredBySupplier && (
          <div className="filter-hint">
            Faqat <b>{supplierProducts.data!.length}</b> ta — bu ta'minotchi avval yetkazgan mahsulotlar ko'rsatilmoqda
          </div>
        )}

        <div className="lines">
          {fields.map((field, index) => (
            <LineRow
              key={field.id}
              index={index}
              control={control}
              register={register}
              setValue={setValue}
              productById={productById}
              products={lineProducts}
              onRemove={() => remove(index)}
              canRemove={fields.length > 1}
            />
          ))}
        </div>

        <button type="button" className="add-line" onClick={() => append(emptyLine())}>
          + Mahsulot qo'shish
        </button>

        {supplierId ? (
          <Field label="To'langan summa — butun partiyaga (ixt.)">
            <input {...moneyField(register('amountPaid'))} placeholder="0" />
            {grandTotal > 0 && paid !== grandTotal && (
              <button
                type="button"
                className="pay-suggest"
                onClick={() => setValue('amountPaid', formatThousands(grandTotal))}
              >
                Partiya summasi: <b className="num">{money(grandTotal, false)}</b> so'm — to'liq to'lash
              </button>
            )}
          </Field>
        ) : null}
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} />
        </Field>
      </form>
      <style>{`
        .form { display: flex; flex-direction: column; gap: 13px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .locked-supplier {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 10px 12px; border: 1px solid var(--line-strong); border-radius: 9px;
          background: var(--paper); color: var(--ink); font-weight: 600;
        }
        .locked-supplier svg { width: 15px; height: 15px; color: var(--ink-faint); flex-shrink: 0; }
        .lines { display: flex; flex-direction: column; gap: 12px; }
        .add-line {
          align-self: flex-start;
          padding: 9px 14px; border: 1px dashed var(--line-strong); border-radius: 9px;
          background: var(--paper-2); cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 600; color: var(--accent);
        }
        .add-line:hover { background: var(--accent-soft); border-color: var(--accent); }
        .filter-hint {
          font-size: 12px; color: var(--ink-soft);
          background: var(--accent-soft); border-radius: 8px; padding: 7px 10px;
        }
        .filter-hint b { font-weight: 700; color: var(--ink); }
        .pay-suggest {
          align-self: flex-start; margin-top: 2px;
          padding: 6px 10px; border: 1px dashed var(--accent); border-radius: 8px;
          background: var(--accent-soft); cursor: pointer; font-family: inherit;
          font-size: 12px; color: var(--ink-soft); text-align: left;
        }
        .pay-suggest:hover { background: var(--accent); color: var(--paper-2); }
        .pay-suggest:hover b { color: var(--paper-2); }
        .pay-suggest b { font-weight: 800; color: var(--ink); }
        .grand { font-size: 13.5px; color: var(--ink-soft); margin-right: auto; align-self: center; }
        .grand b { font-weight: 800; color: var(--ink); }
        .grand .debt { color: var(--brick); }
        .grand .debt b { color: var(--brick); }
        .actions { display: flex; gap: 8px; }
        /* Mobile: ikki ustunli qatorlarni pastga tushiramiz, inputlar sig'sin */
        .field input, .field select, .line-product { min-width: 0; max-width: 100%; }
        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </Modal>
  );
}

interface LineRowProps {
  index: number;
  control: Control<DeliveryFormValues>;
  register: UseFormRegister<DeliveryFormValues>;
  setValue: UseFormSetValue<DeliveryFormValues>;
  productById: Map<number, Product>;
  products: Product[];
  onRemove: () => void;
  canRemove: boolean;
}

function LineRow({ index, control, register, setValue, productById, products, onRemove, canRemove }: LineRowProps) {
  const line = useWatch({ control, name: `lines.${index}` });
  const selectedId = line?.productId ? Number(line.productId) : null;
  const product = selectedId ? productById.get(selectedId) : undefined;
  const { hasPack, mode, derivedQty, derivedUnitCost, total } = computeLine(line, product);

  // Tanlangan mahsulot filtrlangan ro'yxatda bo'lmasa ham (ta'minotchi keyin o'zgarsa) select'da qoladi
  const options = useMemo(() => {
    if (selectedId && product && !products.some((p) => p.id === selectedId)) {
      return [product, ...products];
    }
    return products;
  }, [products, selectedId, product]);

  const packLabel = product?.packUnit || 'pachka';
  const baseLabel = product ? (UNIT_LABEL[product.baseUnit] ?? product.baseUnit) : 'birlik';

  // Mahsulot o'zgarganda — pachka bo'lsa pachka rejimini standart qilamiz
  const productId = line?.productId;
  useEffect(() => {
    setValue(`lines.${index}.mode`, hasPack ? 'pack' : 'base');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, hasPack]);

  // Foyda (shu qator narxlari bo'yicha, 1 pachka uchun)
  const unitSale = parseAmount(line?.salePricePerUnit)
    || (product?.defaultSalePrice ? Number(product.defaultSalePrice) : 0);
  const packSaleVal = parseAmount(line?.packSalePrice)
    || (product?.packSalePrice ? Number(product.packSalePrice) : 0);
  const piecePackProfit = hasPack && unitSale > 0 && derivedUnitCost > 0
    ? (unitSale - derivedUnitCost) * (product?.packSize ? Number(product.packSize) : 0)
    : null;
  const wholePackProfit = hasPack && packSaleVal > 0 && derivedUnitCost > 0
    ? packSaleVal - derivedUnitCost * (product?.packSize ? Number(product.packSize) : 0)
    : null;

  return (
    <div className="line">
      <div className="line-head">
        <select
          className="line-product"
          {...register(`lines.${index}.productId`, { valueAsNumber: true })}
        >
          <option value="">— mahsulot tanlang —</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {total > 0 && <span className="line-total num">{money(total, false)}</span>}
        {canRemove && (
          <button type="button" className="line-del" onClick={onRemove} aria-label="O'chirish">×</button>
        )}
      </div>

      {hasPack && (
        <div className="mode-toggle">
          <button type="button" className={mode === 'pack' ? 'active' : ''}
            onClick={() => setValue(`lines.${index}.mode`, 'pack')}>
            {packLabel} bo'yicha
          </button>
          <button type="button" className={mode === 'base' ? 'active' : ''}
            onClick={() => setValue(`lines.${index}.mode`, 'base')}>
            {baseLabel} bo'yicha
          </button>
        </div>
      )}

      {mode === 'pack' ? (
        <div className="form-row">
          <Field label={`Nechta ${packLabel}`}>
            <input {...register(`lines.${index}.packQuantity`)} inputMode="decimal" placeholder="5" />
          </Field>
          <Field label={`1 ${packLabel} narxi (so'm)`}>
            <input {...moneyField(register(`lines.${index}.costPerPack`))} placeholder="28 000" />
          </Field>
        </div>
      ) : (
        <div className="form-row">
          <Field label={`Kelgan miqdor (${baseLabel})`}>
            <input {...register(`lines.${index}.quantityReceived`)} inputMode="decimal" placeholder="50" />
          </Field>
          <Field label={`Kirim narxi — 1 ${baseLabel}`}>
            <input {...moneyField(register(`lines.${index}.costPricePerUnit`))} placeholder="240 000" />
          </Field>
        </div>
      )}

      {mode === 'pack' && derivedQty > 0 && (
        <div className="derive-hint">
          = <b className="num">{derivedQty}</b> {baseLabel}
          {derivedUnitCost > 0 && (
            <> · 1 {baseLabel} tannarx: <b className="num">{money(derivedUnitCost, false)}</b> so'm</>
          )}
        </div>
      )}

      <div className="form-row">
        <Field label={`Sotuv narxi — 1 ${baseLabel} (ixt.)`}>
          <input {...moneyField(register(`lines.${index}.salePricePerUnit`))} placeholder="1 100" />
        </Field>
        {hasPack && (
          <Field label={`Butun ${packLabel} narxi (ixt.)`}>
            <input {...moneyField(register(`lines.${index}.packSalePrice`))} placeholder="280 000" />
          </Field>
        )}
      </div>

      {hasPack && (piecePackProfit !== null || wholePackProfit !== null) && (
        <div className="profit-hint">
          {piecePackProfit !== null && (
            <div>1 {packLabel} (dona sotilsa) — foyda: <b className="num">{money(piecePackProfit, false)}</b> so'm</div>
          )}
          {wholePackProfit !== null && (
            <div>1 {packLabel} (butun sotilsa) — foyda: <b className="num">{money(wholePackProfit, false)}</b> so'm</div>
          )}
        </div>
      )}
      <style>{`
        .line {
          display: flex; flex-direction: column; gap: 11px;
          border: 1px solid var(--line); border-radius: 12px; padding: 12px;
          background: var(--paper);
        }
        .line-head { display: flex; align-items: center; gap: 8px; }
        .line-product {
          flex: 1; padding: 10px 12px; border: 1px solid var(--line-strong);
          border-radius: 9px; background: var(--paper-2); outline: none; font-family: inherit;
          font-weight: 600;
        }
        .line-product:focus { border-color: var(--accent); background: var(--card); }
        .line-total { font-weight: 800; color: var(--ink); font-size: 13.5px; white-space: nowrap; }
        .line-del {
          width: 30px; height: 30px; flex: none; border: none; border-radius: 8px;
          background: var(--paper-2); color: var(--brick); font-size: 20px; line-height: 1;
          cursor: pointer; font-family: inherit;
        }
        .line-del:hover { background: var(--brick); color: var(--paper-2); }
        .mode-toggle {
          display: grid; grid-template-columns: 1fr 1fr; gap: 4px;
          background: var(--paper-2); border: 1px solid var(--line); border-radius: 10px; padding: 3px;
        }
        .mode-toggle button {
          padding: 7px 6px; border: none; background: transparent; cursor: pointer;
          font-family: inherit; font-size: 12px; font-weight: 600; color: var(--ink-soft);
          border-radius: 7px; text-transform: capitalize;
        }
        .mode-toggle button:hover { color: var(--ink); }
        .mode-toggle button.active { background: var(--accent); color: var(--paper-2); }
        .derive-hint {
          font-size: 12px; color: var(--ink-soft);
          background: var(--accent-soft); border-radius: 8px; padding: 7px 10px;
        }
        .derive-hint b { font-weight: 700; color: var(--ink); }
        .profit-hint {
          display: flex; flex-direction: column; gap: 3px;
          font-size: 12px; color: var(--ink-soft);
          background: var(--green-soft); border-radius: 8px; padding: 8px 10px;
        }
        .profit-hint b { font-weight: 700; color: var(--green); }
      `}</style>
    </div>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
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
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}
