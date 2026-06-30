import { useReturnSale } from '../api/sales';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { PaymentTag } from './ui/Tag';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';
import { dateTime, money } from '../lib/format';
import type { PaymentType } from '../types/api';

export interface ReturnSaleInfo {
  id: number;
  date: string;
  amount: string | number;
  paymentType: PaymentType;
  customerName?: string | null;
  items: { name: string; quantity: string | number }[];
}

interface Props {
  sale: ReturnSaleInfo | null;
  onClose: () => void;
  /** Vozvratdan keyin chaqiriladi */
  onReturned?: () => void;
}

// Sotuvni vozvrat qilish tasdiq oynasi — Sotuvlar va Mijoz sahifalarida qayta ishlatiladi.
export function ReturnSaleModal({ sale, onClose, onReturned }: Props) {
  const returnSale = useReturnSale();
  const toast = useToast();

  const confirm = async () => {
    if (!sale) return;
    try {
      await returnSale.mutateAsync(sale.id);
      toast.success('Sotuv vozvrat qilindi');
      onReturned?.();
      onClose();
    } catch (e) {
      toast.error(extractError(e));
    }
  };

  return (
    <Modal
      open={sale !== null}
      onClose={onClose}
      title="Sotuvni vozvrat qilish"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor</Button>
          <Button variant="danger" onClick={confirm} disabled={returnSale.isPending}>
            {returnSale.isPending ? 'Bajarilmoqda...' : 'Ha, vozvrat qilish'}
          </Button>
        </>
      }
    >
      {sale && (
        <div className="ret-confirm">
          <p className="ret-warn">
            Bu sotuv bekor qilinadi va tovarlar omborga qaytariladi. Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <div className="ret-info">
            <div className="row"><span>Vaqt</span><span className="num">{dateTime(sale.date)}</span></div>
            {sale.customerName && (
              <div className="row"><span>Mijoz</span><span>{sale.customerName}</span></div>
            )}
            <div className="row"><span>To'lov</span><PaymentTag type={sale.paymentType} /></div>
            <div className="row total"><span>Summa</span><strong className="num">{money(sale.amount)}</strong></div>
          </div>
          {sale.items.length > 0 && (
            <ul className="ret-items">
              {sale.items.map((i, idx) => (
                <li key={idx}>
                  <span>{i.name}</span>
                  <span className="num">× {i.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <style>{`
        .ret-confirm { display: flex; flex-direction: column; gap: 12px; }
        .ret-warn {
          font-size: 13px; color: var(--brick);
          background: var(--brick-soft); padding: 10px 12px; border-radius: 10px;
        }
        .ret-info { display: flex; flex-direction: column; gap: 6px; }
        .ret-info .row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 13px; color: var(--ink-soft);
        }
        .ret-info .row.total { padding-top: 6px; border-top: 1px dashed var(--line); }
        .ret-info .row.total strong { color: var(--ink); font-size: 15px; }
        .ret-items {
          list-style: none; display: flex; flex-direction: column; gap: 5px;
          padding: 10px 12px; background: var(--paper); border-radius: 9px;
        }
        .ret-items li { display: flex; justify-content: space-between; font-size: 13px; }
        .ret-items li span:first-child { color: var(--ink); }
        .ret-items li span:last-child { color: var(--ink-soft); }
      `}</style>
    </Modal>
  );
}
