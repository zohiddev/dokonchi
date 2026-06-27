import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer, useDeleteCustomer, useUpdateCustomer } from '../api/customers';
import { useDebts } from '../api/debts';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchInput } from '../components/ui/Filters';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { formatThousands, money, parseAmount } from '../lib/format';
import { moneyField } from '../lib/moneyField';
import type { Customer } from '../types/api';

interface CustomerFormValues {
  name: string;
  phone?: string;
  notes?: string;
  openingDebt?: string;
}

export function CustomersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const customers = useCustomers();
  const debts = useDebts(); // balansga ko'rilgan ro'yxat — qarzdorlarni topish uchun
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filtrlar
  const [search, setSearch] = useState('');
  const [debtStatus, setDebtStatus] = useState<'all' | 'debtor' | 'clean'>('all');

  // Qarzdor mijozlar id'lari → har bir mijoz qatorida tegni ko'rsatish uchun
  const debtMap = new Map((debts.data ?? []).map((d) => [d.id, d.balance]));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (customers.data ?? []).filter((c) => {
      const isDebtor = Number(debtMap.get(c.id) ?? 0) > 0;
      if (debtStatus === 'debtor' && !isDebtor) return false;
      if (debtStatus === 'clean' && isDebtor) return false;
      if (q && !(c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.data, debts.data, search, debtStatus]);

  const hasFilter = !!(search || debtStatus !== 'all');
  const clearAll = () => { setSearch(''); setDebtStatus('all'); };

  const openCreate = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setModalOpen(true);
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`"${c.name}" mijozini o'chirish?`)) return;
    try {
      await deleteCustomer.mutateAsync(c.id);
      toast.success("Mijoz o'chirildi");
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Ism',
      render: (c) => <strong>{c.name}</strong>,
    },
    {
      key: 'phone',
      header: 'Telefon',
      render: (c) =>
        c.phone ? (
          <span className="num" style={{ color: 'var(--ink-soft)' }}>{c.phone}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
      width: '160px',
    },
    {
      key: 'notes',
      header: 'Izoh',
      render: (c) =>
        c.notes ? (
          <small style={{ color: 'var(--ink-soft)' }}>{c.notes}</small>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
    },
    {
      key: 'status',
      header: 'Holat',
      render: (c) => {
        const balance = debtMap.get(c.id);
        if (balance && Number(balance) > 0) {
          return (
            <Tag tone="brick">Qarz: {money(balance, false)}</Tag>
          );
        }
        return <Tag tone="green">Toza</Tag>;
      },
      width: '200px',
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div
          style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
            Tahrir
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}>
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
            Yangi mijoz
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Ism yoki telefon..." />
        <FilterSelect
          value={debtStatus}
          onChange={(v) => setDebtStatus(v as 'all' | 'debtor' | 'clean')}
          ariaLabel="Qarz holati"
          options={[
            { value: 'all', label: 'Barchasi' },
            { value: 'debtor', label: 'Qarzdor' },
            { value: 'clean', label: 'Qarzsiz' },
          ]}
        />
        <span style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{filtered.length} ta mijoz</span>
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(c) => c.id}
          isLoading={customers.isLoading}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyTitle="Mijoz yo'q"
          emptyDescription={hasFilter ? 'Filtrga mos mijoz topilmadi' : "Birinchi mijozni qo'shing"}
          resetKey={`${search}|${debtStatus}`}
        />
      </Card>

      <CustomerModal
        open={modalOpen}
        editing={editingCustomer}
        onClose={() => setModalOpen(false)}
        onSubmit={async (v) => {
          const payload = {
            name: v.name,
            phone: v.phone || undefined,
            notes: v.notes || undefined,
            openingDebt: parseAmount(v.openingDebt),
          };
          try {
            if (editingCustomer) {
              await updateCustomer.mutateAsync({ id: editingCustomer.id, ...payload });
              toast.success("Mijoz yangilandi");
            } else {
              await createCustomer.mutateAsync(payload);
              toast.success("Mijoz qo'shildi");
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

function CustomerModal({
  open,
  editing,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Customer | null;
  onClose: () => void;
  onSubmit: (v: CustomerFormValues) => Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<CustomerFormValues>({
    values: editing
      ? {
          name: editing.name,
          phone: editing.phone ?? '',
          notes: editing.notes ?? '',
          openingDebt: formatThousands(editing.openingDebt),
        }
      : { name: '', phone: '', notes: '', openingDebt: '' },
  });

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={editing ? `Tahrirlash — ${editing.name}` : 'Yangi mijoz'}
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
        <Field label="Ism" error={errors.name?.message}>
          <input
            {...register('name', { required: "Ism kerak" })}
            placeholder="Karim aka"
            autoFocus
          />
        </Field>
        <Field label="Telefon (ixt.)" error={errors.phone?.message}>
          <input
            {...register('phone')}
            placeholder="+998901112233"
            inputMode="tel"
          />
        </Field>
        <Field label="Izoh (ixt.)">
          <input
            {...register('notes')}
            placeholder="Masalan: do'kondan har payshanba xarid qiladi"
          />
        </Field>
        <Field label="Eski qarz (ixt.)" error={errors.openingDebt?.message}>
          <input
            {...moneyField(register('openingDebt'))}
            placeholder="0"
          />
          <small style={{ color: 'var(--ink-faint)', fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>
            Appdan oldingi mavjud qarz bo'lsa shu yerga yozing
          </small>
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
