import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomer, useCustomerBalance } from '../api/customers';
import { useCustomerHistory, type DebtHistoryEntry } from '../api/debts';
import { BotInviteButton } from '../components/BotInviteButton';
import { PayDebtModal } from '../components/PayDebtModal';
import { QuickCustomerSaleModal } from '../components/QuickCustomerSaleModal';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Tag, type TagTone } from '../components/ui/Tag';
import { dateTime, money, qty } from '../lib/format';

export function CustomerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const customerId = id ? Number(id) : null;

  const customer = useCustomer(customerId);
  const balance = useCustomerBalance(customerId);
  const history = useCustomerHistory(customerId);

  const [payOpen, setPayOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);

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

  // Statistika — barcha xaridlar (naqd/karta/nasiya); eski qarz yozug'i hisobga olinmaydi
  const allEntries = history.data ?? [];
  const saleEntries = allEntries.filter((e) => e.type === 'sale' && !e.isOpening);
  const payments = allEntries.filter((e) => e.type === 'payment');
  const purchaseRevenue = saleEntries.reduce((s, e) => s + Number(e.amount), 0);
  const purchaseProfit = saleEntries.reduce((s, e) => s + Number(e.profit ?? 0), 0);

  return (
    <div className="cd-page">
      <div className="cd-top">
        <Link to="/customers" className="back-link">
          ← Mijozlar
        </Link>
        <div className="cd-actions">
          <Button onClick={() => setSaleOpen(true)} icon={<IconSell />}>
            Mijozga sotish
          </Button>
          <Button variant="ghost" onClick={() => setPayOpen(true)} icon={<IconReceive />}>
            Qarz to'lash
          </Button>
        </div>
      </div>

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
              <Tag tone={c.telegramChatId ? 'green' : 'gray'}>
                {c.telegramChatId ? '📨 Telegram ulangan' : '📨 Telegram ulanmagan'}
              </Tag>
              {!c.telegramChatId && (
                <>
                  <small className="tg-hint">Bildirishnoma uchun mijoz botga raqamini ulashi kerak</small>
                  <BotInviteButton name={c.name} />
                </>
              )}
            </div>
          </div>

          {/* Xarid va foyda — barcha oldi-sotdi (to'lov turidan qat'i nazar) */}
          <div className="stat-block">
            <div className="stat-label">Xarid va foyda</div>
            <div className="kpi-strip">
              <div className="kpi">
                <small>JAMI XARID</small>
                <strong className="num">{money(purchaseRevenue)}</strong>
                <span>{saleEntries.length} ta xarid</span>
              </div>
              <div className="kpi">
                <small>JAMI FOYDA</small>
                <strong className="num up">{money(purchaseProfit)}</strong>
                <span>bizga keltirgan foyda</span>
              </div>
              <div className="kpi">
                <small>O'RTACHA CHEK</small>
                <strong className="num">
                  {money(saleEntries.length ? purchaseRevenue / saleEntries.length : 0)}
                </strong>
              </div>
            </div>
          </div>

          {/* Qarz holati — faqat nasiya/to'lov; xariddan alohida */}
          {b && (
            <div className="stat-block">
              <div className="stat-label">Qarz holati</div>
              <div className="kpi-strip">
                <div className="kpi">
                  <small>JAMI NASIYA</small>
                  <strong className="num">{money(b.totalCredit)}</strong>
                </div>
                <div className="kpi">
                  <small>TO'LANGAN</small>
                  <strong className="num up">{money(b.totalPaid)}</strong>
                  <span>{payments.length} ta to'lov</span>
                </div>
                <div className="kpi big">
                  <small>JORIY QARZ</small>
                  <strong className={`num ${hasDebt ? 'dn' : 'up'}`}>{money(b.balance)}</strong>
                </div>
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
                description="Bu mijoz hali hech narsa sotib olmagan"
              />
            </CardBody>
          </Card>
        )}
        {history.data && history.data.length > 0 && (
          <ul className="timeline">
            {history.data.map((entry, idx) => {
              const cls =
                entry.type === 'payment'
                  ? 'payment'
                  : entry.paymentType === 'NASIYA'
                    ? 'credit'
                    : 'paid';
              return (
                <li key={`${entry.type}-${entry.id}`} className={`tl-entry ${cls}`}>
                  <div className="tl-dot" />
                  {idx < history.data!.length - 1 && <div className="tl-line" />}
                  <div className="tl-card">
                    <HistoryEntry entry={entry} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <PayDebtModal
        customer={
          payOpen
            ? { id: c.id, name: c.name, balance: b?.balance }
            : null
        }
        onClose={() => setPayOpen(false)}
      />

      <QuickCustomerSaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        lockedCustomer={{ id: c.id, name: c.name, phone: c.phone }}
      />

      <style>{`
        .cd-page { display: flex; flex-direction: column; gap: 16px; }
        .cd-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .cd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .back-link {
          color: var(--ink-soft); font-size: 13px;
          font-weight: 500;
          padding: 4px 0;
        }
        .back-link:hover { color: var(--accent); }

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
        .head-info .phone:hover { color: var(--accent); }
        .head-info .notes {
          color: var(--ink-soft); font-size: 13px;
          margin-top: 6px; max-width: 460px;
        }
        .head-status { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .head-status .tg-hint { font-size: 11px; color: var(--ink-faint); max-width: 210px; text-align: right; }

        .stat-block {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }
        .stat-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-faint); font-weight: 700; margin-bottom: 12px;
        }
        .kpi-strip {
          display: grid;
          grid-template-columns: 1fr 1fr 1.4fr;
          gap: 14px;
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
        .tl-entry.paid .tl-dot { background: var(--accent); }
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

function IconSell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="18" cy="21" r="1" />
    </svg>
  );
}

function IconReceive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 18h16" />
    </svg>
  );
}

function HistoryEntry({ entry }: { entry: DebtHistoryEntry }) {
  if (entry.type === 'sale') {
    // Faqat nasiya (va eski qarz) qarz qoldig'iga ta'sir qiladi
    const affectsDebt = !!entry.isOpening || entry.paymentType === 'NASIYA';
    const tag: { tone: TagTone; label: string } = entry.isOpening
      ? { tone: 'brick', label: '📝 Eski qarz' }
      : entry.paymentType === 'NASIYA'
        ? { tone: 'brick', label: '📝 Nasiya sotuvi' }
        : entry.paymentType === 'KARTA'
          ? { tone: 'amber', label: '💳 Karta xarid' }
          : { tone: 'green', label: '💵 Naqd xarid' };

    return (
      <div>
        <div className="he-head">
          <div>
            <Tag tone={tag.tone}>{tag.label}</Tag>
            <span className="he-date num">{dateTime(entry.date)}</span>
          </div>
          <strong className="num he-amt" style={{ color: affectsDebt ? 'var(--brick)' : 'var(--ink)' }}>
            {affectsDebt ? '+ ' : ''}{money(entry.amount)}
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
          {!entry.isOpening && entry.totalCost !== undefined && entry.profit !== undefined && (
            <small>
              Tannarx: <span className="num">{money(entry.totalCost, false)}</span> ·
              Foyda: <span className="num" style={{ color: 'var(--green)' }}>{money(entry.profit, false)}</span>
            </small>
          )}
          {affectsDebt ? (
            <small className="balance">
              Qarz: <strong className="num">{money(entry.runningBalance, false)}</strong>
            </small>
          ) : (
            <small className="paid-pill">To'langan ✓</small>
          )}
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
          .he-footer .paid-pill { color: var(--green); font-weight: 600; }

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
