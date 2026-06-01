import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCategories, useCreateProduct, useDeleteProduct, useProducts } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterTabs } from '../components/ui/FilterTabs';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { money } from '../lib/format';
import type { Product, Unit } from '../types/api';

const UNITS: { value: Unit; label: string }[] = [
  { value: 'KG', label: 'kg' },
  { value: 'DONA', label: 'dona' },
  { value: 'LITR', label: 'L' },
  { value: 'QOP', label: 'qop' },
  { value: 'QUTI', label: 'quti' },
];

interface ProductFormValues {
  name: string;
  categoryId: number;
  baseUnit: Unit;
  packSize?: string;
  defaultSalePrice?: string;
  barcode?: string;
}

export function ProductsPage() {
  const toast = useToast();
  const categories = useCategories();
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const products = useProducts(activeCat === 'all' ? {} : { categoryId: activeCat });
  const [modalOpen, setModalOpen] = useState(false);

  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const categoryOptions = useMemo(() => {
    const all = [{ value: 'all' as const, label: 'Barchasi', count: products.data?.length }];
    return categories.data
      ? [...all, ...categories.data.map((c) => ({ value: c.id, label: c.name, count: c._count?.products }))]
      : all;
  }, [categories.data, products.data?.length]);

  const handleDelete = async (p: Product) => {
    if (!confirm(`"${p.name}" mahsulotini o'chirish?`)) return;
    try {
      await deleteProduct.mutateAsync(p.id);
      toast.success("Mahsulot faolsizlantirildi");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Mahsulot',
      render: (p) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong style={{ color: p.isActive ? 'var(--ink)' : 'var(--ink-faint)' }}>{p.name}</strong>
          <small style={{ color: 'var(--ink-soft)' }}>{p.category?.name}</small>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Birlik',
      render: (p) => UNITS.find((u) => u.value === p.baseUnit)?.label ?? p.baseUnit,
      width: '80px',
    },
    {
      key: 'barcode',
      header: 'Shtrix-kod',
      render: (p) =>
        p.barcode ? (
          <span className="num" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{p.barcode}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>qo'shilmagan</small>
        ),
      width: '140px',
    },
    {
      key: 'price',
      header: 'Sotuv narxi',
      render: (p) => <span className="num">{money(p.defaultSalePrice)}</span>,
      align: 'right',
      width: '160px',
    },
    {
      key: 'status',
      header: 'Holat',
      render: (p) =>
        p.isActive ? <Tag tone="green">Faol</Tag> : <Tag tone="gray">Faolsiz</Tag>,
      width: '90px',
    },
    {
      key: 'actions',
      header: '',
      render: (p) =>
        p.isActive && (
          <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
            O'chirish
          </Button>
        ),
      align: 'right',
      width: '120px',
    },
  ];

  return (
    <div>
      <div className="page-toolbar">
        <FilterTabs<number | 'all'>
          value={activeCat}
          onChange={setActiveCat}
          options={categoryOptions}
        />
        <Button onClick={() => setModalOpen(true)} icon={<IconPlus />}>
          Yangi mahsulot
        </Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={products.data}
          rowKey={(p) => p.id}
          isLoading={products.isLoading}
          emptyTitle="Mahsulot yo'q"
          emptyDescription="Bu toifada hozircha mahsulot yo'q"
        />
      </Card>

      <NewProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories.data ?? []}
        onSubmit={async (values) => {
          try {
            await createProduct.mutateAsync({
              name: values.name,
              categoryId: Number(values.categoryId),
              baseUnit: values.baseUnit,
              packSize: values.packSize ? Number(values.packSize) : undefined,
              defaultSalePrice: values.defaultSalePrice ? Number(values.defaultSalePrice) : undefined,
              barcode: values.barcode || undefined,
            });
            toast.success("Mahsulot qo'shildi");
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

interface NewProductModalProps {
  open: boolean;
  onClose: () => void;
  categories: { id: number; name: string }[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

function NewProductModal({ open, onClose, categories, onSubmit }: NewProductModalProps) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<ProductFormValues>({
    defaultValues: { baseUnit: 'KG' },
  });

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Yangi mahsulot"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(async (v) => { await onSubmit(v); reset(); })} disabled={isSubmitting}>
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Nom" error={errors.name?.message}>
          <input {...register('name', { required: "Nom kerak" })} autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Toifa" error={errors.categoryId?.message}>
            <select {...register('categoryId', { required: "Toifa kerak", valueAsNumber: true })}>
              <option value="">— tanlang —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Birlik">
            <select {...register('baseUnit')}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Sotuv narxi (so'm)">
            <input {...register('defaultSalePrice')} placeholder="280000" inputMode="numeric" />
          </Field>
          <Field label="Pack size (ixt.)">
            <input {...register('packSize')} placeholder="25" inputMode="decimal" />
          </Field>
        </div>
        <Field label="Shtrix-kod (ixt.)">
          <input {...register('barcode')} placeholder="4780123456789" />
        </Field>
      </form>

      <style>{`
        .form { display: flex; flex-direction: column; gap: 14px; }
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
          color: var(--ink);
          outline: none;
          font-family: inherit;
          transition: border-color .15s, background .15s;
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
