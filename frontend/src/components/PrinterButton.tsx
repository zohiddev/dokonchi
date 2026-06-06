import { useEffect, useRef, useState } from 'react';
import { usePrinter } from './PrinterContext';
import { useToast } from './ui/Toast';
import { extractError } from '../lib/axios';

const STATUS_META = {
  unsupported: { dot: '#9aa3b0', label: 'Printer (qo\'llanmaydi)' },
  disconnected: { dot: '#d14343', label: 'Printer ulanmagan' },
  connected: { dot: '#2e9e6b', label: 'Printer ulangan' },
  printing: { dot: '#c2791a', label: 'Chop qilinmoqda...' },
} as const;

export function PrinterButton() {
  const printer = usePrinter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const meta = STATUS_META[printer.status];
  const { settings } = printer;

  // Tashqariga bosilganda popoverni yopish
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      await printer.connect();
      toast.success('Printer ulandi');
    } catch (e) {
      // Foydalanuvchi tanlovni bekor qilsa — jim o'tamiz
      const msg = extractError(e);
      if (!/cancel|no device selected|tanlanmadi/i.test(msg)) toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      await printer.testPrint();
      toast.success('Sinov cheki yuborildi');
    } catch (e) {
      toast.error(extractError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="prn" ref={ref}>
      <button
        className="prn-chip"
        onClick={() => setOpen((v) => !v)}
        title={meta.label}
        disabled={printer.status === 'unsupported'}
      >
        <span className="prn-dot" style={{ background: meta.dot }} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9V2h12v7" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
      </button>

      {open && (
        <div className="prn-pop">
          <div className="prn-pop-head">
            <span className="prn-dot" style={{ background: meta.dot }} />
            <strong>{meta.label}</strong>
          </div>
          {printer.deviceName && <div className="prn-dev">{printer.deviceName}</div>}

          {printer.status === 'unsupported' ? (
            <p className="prn-note">
              Bu brauzer WebUSB'ni qo'llamaydi. Chek chop qilish uchun Chrome yoki Edge ishlating.
            </p>
          ) : (
            <div className="prn-actions">
              <button className="prn-btn primary" onClick={handleConnect} disabled={busy}>
                {printer.status === 'connected' ? 'Boshqa printer tanlash' : 'Printerni ulash'}
              </button>
              <button
                className="prn-btn"
                onClick={handleTest}
                disabled={busy || printer.status !== 'connected'}
              >
                Sinov cheki
              </button>
            </div>
          )}

          <div className="prn-sep" />

          <div className="prn-form">
            <label>Do'kon nomi</label>
            <input
              value={settings.shopName}
              onChange={(e) => printer.updateSettings({ shopName: e.target.value })}
              placeholder="DOKONCHI"
            />
            <label>Manzil</label>
            <input
              value={settings.line1}
              onChange={(e) => printer.updateSettings({ line1: e.target.value })}
              placeholder="Masalan: Chilonzor 5-kvartal"
            />
            <label>Telefon</label>
            <input
              value={settings.line2}
              onChange={(e) => printer.updateSettings({ line2: e.target.value })}
              placeholder="+998 90 123 45 67"
            />
            <label>Pastki yozuv</label>
            <input
              value={settings.footer}
              onChange={(e) => printer.updateSettings({ footer: e.target.value })}
              placeholder="Xaridingiz uchun rahmat!"
            />

            <div className="prn-grid">
              <div>
                <label>Qog'oz</label>
                <select
                  value={settings.width}
                  onChange={(e) =>
                    printer.updateSettings({ width: Number(e.target.value) as 32 | 48 })
                  }
                >
                  <option value={48}>80 mm</option>
                  <option value={32}>58 mm</option>
                </select>
              </div>
              <div>
                <label>Nusxa</label>
                <select
                  value={settings.copies}
                  onChange={(e) => printer.updateSettings({ copies: Number(e.target.value) })}
                >
                  <option value={1}>1 ta</option>
                  <option value={2}>2 ta</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prn { position: relative; flex-shrink: 0; }
        .prn-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 11px;
          padding: 9px 11px;
          cursor: pointer; color: var(--ink-soft);
          transition: border-color .15s, color .15s;
        }
        .prn-chip:hover:not(:disabled) { color: var(--ink); border-color: var(--line-strong); }
        .prn-chip:disabled { opacity: .55; cursor: not-allowed; }
        .prn-chip svg { width: 17px; height: 17px; }
        .prn-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .prn-pop {
          position: absolute; top: calc(100% + 8px); right: 0;
          width: 290px;
          background: var(--paper-2);
          border: 1px solid var(--line-strong);
          border-radius: 14px;
          box-shadow: 0 14px 40px rgba(26, 34, 48,.18);
          padding: 14px;
          z-index: 200;
        }
        .prn-pop-head { display: flex; align-items: center; gap: 8px; }
        .prn-pop-head strong { font-size: 13.5px; color: var(--ink); }
        .prn-dev {
          font-size: 11.5px; color: var(--ink-soft);
          margin-top: 3px; font-family: 'IBM Plex Mono', monospace;
        }
        .prn-note { font-size: 12.5px; color: var(--ink-soft); line-height: 1.5; margin: 10px 0 0; }

        .prn-actions { display: flex; gap: 7px; margin-top: 11px; }
        .prn-btn {
          flex: 1; padding: 8px 10px;
          border: 1px solid var(--line-strong);
          background: var(--card); color: var(--ink);
          border-radius: 9px; font-family: inherit; font-size: 12.5px; font-weight: 600;
          cursor: pointer;
        }
        .prn-btn:hover:not(:disabled) { border-color: var(--accent); }
        .prn-btn:disabled { opacity: .5; cursor: not-allowed; }
        .prn-btn.primary { background: var(--accent); color: var(--paper-2); border-color: var(--accent); }
        .prn-btn.primary:hover:not(:disabled) { filter: brightness(1.08); }

        .prn-sep { height: 1px; background: var(--line); margin: 13px 0; }

        .prn-form { display: flex; flex-direction: column; gap: 4px; }
        .prn-form label {
          font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px;
          font-weight: 600; color: var(--ink-soft); margin-top: 6px;
        }
        .prn-form input, .prn-form select {
          padding: 7px 10px;
          border: 1px solid var(--line-strong);
          border-radius: 8px; background: var(--card);
          font-family: inherit; font-size: 13px; color: var(--ink);
          outline: none; width: 100%;
        }
        .prn-form input:focus, .prn-form select:focus { border-color: var(--accent); }
        .prn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .prn-grid > div { display: flex; flex-direction: column; gap: 4px; }
      `}</style>
    </div>
  );
}
