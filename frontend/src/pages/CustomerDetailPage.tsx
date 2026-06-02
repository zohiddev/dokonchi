import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomer, useCustomerBalance } from '../api/customers';
import { useCustomerHistory, type DebtHistoryEntry } from '../api/debts';
import { PayDebtModal } from '../components/PayDebtModal';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Tag } from '../components/ui/Tag';
import { dateTime, money, qty } from '../lib/format';

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const customerId = id ? Number(id) : null;

  const customer = useCustomer(customerId);
  const balance = useCustomerBalance(customerId);
  const history = useCustomerHistory(customerId);

  const [payOpen, setPayOpen] = useState(false);

  if (customer.isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}><Spinner /></div>;
  }

  if (!customer.data) {
    return (
      <EmptyState
        title="Mijoz topilmadi"
        description="Bunday mijoz mavjud emas"
        action={<Button onClick={() => navigate('/customers')}>Mijozlar ro'yxati</Button>}
      />
    );
  }

  const c = customer.data;
  const b = balance.data;
  const hasDebt = b ? Number(b.balance) > 0 : false;

  // Statistika
  const allEntries = history.data ?? [];
  const credits = allEntries.filter((e) => e.type === 'credit');
  const payments = allEntries.filter((e) => e.type === 'payment');

  return (
    <div className="cd-page">
      <Link to="/customers" className="back-link">
        ← Mijozlar
      </Link>

      {/* Sarlavha + asosiy ko'rsatkichlar */}
      <Card>
        <CardBody>
          <div className="head-row">
            <div className="head-info">
              <h1 className="serif">{c.name}</h1>
              {c.phone && <a href={`tel:${c.phone}`} className="phone num">{c.phone}</a>}
              {c.notes && <p className="notes">{c.notes}</p>}
            </div>
            <div className="head-status">
              <Tag tone={hasDebt ? 'brick' : 'green'}>
                {hasDebt ? `Qarz: ${money(b?.balance ?? 0, false)}` : 'Toza'}
              </Tag>
            </div>
          </div>

          {b && (
            <div className="kpi-strip">
              <div className="kpi">
                <small>JAMI NASIYA</small>
                <strong className="num">{money(b.totalCredit)}</strong>
                <span>{credits.length} ta sotuv</span>
              </div>
              <div className="kpi">
                <small>TO'LANGAN</small>
                <strong className="num up">{money(b.totalPaid)}</strong>
                <span>{payments.length} ta to'lov</span>
              </div>
              <div className="kpi big">
                <small>JORIY QARZ</small>
                <strong className={`num ${hasDebt ? 'dn' : 'up'}`}>{money(b.balance)}</strong>
                {hasDebt && (
                  <Button size="sm" onClick={() => setPayOpen(true)}>
                    To'lov qabul qilish
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tarix */}
      <div className="hist-section">
        <h2 className="serif">Tarix</h2>
        {history.isLoading && <Spinner label="Yuklanmoqda..." />}
        {history.data && history.data.length === 0 && (
          <Card>
            <CardBody>
              <EmptyState
                title="Tarix bo'sh"
                description="Bu mijoz hali nasiyaga olmagan"
              />
            </CardBody>
          </Card>
        )}
        {history.data && history.data.length > 0 && (
          <ul className="timeline">
            {history.data.map((entry, idx) => (
              <li key={`${entry.type}-${entry.id}`} className={`tl-entry ${entry.type}`}>
                <div className="tl-dot" />
                {idx < history.data!.length - 1 && <div className="tl-line" />}
                <div className="tl-card">
                  <HistoryEntry entry={entry} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PayDebtModal
        customer={
          payOpen && b
            ? { id: c.id, name: c.name, balance: b.balance }
            : null
        }
        onClose={() => setPayOpen(false)}
      />

      <style>{`
        .cd-page { display: flex; flex-direction: column; gap: 16px; }
        .back-link {
          color: var(--ink-soft); font-size: 13px;
          font-weight: 500; align-self: flex-start;
          padding: 4px 0;
        }
        .back-link:hover { color: var(--green); }

        .head-row {
          display: flex; gap: 16px;
          justify-content: space-between; align-items: start;
          flex-wrap: wrap;
        }
        .head-info h1 {
          font-size: 26px; font-weight: 600; color: var(--ink);
          letter-spacing: -.4px;
        }
        .head-info .phone {
          display: block; color: var(--ink-soft); font-size: 14px;
          margin-top: 4px;
        }
        .head-info .phone:hover { color: var(--green); }
        .head-info .notes {
          color: var(--ink-soft); font-size: 13px;
          margin-top: 6px; max-width: 460px;
        }

        .kpi-strip {
          display: grid;
          grid-template-columns: 1fr 1fr 1.4fr;
          gap: 14px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }
        .kpi {
          display: flex; flex-direction: column; gap: 4px;
        }
        .kpi small {
          font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-soft); font-weight: 700;
        }
        .kpi strong {
          font-family: 'Fraunces', serif;
          font-size: 22px; color: var(--ink); letter-spacing: -.3px;
        }
        .kpi.big strong { font-size: 26px; }
        .kpi .up { color: var(--green); }
        .kpi .dn { color: var(--brick); }
        .kpi span {
          font-size: 11.5px; color: var(--ink-faint);
        }
        .kpi.big {
          align-items: flex-start;
        }
        .kpi.big button { margin-top: 8px; }
        @media (max-width: 640px) {
          .kpi-strip { grid-template-columns: 1fr 1fr; }
          .kpi.big { grid-column: 1 / -1; }
        }

        /* Timeline */
        .hist-section { display: flex; flex-direction: column; gap: 10px; }
        .hist-section h2 { font-size: 18px; font-weight: 600; }
        .timeline { list-style: none; display: flex; flex-direction: column; gap: 12px; position: relative; }
        .tl-entry { position: relative; padding-left: 30px; }
        .tl-dot {
          position: absolute; left: 8px; top: 14px;
          width: 12px; height: 12px; border-radius: 50%;
          z-index: 2; border: 3px solid var(--paper);
        }
        .tl-entry.credit .tl-dot { background: var(--brick); }
        .tl-entry.payment .tl-dot { background: var(--green); }
        .tl-line {
          position: absolute; left: 13px; top: 28px;
          width: 2px; height: calc(100% + 12px);
          background: var(--line);
          z-index: 1;
        }
        .tl-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 14px 16px;
        }
      `}</style>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: DebtHistoryEntry }) {
  if (entry.type === 'credit') {
    return (
      <div>
        <div className="he-head">
          <div>
            <Tag tone="brick">📝 Nasiya sotuvi</Tag>
            <span className="he-date num">{dateTime(entry.date)}</span>
          </div>
          <strong className="num he-amt" style={{ color: 'var(--brick)' }}>
            + {money(entry.amount)}
          </strong>
        </div>

        {entry.items && entry.items.length > 0 && (
          <ul className="he-items">
            {entry.items.map((it, i) => (
              <li key={i}>
                <span className="he-name">{it.productName}</span>
                <span className="he-detail num">
                  {qty(it.quantity, it.unit)} × {money(it.unitPrice, false)}
                </span>
                <span className="he-total num">{money(it.lineTotal, false)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="he-footer">
          {entry.totalCost && entry.profit && (
            <small>
              Tannarx: <span className="num">{money(entry.totalCost, false)}</span> ·
              Foyda: <span className="num" style={{ color: 'var(--green)' }}>{money(entry.profit, false)}</span>
            </small>
          )}
          <small className="balance">
            Balans: <strong className="num">{money(entry.runningBalance, false)}</strong>
          </small>
        </div>

        {entry.notes && <p className="he-notes">{entry.notes}</p>}

        <style>{`
          .he-head {
            display: flex; justify-content: space-between; align-items: start;
            gap: 10px; margin-bottom: 10px;
          }
          .he-head > div:first-child {
            display: flex; flex-direction: column; gap: 5px;
            align-items: start;
          }
          .he-date { font-size: 11.5px; color: var(--ink-soft); }
          .he-amt { font-size: 16px; font-weight: 700; }

          .he-items {
            list-style: none; display: flex; flex-direction: column; gap: 6px;
            padding: 10px 12px;
            background: var(--paper);
            border-radius: 9px;
            margin-bottom: 9px;
          }
          .he-items li {
            display: grid; grid-template-columns: 1fr auto auto;
            gap: 10px; align-items: baseline;
            font-size: 13px;
          }
          .he-name { color: var(--ink); font-weight: 500; }
          .he-detail { color: var(--ink-soft); font-size: 12px; }
          .he-total { color: var(--ink); font-weight: 600; }

          .he-footer {
            display: flex; justify-content: space-between; align-items: baseline;
            gap: 10px; flex-wrap: wrap;
            padding-top: 8px;
            border-top: 1px dashed var(--line);
          }
          .he-footer small { font-size: 11.5px; color: var(--ink-soft); }
          .he-footer .balance strong { color: var(--brick); font-weight: 700; }

          .he-notes {
            margin-top: 8px;
            font-size: 12px; color: var(--ink-soft);
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  // payment
  return (
    <div>
      <div className="he-head">
        <div>
          <Tag tone="green">💵 To'lov</Tag>
          <span className="he-date num">{dateTime(entry.date)}</span>
        </div>
        <strong className="num he-amt" style={{ color: 'var(--green)' }}>
          − {money(entry.amount)}
        </strong>
      </div>
      {entry.notes && <p className="he-notes">{entry.notes}</p>}
      <div className="he-footer">
        <small></small>
        <small className="balance">
          Balans: <strong className="num">{money(entry.runningBalance, false)}</strong>
        </small>
      </div>

      <style>{`
        .he-head {
          display: flex; justify-content: space-between; align-items: start;
          gap: 10px; margin-bottom: 8px;
        }
        .he-head > div:first-child {
          display: flex; flex-direction: column; gap: 5px;
          align-items: start;
        }
        .he-date { font-size: 11.5px; color: var(--ink-soft); }
        .he-amt { font-size: 16px; font-weight: 700; }
        .he-notes {
          font-size: 12.5px; color: var(--ink-soft);
          margin-bottom: 8px;
        }
        .he-footer {
          display: flex; justify-content: space-between; align-items: baseline;
          padding-top: 8px;
          border-top: 1px dashed var(--line);
        }
        .he-footer small { font-size: 11.5px; color: var(--ink-soft); }
        .he-footer .balance strong { color: var(--brick); font-weight: 700; }
      `}</style>
    </div>
  );
}
