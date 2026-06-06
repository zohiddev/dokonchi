import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
}

export function Modal({ open, onClose, title, children, footer, width = 480 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="serif">{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(26, 34, 48, .45);
          backdrop-filter: blur(2px);
          z-index: 200;
          display: grid; place-items: center;
          padding: 18px;
          animation: fadeIn .2s ease;
        }
        .modal {
          background: var(--card);
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(26, 34, 48, .25);
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp .2s ease;
        }
        .modal-head {
          display: flex; align-items: center;
          padding: 18px 22px;
          border-bottom: 1px solid var(--line);
        }
        .modal-head h3 {
          flex: 1;
          font-size: 18px;
          font-weight: 600;
          color: var(--ink);
        }
        .modal-close {
          background: none; border: none;
          font-size: 24px;
          color: var(--ink-soft);
          cursor: pointer;
          width: 32px; height: 32px;
          border-radius: 8px;
        }
        .modal-close:hover { background: var(--paper); color: var(--ink); }
        .modal-body {
          padding: 20px 22px;
          overflow-y: auto;
          flex: 1;
        }
        .modal-foot {
          padding: 14px 22px;
          border-top: 1px solid var(--line);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
