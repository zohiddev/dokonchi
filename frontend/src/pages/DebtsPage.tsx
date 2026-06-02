import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebts, useDebtsSummary } from '../api/debts';
import { PayDebtModal } from '../components/PayDebtModal';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { date, money } from '../lib/format';
import type { DebtCustomer } from '../types/api';

export function DebtsPage() {
  const navigate = useNavigate();
  const debts = useDebts();
  const summary = useDebtsSummary();
  const [payCustomer, setPayCustomer] = useState<DebtCustomer | null>(null);

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
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
          emptyTitle="Qarzdor yo'q"
          emptyDescription="Hozircha hech kim qarzdor emas"
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
