import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useSupplier,
  useSupplierBalance,
  useSupplierHistory,
  usePaySupplier,
  type SupplierHistoryEntry,
} from '../api/suppliers';
import { BotInviteButton } from '../components/BotInviteButton';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Tag } from '../components/ui/Tag';
import { useToast } from '../components/ui/Toast';
import { extractError } from '../lib/axios';
import { dateTime, formatThousands, money, parseAmount, qty } from '../lib/format';

export function SupplierDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const supplierId = id ? Number(id) : null;

  const supplier = useSupplier(supplierId);
  const balance = useSupplierBalance(supplierId);
  const history = useSupplierHistory(supplierId);

  const [payOpen, setPayOpen] = useState(false);

  if (supplier.isLoading) {
    return <div style={{ padding: 32, textAlign: 'center' }}><Spinner /></div>;
  }
  if (!supplier.data) {
    return (
      <EmptyState
        title="Ta'minotchi topilmadi"
        description="Bunday ta'minotchi mavjud emas"
        action={<Button onClick={() => navigate('/suppliers')}>Ta'minotchilar ro'yxati</Button>}
      />
    );
  }

  const s = supplier.data;
  const b = balance.data;
  const hasDebt = b ? Number(b.balance) > 0 : false;

  return (
    <div className="sd-page">
      <div className="sd-top">
        <Link to="/suppliers" className="back-link">← Ta'minotchilar</Link>
        <Button onClick={() => setPayOpen(true)} icon={<IconPay />}>
          To'lov qilish
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="head-row">
            <div className="head-info">
              <h1 className="serif">{s.name}</h1>
              {s.phone && <a href={`tel:${s.phone}`} className="phone num">{s.phone}</a>}
              {s.notes && <p className="notes">{s.notes}</p>}
            </div>
            <div className="head-status">
              <Tag tone={hasDebt ? 'brick' : 'green'}>
                {hasDebt ? `Qarz: ${money(b?.balance ?? 0, false)}` : 'Qarzsiz'}
              </Tag>
              <Tag tone={s.telegramChatId ? 'green' : 'gray'}>
                {s.telegramChatId ? '📨 Telegram ulangan' : '📨 Telegram ulanmagan'}
              </Tag>
              {!s.telegramChatId && (
                <>
                  <small className="tg-hint">Bildirishnoma uchun ta'minotchi botga raqamini ulashi kerak</small>
                  <BotInviteButton name={s.name} />
                </>
              )}
            </div>
          </div>

          {/* Hisob-kitob — qarz holati */}
          <div className="stat-block">
            <div className="stat-label">Hisob-kitob</div>
            <div className="kpi-strip">
              <div className="kpi">
                <small>JAMI OLINGAN TOVAR</small>
                <strong className="num">{money(b?.totalPurchased ?? 0)}</strong>
                <span>tannarx bo'yicha</span>
              </div>
              <div className="kpi">
                <small>TO'LANGAN</small>
                <strong className="num up">{money(b?.totalPaid ?? 0)}</strong>
              </div>
              <div className="kpi big">
                <small>JORIY QARZ</small>
                <strong className={`num ${hasDebt ? 'dn' : 'up'}`}>{money(b?.balance ?? 0)}</strong>
              </div>
            </div>
          </div>

          {/* Tovar aylanmasi */}
          <div className="stat-block">
            <div className="stat-label">Tovar aylanmasi (tannarx)</div>
            <div className="kpi-strip">
              <div className="kpi">
                <small>SOTILGAN</small>
                <strong className="num">{money(b?.soldCostValue ?? 0)}</strong>
              </div>
              <div className="kpi">
                <small>OMBORDA QOLGAN</small>
                <strong className="num">{money(b?.remainingCostValue ?? 0)}</strong>
              </div>
              <div className="kpi">
                <small>PARTIYALAR</small>
                <strong className="num">{b?.batchCount ?? 0} ta</strong>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="hist-section">
        <h2 className="serif">Oldi-berdi tarixi</h2>
        {history.isLoading && <Spinner label="Yuklanmoqda..." />}
        {history.data && history.data.length === 0 && (
          <Card>
            <CardBody>
              <EmptyState
                title="Tarix bo'sh"
                description="Bu ta'minotchidan hali partiya olinmagan"
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
                  <SupplierEntry entry={entry} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SupplierPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        supplier={{ id: s.id, name: s.name }}
        balance={b?.balance}
      />

      <style>{`
        .sd-page { display: flex; flex-direction: column; gap: 16px; }
        .sd-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .back-link { color: var(--ink-soft); font-size: 13px; font-weight: 500; padding: 4px 0; }
        .back-link:hover { color: var(--accent); }

        .head-row {
          display: flex; gap: 16px; justify-content: space-between; align-items: start;
          flex-wrap: wrap;
        }
        .head-info h1 { font-size: 26px; font-weight: 600; color: var(--ink); letter-spacing: -.4px; }
        .head-info .phone { display: block; color: var(--ink-soft); font-size: 14px; margin-top: 4px; }
        .head-info .phone:hover { color: var(--accent); }
        .head-info .notes { color: var(--ink-soft); font-size: 13px; margin-top: 6px; max-width: 460px; }
        .head-status { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .head-status .tg-hint { font-size: 11px; color: var(--ink-faint); max-width: 210px; text-align: right; }

        .stat-block { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); }
        .stat-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-faint); font-weight: 700; margin-bottom: 12px;
        }
        .kpi-strip { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 14px; }
        .kpi { display: flex; flex-direction: column; gap: 4px; }
        .kpi small {
          font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px;
          color: var(--ink-soft); font-weight: 700;
        }
        .kpi strong { font-family: 'Fraunces', serif; font-size: 22px; color: var(--ink); letter-spacing: -.3px; }
        .kpi.big strong { font-size: 26px; }
        .kpi .up { color: var(--green); }
        .kpi .dn { color: var(--brick); }
        .kpi span { font-size: 11.5px; color: var(--ink-faint); }
        @media (max-width: 640px) {
          .kpi-strip { grid-template-columns: 1fr 1fr; }
          .kpi.big { grid-column: 1 / -1; }
        }

        .hist-section { display: flex; flex-direction: column; gap: 10px; }
        .hist-section h2 { font-size: 18px; font-weight: 600; }
        .timeline { list-style: none; display: flex; flex-direction: column; gap: 12px; position: relative; }
        .tl-entry { position: relative; padding-left: 30px; }
        .tl-dot {
          position: absolute; left: 8px; top: 14px;
          width: 12px; height: 12px; border-radius: 50%;
          z-index: 2; border: 3px solid var(--paper);
        }
        .tl-entry.purchase .tl-dot { background: var(--brick); }
        .tl-entry.payment .tl-dot { background: var(--green); }
        .tl-line {
          position: absolute; left: 13px; top: 28px;
          width: 2px; height: calc(100% + 12px);
          background: var(--line); z-index: 1;
        }
        .tl-card {
          background: var(--card); border: 1px solid var(--line);
          border-radius: 12px; padding: 14px 16px;
        }
      `}</style>
    </div>
  );
}

function SupplierEntry({ entry }: { entry: SupplierHistoryEntry }) {
  const isPurchase = entry.type === 'purchase';
  return (
    <div>
      <div className="se-head">
        <div>
          <Tag tone={isPurchase ? 'brick' : 'green'}>
            {isPurchase ? '📦 Tovar olindi' : '💵 To\'lov'}
          </Tag>
          <span className="se-date num">{dateTime(entry.date)}</span>
        </div>
        <strong className="num se-amt" style={{ color: isPurchase ? 'var(--brick)' : 'var(--green)' }}>
          {isPurchase ? '+ ' : '− '}{money(entry.amount)}
        </strong>
      </div>

      {isPurchase && (
        <div className="se-body">
          <span className="se-prod">{entry.productName}</span>
          <span className="se-detail num">
            {qty(entry.quantityReceived, entry.unit)} × {money(entry.costPricePerUnit, false)}
          </span>
        </div>
      )}

      {entry.notes && <p className="se-notes">{entry.notes}</p>}

      <div className="se-footer">
        <small className="balance">
          Qarz: <strong className="num">{money(entry.runningBalance, false)}</strong>
        </small>
      </div>

      <style>{`
        .se-head {
          display: flex; justify-content: space-between; align-items: start;
          gap: 10px; margin-bottom: 8px;
        }
        .se-head > div:first-child { display: flex; flex-direction: column; gap: 5px; align-items: start; }
        .se-date { font-size: 11.5px; color: var(--ink-soft); }
        .se-amt { font-size: 16px; font-weight: 700; }
        .se-body {
          display: flex; justify-content: space-between; gap: 10px; align-items: baseline;
          padding: 8px 12px; background: var(--paper); border-radius: 9px; margin-bottom: 8px;
        }
        .se-prod { font-size: 13px; font-weight: 600; color: var(--ink); }
        .se-detail { font-size: 12px; color: var(--ink-soft); }
        .se-notes { font-size: 12.5px; color: var(--ink-soft); font-style: italic; margin-bottom: 8px; }
        .se-footer {
          display: flex; justify-content: flex-end;
          padding-top: 8px; border-top: 1px dashed var(--line);
        }
        .se-footer small { font-size: 11.5px; color: var(--ink-soft); }
        .se-footer .balance strong { color: var(--brick); font-weight: 700; }
      `}</style>
    </div>
  );
}

function SupplierPaymentModal({
  open,
  onClose,
  supplier,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  supplier: { id: number; name: string };
  balance?: string;
}) {
  const toast = useToast();
  const paySupplier = usePaySupplier();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const close = () => {
    setAmount('');
    setNotes('');
    onClose();
  };

  const submit = async () => {
    const amt = parseAmount(amount);
    if (amt <= 0) {
      toast.error('Summani kiriting');
      return;
    }
    try {
      await paySupplier.mutateAsync({
        supplierId: supplier.id,
        amount: amt,
        notes: notes.trim() || undefined,
      });
      toast.success(`To'lov saqlandi — ${supplier.name}`);
      close();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`To'lov qilish — ${supplier.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>Bekor</Button>
          <Button onClick={submit} disabled={paySupplier.isPending}>
            {paySupplier.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </Button>
        </>
      }
    >
      <div className="sp-form">
        {balance !== undefined && (
          <div className="sp-balance">
            <span>Joriy qarz:</span>
            <strong className="num">{money(balance)}</strong>
          </div>
        )}
        <label className="sp-field">
          <span>To'lov summasi (so'm)</span>
          <input
            value={amount}
            onChange={(e) => setAmount(formatThousands(e.target.value))}
            inputMode="numeric"
            placeholder="1 000 000"
            autoFocus
          />
        </label>
        <label className="sp-field">
          <span>Izoh (ixtiyoriy)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tafsilot" />
        </label>
      </div>

      <style>{`
        .sp-form { display: flex; flex-direction: column; gap: 13px; }
        .sp-balance {
          display: flex; justify-content: space-between; align-items: center;
          padding: 11px 13px; background: var(--brick-soft); border-radius: 10px; font-size: 13px;
        }
        .sp-balance strong { color: var(--brick); }
        .sp-field { display: flex; flex-direction: column; gap: 5px; }
        .sp-field span {
          font-size: 12px; color: var(--ink-soft); font-weight: 500;
          text-transform: uppercase; letter-spacing: .4px;
        }
        .sp-field input {
          padding: 10px 12px; border: 1px solid var(--line-strong);
          border-radius: 9px; background: var(--paper-2); outline: none;
          font-family: inherit; color: var(--ink);
        }
        .sp-field input:focus { border-color: var(--accent); background: var(--card); }
      `}</style>
    </Modal>
  );
}

function IconPay() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
