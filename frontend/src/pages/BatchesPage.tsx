import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBatches, useCreateBatch } from '../api/batches';
import { useProducts } from '../api/products';
import { useSuppliers } from '../api/suppliers';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Modal } from '../components/ui/Modal';
import { StatusPill } from '../components/ui/Tag';
import { StockBar } from '../components/ui/StockBar';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { date, money } from '../lib/format';
import type { Batch } from '../types/api';

type FilterTab = 'this-week' | 'all' | 'finished';

interface BatchFormValues {
  productId: number;
  supplierId?: number;
  receivedDate: string;
  quantityReceived: string;
  costPricePerUnit: string;
  salePricePerUnit?: string;
  notes?: string;
}

function isoWeekLabel(d: Date): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNr + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function batchStatus(b: Batch): 'active' | 'slow' | 'old' | 'finished' {
  const rem = Number(b.quantityRemaining);
  const recv = Number(b.quantityReceived);
  if (rem <= 0) return 'finished';
  const age = (Date.now() - new Date(b.receivedDate).getTime()) / (1000 * 60 * 60 * 24);
  const ratio = recv > 0 ? rem / recv : 0;
  if (age > 21 && ratio < 0.3) return 'old';
  if (age > 14) return 'slow';
  return 'active';
}

export function BatchesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<FilterTab>('all');
  const products = useProducts();
  const suppliers = useSuppliers();
  const [modalOpen, setModalOpen] = useState(false);

  const filter = useMemo(() => {
    if (tab === 'this-week') return { weekLabel: isoWeekLabel(new Date()) };
    if (tab === 'finished') return { status: 'finished' as const };
    return {};
  }, [tab]);

  const batches = useBatches(filter);
  const createBatch = useCreateBatch();

  const columns: Column<Batch>[] = [
    {
      key: 'id',
      header: '№',
      render: (b) => <span className="num" style={{ color: 'var(--ink-soft)' }}>#{b.id}</span>,
      width: '60px',
    },
    {
      key: 'product',
      header: 'Mahsulot',
      render: (b) => (
        <div>
          <strong>{b.product?.name}</strong>
          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>
            {b.supplier?.name ?? "— ta'minotchi yo'q"}
          </small>
        </div>
      ),
    },
    {
      key: 'week',
      header: 'Hafta',
      render: (b) => (
        <div>
          <span className="num" style={{ fontSize: 12.5 }}>{b.weekLabel}</span>
          <small style={{ display: 'block', color: 'var(--ink-faint)' }}>{date(b.receivedDate, true)}</small>
        </div>
      ),
      width: '120px',
    },
    {
      key: 'cost',
      header: 'Kirim narxi',
      render: (b) => <span className="num">{money(b.costPricePerUnit)}</span>,
      align: 'right',
      width: '140px',
    },
    {
      key: 'stock',
      header: 'Qoldiq',
      render: (b) => (
        <StockBar remaining={Number(b.quantityRemaining)} received={Number(b.quantityReceived)} />
      ),
      width: '180px',
    },
    {
      key: 'status',
      header: 'Holat',
      render: (b) => <StatusPill status={batchStatus(b)} />,
      width: '100px',
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <FilterTabs<FilterTab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'this-week', label: 'Joriy hafta' },
            { value: 'finished', label: 'Tugaganlar' },
          ]}
        />
        <Button onClick={() => setModalOpen(true)} icon={<IconPlus />}>
          Yangi partiya
        </Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={batches.data}
          rowKey={(b) => b.id}
          isLoading={batches.isLoading}
          emptyTitle="Partiya yo'q"
        />
      </Card>

      <NewBatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products.data ?? []}
        suppliers={suppliers.data ?? []}
        onSubmit={async (v) => {
          try {
            await createBatch.mutateAsync({
              productId: Number(v.productId),
              supplierId: v.supplierId ? Number(v.supplierId) : undefined,
              receivedDate: v.receivedDate,
              quantityReceived: Number(v.quantityReceived),
              costPricePerUnit: Number(v.costPricePerUnit),
              salePricePerUnit: v.salePricePerUnit ? Number(v.salePricePerUnit) : undefined,
              notes: v.notes || undefined,
            });
            toast.success("Partiya qo'shildi");
            setModalOpen(false);
          } catch (e) {
            toast.error(extractError(e));
          }
        }}
      />

      <style>{`
        .page-toolbar {
          display: flex; align-items: center;
          justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}

interface NewBatchModalProps {
  open: boolean;
  onClose: () => void;
  products: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
  onSubmit: (v: BatchFormValues) => Promise<void>;
}

function NewBatchModal({ open, onClose, products, suppliers, onSubmit }: NewBatchModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<BatchFormValues>({
    defaultValues: { receivedDate: today },
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Yangi partiya"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(async (v) => { await onSubmit(v); reset({ receivedDate: today }); })} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Mahsulot" error={errors.productId?.message}>
          <select {...register('productId', { required: 'Mahsulot kerak', valueAsNumber: true })} autoFocus>
            <option value="">— tanlang —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Ta'minotchi">
            <select {...register('supplierId', { valueAsNumber: true })}>
              <option value="">— ixtiyoriy —</option>
              {suppliers.map((s) => (
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
            <input {...register('costPricePerUnit', { required: "Narx kerak" })} inputMode="numeric" placeholder="240000" />
          </Field>
          <Field label="Sotuv narxi (ixt.)">
            <input {...register('salePricePerUnit')} inputMode="numeric" placeholder="280000" />
          </Field>
        </div>
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} />
        </Field>
      </form>
      <style>{`
        .form { display: flex; flex-direction: column; gap: 13px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
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
          border-color: var(--green-2);
          background: var(--card);
        }
        .field .err { color: var(--brick); font-size: 12px; }
      `}</style>
    </label>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
