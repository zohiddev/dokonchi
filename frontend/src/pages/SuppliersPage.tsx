import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from '../api/suppliers';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchInput } from '../components/ui/Filters';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { money } from '../lib/format';
import type { Supplier } from '../types/api';

interface SupplierFormValues {
  name: string;
  phone?: string;
  notes?: string;
}

export function SuppliersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const suppliers = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtr + saralash
  const [search, setSearch] = useState('');
  const [debtStatus, setDebtStatus] = useState<'all' | 'debtor' | 'clean'>('all');
  const [sort, setSort] = useState<'name' | 'debt-desc'>('name');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (suppliers.data ?? []).filter((s) => {
      const debt = Number(s.balance ?? 0);
      if (debtStatus === 'debtor' && debt <= 0) return false;
      if (debtStatus === 'clean' && debt > 0) return false;
      if (q && !(s.name.toLowerCase().includes(q) || (s.phone ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) =>
      sort === 'debt-desc'
        ? Number(b.balance ?? 0) - Number(a.balance ?? 0)
        : a.name.localeCompare(b.name),
    );
    return sorted;
  }, [suppliers.data, search, debtStatus, sort]);

  const hasFilter = !!(search || debtStatus !== 'all');
  const clearAll = () => { setSearch(''); setDebtStatus('all'); };

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`"${s.name}" ta'minotchini o'chirish?`)) return;
    try {
      await deleteSupplier.mutateAsync(s.id);
      toast.success("Ta'minotchi o'chirildi");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (s) => <strong>{s.name}</strong>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (s) =>
        s.phone ? (
          <span className="num" style={{ color: 'var(--ink-soft)' }}>{s.phone}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
      width: '160px',
    },
    {
      key: 'notes',
      header: 'Izoh',
      render: (s) =>
        s.notes ? (
          <small style={{ color: 'var(--ink-soft)' }}>{s.notes}</small>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
    },
    {
      key: 'batches',
      header: 'Partiyalar',
      render: (s) => {
        const count = s._count?.batches ?? 0;
        return count > 0 ? (
          <Tag tone="green">{count} ta</Tag>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        );
      },
      width: '110px',
      align: 'center',
    },
    {
      key: 'balance',
      header: 'Qarz',
      render: (s) => {
        const bal = Number(s.balance ?? 0);
        if (bal > 0) return <Tag tone="brick">{money(bal, false)}</Tag>;
        return <Tag tone="green">Qarzsiz</Tag>;
      },
      align: 'right',
      width: '150px',
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div
          style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
            Tahrir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(s)}>
            O'chirish
          </Button>
        </div>
      ),
      align: 'right',
      width: '180px',
    },
  ];

  return (
    <div>
      <FilterBar
        action={
          <Button onClick={openCreate} icon={<IconPlus />}>
            Yangi ta'minotchi
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Nom yoki telefon..." />
        <FilterSelect
          value={debtStatus}
          onChange={(v) => setDebtStatus(v as 'all' | 'debtor' | 'clean')}
          ariaLabel="Qarz holati"
          options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'debtor', label: 'Qarzli' },
            { value: 'clean', label: 'Qarzsiz' },
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v as 'name' | 'debt-desc')}
          ariaLabel="Saralash"
          options={[
            { value: 'name', label: 'Ism (A→Z)' },
            { value: 'debt-desc', label: 'Qarz: ko\'p → kam' },
          ]}
        />
        <span style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{visible.length} ta</span>
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={visible}
          rowKey={(s) => s.id}
          isLoading={suppliers.isLoading}
          onRowClick={(s) => navigate(`/suppliers/${s.id}`)}
          emptyTitle="Ta'minotchi yo'q"
          emptyDescription={hasFilter ? 'Filtrga mos ta\'minotchi topilmadi' : "Birinchi ta'minotchini qo'shing — partiya qo'shganda kerak bo'ladi"}
          resetKey={`${search}|${debtStatus}|${sort}`}
        />
      </Card>

      <SupplierModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={async (v) => {
          try {
            if (editing) {
              await updateSupplier.mutateAsync({ id: editing.id, ...v });
              toast.success("Ta'minotchi yangilandi");
            } else {
              await createSupplier.mutateAsync(v);
              toast.success("Ta'minotchi qo'shildi");
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

function SupplierModal({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Supplier | null;
  onClose: () => void;
  onSubmit: (v: SupplierFormValues) => Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<SupplierFormValues>({
    values: editing
      ? { name: editing.name, phone: editing.phone ?? '', notes: editing.notes ?? '' }
      : { name: '', phone: '', notes: '' },
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={editing ? `Tahrirlash — ${editing.name}` : "Yangi ta'minotchi"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button
            onClick={handleSubmit(async (v) => { await onSubmit(v); })}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Nom" error={errors.name?.message}>
          <input
            {...register('name', { required: "Nom kerak" })}
            placeholder="Toshkent Don"
            autoFocus
          />
        </Field>
        <Field label="Telefon (ixt.)">
          <input
            {...register('phone')}
            placeholder="+998711234567"
            inputMode="tel"
          />
        </Field>
        <Field label="Izoh (ixt.)">
          <input
            {...register('notes')}
            placeholder="Masalan: har payshanba un keltiradi"
          />
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
        .field input:focus { border-color: var(--accent); background: var(--card); }
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
