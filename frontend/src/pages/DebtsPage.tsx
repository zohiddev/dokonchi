import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useUpdateCustomer } from '../api/customers';
import { useDebts, useDebtsSummary } from '../api/debts';
import { PayDebtModal } from '../components/PayDebtModal';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { FilterBar, FilterSelect, SearchInput } from '../components/ui/Filters';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { date, formatThousands, money, parseAmount } from '../lib/format';
import type { Customer, DebtCustomer } from '../types/api';

export function DebtsPage() {
  const navigate = useNavigate();
  const debts = useDebts();
  const summary = useDebtsSummary();
  const [payCustomer, setPayCustomer] = useState<DebtCustomer | null>(null);
  const [oldDebtOpen, setOldDebtOpen] = useState(false);

  // Filtr + saralash
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'debt-desc' | 'debt-asc' | 'name' | 'recent'>('debt-desc');

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (debts.data ?? []).filter(
      (c) => !q || c.name.toLowerCase().includes(q) || (c.phone ?? '').toLowerCase().includes(q),
    );
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === 'debt-desc') return Number(b.balance) - Number(a.balance);
      if (sort === 'debt-asc') return Number(a.balance) - Number(b.balance);
      if (sort === 'name') return a.name.localeCompare(b.name);
      // recent — so'nggi nasiya sanasi bo'yicha
      const da = a.lastCreditDate ? new Date(a.lastCreditDate).getTime() : 0;
      const db = b.lastCreditDate ? new Date(b.lastCreditDate).getTime() : 0;
      return db - da;
    });
    return sorted;
  }, [debts.data, search, sort]);

  const hasFilter = !!search;
  const clearAll = () => setSearch('');

  const columns: Column<DebtCustomer>[] = [
    {
      key: 'name',
      header: 'Mijoz',
      render: (c) => (
        <div>
          <strong>{c.name}</strong>
          {c.phone && (
            <small className="num" style={{ display: 'block', color: 'var(--ink-soft)' }}>
              {c.phone}
            </small>
          )}
        </div>
      ),
    },
    {
      key: 'lastCredit',
      header: "So'nggi nasiya",
      render: (c) => (
        <small style={{ color: 'var(--ink-soft)' }}>
          {c.lastCreditDate ? date(c.lastCreditDate, true) : '—'}
        </small>
      ),
      width: '130px',
    },
    {
      key: 'totalCredit',
      header: 'Jami nasiya',
      render: (c) => <span className="num">{money(c.totalCredit)}</span>,
      align: 'right',
      width: '160px',
    },
    {
      key: 'totalPaid',
      header: "To'langan",
      render: (c) => <span className="num" style={{ color: 'var(--green-2)' }}>{money(c.totalPaid)}</span>,
      align: 'right',
      width: '160px',
    },
    {
      key: 'balance',
      header: 'Qarz qoldig\'i',
      render: (c) => (
        <span className="num" style={{ color: 'var(--brick)', fontWeight: 600 }}>
          {money(c.balance)}
        </span>
      ),
      align: 'right',
      width: '170px',
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div
          style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/customers/${c.id}`)}
          >
            Tarix
          </Button>
          <Button size="sm" onClick={() => setPayCustomer(c)}>
            To'lov
          </Button>
        </div>
      ),
      align: 'right',
      width: '180px',
    },
  ];

  return (
    <div className="debts-page">
      <FilterBar
        action={
          <Button variant="ghost" onClick={() => setOldDebtOpen(true)} icon={<IconPlus />}>
            Eski qarz qo'shish
          </Button>
        }
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Ism yoki telefon..." />
        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          ariaLabel="Saralash"
          options={[
            { value: 'debt-desc', label: 'Qarz: ko\'p → kam' },
            { value: 'debt-asc', label: 'Qarz: kam → ko\'p' },
            { value: 'name', label: 'Ism (A→Z)' },
            { value: 'recent', label: "So'nggi nasiya" },
          ]}
        />
        {hasFilter && <Button variant="ghost" size="sm" onClick={clearAll}>Tozalash</Button>}
      </FilterBar>

      <div className="summary-row">
        <Card>
          <CardBody>
            <small>JAMI QARZ</small>
            <strong className="serif num">{money(summary.data?.totalDebt ?? 0)}</strong>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <small>QARZDORLAR</small>
            <strong className="serif num">{summary.data?.debtorCount ?? 0}</strong>
          </CardBody>
        </Card>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={visible}
          rowKey={(c) => c.id}
          isLoading={debts.isLoading}
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyTitle="Qarzdor yo'q"
          emptyDescription={hasFilter ? 'Filtrga mos qarzdor topilmadi' : 'Hozircha hech kim qarzdor emas'}
          resetKey={`${search}|${sort}`}
        />
      </Card>

      <PayDebtModal
        customer={
          payCustomer
            ? { id: payCustomer.id, name: payCustomer.name, balance: payCustomer.balance }
            : null
        }
        onClose={() => setPayCustomer(null)}
      />

      <OldDebtModal open={oldDebtOpen} onClose={() => setOldDebtOpen(false)} />

      <style>{`
        .debts-page { display: flex; flex-direction: column; gap: 16px; }
        .summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .summary-row small {
          font-size: 11.5px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-soft); font-weight: 600;
        }
        .summary-row strong {
          display: block; font-size: 24px; margin-top: 6px;
          color: var(--brick); letter-spacing: -.3px;
        }
        @media (max-width: 600px) { .summary-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

// Mavjud mijozga appdan oldingi eski qarzni kiritish modali
function OldDebtModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const customers = useCustomers();
  const updateCustomer = useUpdateCustomer();
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const selected: Customer | undefined = customers.data?.find((c) => c.id === customerId);

  // Tanlangan mijozning hozirgi eski qarzini ko'rsatamiz (tahrirlash uchun)
  useEffect(() => {
    if (selected) setAmount(formatThousands(selected.openingDebt));
  }, [selected]);

  const close = () => {
    setCustomerId('');
    setAmount('');
    onClose();
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateCustomer.mutateAsync({
        id: selected.id,
        name: selected.name,
        openingDebt: parseAmount(amount),
      });
      toast.success('Eski qarz saqlandi');
      close();
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Eski qarz qo'shish"
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={submit} disabled={!selected || saving}>
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <div className="old-debt-form">
        <label className="field">
          <span>Mijoz</span>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
            autoFocus
          >
            <option value="">— mijozni tanlang —</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Eski qarz summasi (so'm)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(formatThousands(e.target.value))}
            inputMode="numeric"
            placeholder="500 000"
          />
        </label>
        <p className="hint">
          Mijoz ro'yxatda bo'lmasa, avval "Mijozlar" bo'limidan qo'shing.
        </p>
      </div>

      <style>{`
        .old-debt-form { display: flex; flex-direction: column; gap: 14px; }
        .old-debt-form .field { display: flex; flex-direction: column; gap: 5px; }
        .old-debt-form .field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .old-debt-form input, .old-debt-form select {
          padding: 10px 12px;
          border: 1px solid var(--line-strong);
          border-radius: 9px;
          background: var(--paper-2);
          color: var(--ink);
          outline: none; font-family: inherit;
        }
        .old-debt-form input:focus, .old-debt-form select:focus {
          border-color: var(--accent); background: var(--card);
        }
        .old-debt-form .hint { margin: 0; font-size: 12px; color: var(--ink-faint); }
      `}</style>
    </Modal>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
