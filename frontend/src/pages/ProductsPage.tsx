import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCategories, useCreateProduct, useDeleteProduct, useProducts, useUpdateProduct } from '../api/products';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchInput, type SelectOption } from '../components/ui/Filters';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { formatThousands, money, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';
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
  const products = useProducts({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Filtrlar (client-side)
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [unit, setUnit] = useState<'all' | Unit>('all');

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setModalOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data ?? []).filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== Number(categoryId)) return false;
      if (status === 'active' && !p.isActive) return false;
      if (status === 'inactive' && p.isActive) return false;
      if (unit !== 'all' && p.baseUnit !== unit) return false;
      if (q && !(p.name.toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [products.data, search, categoryId, status, unit]);

  const categoryOptions: SelectOption[] = [
    { value: 'all', label: 'Barcha toifa' },
    ...(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const hasFilter = !!(search || categoryId !== 'all' || status !== 'all' || unit !== 'all');
  const clearAll = () => { setSearch(''); setCategoryId('all'); setStatus('all'); setUnit('all'); };

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
      render: (p) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
            Tahrirlash
          </Button>
          {p.isActive && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
              O'chirish
            </Button>
          )}
        </div>
      ),
      align: 'right',
      width: '200px',
    },
  ];

  return (
    <div>
      <FilterBar
        action={
          <Button onClick={openCreate} icon={<IconPlus />}>
            Yangi mahsulot
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Nom yoki shtrix-kod..." />
        <FilterSelect value={categoryId} onChange={setCategoryId} ariaLabel="Toifa" options={categoryOptions} />
        <FilterSelect
          value={status}
          onChange={(v) => setStatus(v as 'all' | 'active' | 'inactive')}
          ariaLabel="Holat"
          options={[
            { value: 'all', label: 'Barcha holat' },
            { value: 'active', label: 'Faol' },
            { value: 'inactive', label: 'Faolsiz' },
          ]}
        />
        <FilterSelect
          value={unit}
          onChange={(v) => setUnit(v as 'all' | Unit)}
          ariaLabel="Birlik"
          options={[{ value: 'all', label: 'Barcha birlik' }, ...UNITS.map((u) => ({ value: u.value, label: u.label }))]}
        />
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(p) => p.id}
          isLoading={products.isLoading}
          emptyTitle="Mahsulot yo'q"
          emptyDescription={hasFilter ? 'Filtrga mos mahsulot topilmadi' : "Birinchi mahsulotni qo'shing"}
          resetKey={`${search}|${categoryId}|${status}|${unit}`}
        />
      </Card>

      <ProductModal
        open={modalOpen}
        product={editing}
        onClose={() => setModalOpen(false)}
        categories={categories.data ?? []}
        onSubmit={async (values) => {
          const payload = {
            name: values.name,
            categoryId: Number(values.categoryId),
            baseUnit: values.baseUnit,
            packSize: values.packSize ? Number(values.packSize) : null,
            defaultSalePrice: values.defaultSalePrice ? parseAmount(values.defaultSalePrice) : null,
            barcode: values.barcode || null,
          };
          try {
            if (editing) {
              await updateProduct.mutateAsync({ id: editing.id, ...payload });
              toast.success("Mahsulot yangilandi");
            } else {
              await createProduct.mutateAsync(payload);
              toast.success("Mahsulot qo'shildi");
            }
            setModalOpen(false);
          } catch (e) {
            toast.error(extractError(e));
          }
        }}
      />
    </div>
  );
}

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  categories: { id: number; name: string }[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

function ProductModal({ open, product, onClose, categories, onSubmit }: ProductModalProps) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<ProductFormValues>({
    defaultValues: { baseUnit: 'KG' },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        categoryId: product.categoryId,
        baseUnit: product.baseUnit,
        packSize: product.packSize != null ? String(product.packSize) : '',
        defaultSalePrice: formatThousands(product.defaultSalePrice),
        barcode: product.barcode ?? '',
      });
    } else {
      reset({ name: '', categoryId: undefined, baseUnit: 'KG', packSize: '', defaultSalePrice: '', barcode: '' });
    }
  }, [open, product, reset]);

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
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
            <input {...moneyField(register('defaultSalePrice'))} placeholder="280 000" />
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
          border-color: var(--accent);
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
