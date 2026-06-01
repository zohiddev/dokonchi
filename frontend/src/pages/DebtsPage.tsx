import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCustomerHistory, useDebts, useDebtsSummary, usePayDebt } from '../api/debts';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { date, money } from '../lib/format';
import type { DebtCustomer } from '../types/api';

interface PayFormValues {
  amount: string;
  notes?: string;
}

export function DebtsPage() {
  const debts = useDebts();
  const summary = useDebtsSummary();
  const [payCustomer, setPayCustomer] = useState<DebtCustomer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<DebtCustomer | null>(null);

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
        <small style={{ color: 'var(--ink-soft)' }}>{c.lastCreditDate ? date(c.lastCreditDate, true) : '—'}</small>
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
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => setHistoryCustomer(c)}>
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
          data={debts.data}
          rowKey={(c) => c.id}
          isLoading={debts.isLoading}
          emptyTitle="Qarzdor yo'q"
          emptyDescription="Hozircha hech kim qarzdor emas"
        />
      </Card>

      <PayModal customer={payCustomer} onClose={() => setPayCustomer(null)} />
      <HistoryModal customer={historyCustomer} onClose={() => setHistoryCustomer(null)} />

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

function PayModal({ customer, onClose }: { customer: DebtCustomer | null; onClose: () => void }) {
  const payDebt = usePayDebt();
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PayFormValues>();

  if (!customer) return null;

  const submit = async (v: PayFormValues) => {
    try {
      await payDebt.mutateAsync({
        customerId: customer.id,
        amount: Number(v.amount),
        notes: v.notes,
      });
      toast.success("To'lov qabul qilindi");
      reset();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={customer !== null}
      onClose={() => { reset(); onClose(); }}
      title={`To'lov qabul qilish — ${customer.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button onClick={handleSubmit(submit)} disabled={payDebt.isPending}>
            {payDebt.isPending ? 'Saqlanmoqda...' : 'Qabul qilish'}
          </Button>
        </>
      }
    >
      <div className="pay-info">
        <div className="row">
          <span>Qarz qoldig'i:</span>
          <strong className="num" style={{ color: 'var(--brick)' }}>{money(customer.balance)}</strong>
        </div>
      </div>
      <form className="form" onSubmit={(e) => e.preventDefault()}>
        <Field label="Summa (so'm)" error={errors.amount?.message}>
          <input
            {...register('amount', { required: 'Summa kerak' })}
            inputMode="numeric"
            placeholder="500000"
            autoFocus
          />
        </Field>
        <Field label="Izoh (ixt.)">
          <input {...register('notes')} />
        </Field>
      </form>
      <style>{`
        .pay-info { padding: 11px 13px; background: var(--brick-soft); border-radius: 10px; margin-bottom: 14px; }
        .pay-info .row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
        .form { display: flex; flex-direction: column; gap: 13px; }
      `}</style>
    </Modal>
  );
}

function HistoryModal({ customer, onClose }: { customer: DebtCustomer | null; onClose: () => void }) {
  const history = useCustomerHistory(customer?.id ?? null);

  if (!customer) return null;

  return (
    <Modal open={customer !== null} onClose={onClose} title={`Tarix — ${customer.name}`} width={520}>
      <div className="balance-row">
        <span>Joriy balans:</span>
        <strong className="num" style={{ color: 'var(--brick)' }}>{money(customer.balance)}</strong>
      </div>
      {history.isLoading && <small style={{ color: 'var(--ink-soft)' }}>Yuklanmoqda...</small>}
      {history.data && (
        <ul className="hist-list">
          {history.data.map((entry) => (
            <li key={`${entry.type}-${entry.id}`} className={entry.type}>
              <div className="left">
                <Tag tone={entry.type === 'credit' ? 'brick' : 'green'}>
                  {entry.type === 'credit' ? 'Nasiya' : "To'lov"}
                </Tag>
                <span>{entry.summary}</span>
              </div>
              <div className="right">
                <span className="num" style={{ fontWeight: 600 }}>
                  {entry.type === 'credit' ? '+' : '−'} {money(entry.amount, false)}
                </span>
                <small className="num">{date(entry.date, true)}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
      <style>{`
        .balance-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 13px; background: var(--paper); border-radius: 10px;
          font-size: 13px; margin-bottom: 14px;
        }
        .hist-list { list-style: none; display: flex; flex-direction: column; gap: 9px; }
        .hist-list li {
          display: flex; justify-content: space-between;
          padding: 10px 13px; border: 1px solid var(--line);
          border-radius: 10px; background: var(--paper-2);
        }
        .hist-list .left { display: flex; flex-direction: column; gap: 5px; }
        .hist-list .left span { font-size: 13px; color: var(--ink); }
        .hist-list .right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
        .hist-list .right small { color: var(--ink-soft); font-size: 11.5px; }
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
