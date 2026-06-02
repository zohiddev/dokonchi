import { useMemo, useState } from 'react';
import { useDeleteExpense, useExpenses } from '../api/expenses';
import { ExpenseModal } from '../components/ExpenseModal';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { DataTable, type Column } from '../components/ui/DataTable';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { date, money } from '../lib/format';
import type { Expense } from '../types/api';

function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function ExpensesPage() {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonthIso());
  const expenses = useExpenses(month);
  const deleteExpense = useDeleteExpense();
  const [modalOpen, setModalOpen] = useState(false);

  // Jami summa va toifalar bo'yicha
  const totals = useMemo(() => {
    const list = expenses.data ?? [];
    const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
    const byCategory = new Map<string, number>();
    for (const e of list) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + Number(e.amount));
    }
    const topCategories = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return { total, count: list.length, topCategories };
  }, [expenses.data]);

  const handleDelete = async (e: Expense) => {
    if (!confirm(`"${e.category}" — ${money(e.amount)} xarajatini o'chirish?`)) return;
    try {
      await deleteExpense.mutateAsync(e.id);
      toast.success("Xarajat o'chirildi");
    } catch (err) {
      toast.error(extractError(err));
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: 'date',
      header: 'Sana',
      render: (e) => <span className="num">{date(e.expenseDate, true)}</span>,
      width: '130px',
    },
    {
      key: 'category',
      header: 'Toifa',
      render: (e) => <Tag tone="brick">{e.category}</Tag>,
      width: '180px',
    },
    {
      key: 'notes',
      header: 'Izoh',
      render: (e) =>
        e.notes ? (
          <span style={{ color: 'var(--ink-soft)' }}>{e.notes}</span>
        ) : (
          <small style={{ color: 'var(--ink-faint)' }}>—</small>
        ),
    },
    {
      key: 'amount',
      header: 'Summa',
      render: (e) => (
        <span className="num" style={{ color: 'var(--brick)', fontWeight: 600 }}>
          {money(e.amount)}
        </span>
      ),
      align: 'right',
      width: '170px',
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={() => handleDelete(e)}>
          O'chirish
        </Button>
      ),
      align: 'right',
      width: '110px',
    },
  ];

  return (
    <div className="exp-page">
      {/* Summary + filter */}
      <div className="top-row">
        <div className="left">
          <Card>
            <CardBody>
              <small className="lbl">JAMI XARAJAT ({month})</small>
              <strong className="big num">{money(totals.total)}</strong>
              <small className="sub">{totals.count} ta yozuv</small>
            </CardBody>
          </Card>
          {totals.topCategories.length > 0 && (
            <Card>
              <CardBody>
                <small className="lbl">TOP TOIFALAR</small>
                <ul className="topcat">
                  {totals.topCategories.map(([cat, sum]) => (
                    <li key={cat}>
                      <Tag tone="brick">{cat}</Tag>
                      <span className="num">{money(sum, false)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
        <div className="right">
          <label className="month-pick-wrap">
            <span>Oy:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              max={currentMonthIso()}
            />
          </label>
          <Button onClick={() => setModalOpen(true)} icon={<IconPlus />}>
            Yangi xarajat
          </Button>
        </div>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={expenses.data}
          rowKey={(e) => e.id}
          isLoading={expenses.isLoading}
          emptyTitle="Xarajat yo'q"
          emptyDescription="Bu oyda xarajat qayd etilmagan"
        />
      </Card>

      <ExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} />

      <style>{`
        .exp-page { display: flex; flex-direction: column; gap: 16px; }
        .top-row {
          display: grid; grid-template-columns: 2fr auto; gap: 14px;
          align-items: start;
        }
        .top-row .left { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .top-row .right {
          display: flex; flex-direction: column; gap: 10px;
          align-items: flex-end;
        }
        .lbl {
          font-size: 11.5px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-soft); font-weight: 600;
        }
        .big { display: block; font-size: 24px; margin-top: 6px; color: var(--brick); letter-spacing: -.2px; }
        .sub { color: var(--ink-faint); font-size: 12px; display: block; margin-top: 2px; }
        .topcat { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        .topcat li {
          display: flex; justify-content: space-between; align-items: center; gap: 8px;
          font-size: 12.5px;
        }
        .topcat .num { color: var(--ink); font-weight: 600; }
        .month-pick-wrap {
          display: flex; align-items: center; gap: 8px;
          background: var(--card); border: 1px solid var(--line);
          padding: 7px 11px; border-radius: 9px;
        }
        .month-pick-wrap span {
          font-size: 11.5px; color: var(--ink-soft); text-transform: uppercase;
          letter-spacing: .4px; font-weight: 500;
        }
        .month-pick-wrap input {
          border: none; background: none; outline: none;
          font-family: inherit; color: var(--ink);
        }
        @media (max-width: 880px) {
          .top-row { grid-template-columns: 1fr; }
          .top-row .left { grid-template-columns: 1fr 1fr; }
          .top-row .right { flex-direction: row; align-items: center; }
        }
      `}</style>
    </div>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
