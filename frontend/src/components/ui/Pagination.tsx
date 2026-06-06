interface PaginationProps {
  page: number; // 1-indexed
  pageCount: number;
  onChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

// Ko'rsatiladigan sahifa raqamlari (ellipsis bilan): 1 … 4 5 [6] 7 8 … 42
function pageWindow(page: number, pageCount: number): (number | '…')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pageCount - 1) out.push('…');
  out.push(pageCount);
  return out;
}

export function Pagination({ page, pageCount, onChange, totalItems, pageSize }: PaginationProps) {
  if (pageCount <= 1) return null;

  const items = pageWindow(page, pageCount);
  const rangeFrom = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const rangeTo =
    pageSize && totalItems !== undefined ? Math.min(page * pageSize, totalItems) : undefined;

  return (
    <div className="pgn">
      {totalItems !== undefined && rangeFrom !== undefined && (
        <span className="pgn-range num">
          {rangeFrom}–{rangeTo} / {totalItems}
        </span>
      )}
      <div className="pgn-btns">
        <button
          className="pgn-btn"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Oldingi"
        >
          ‹
        </button>
        {items.map((it, i) =>
          it === '…' ? (
            <span key={`e${i}`} className="pgn-gap">…</span>
          ) : (
            <button
              key={it}
              className={`pgn-btn num ${it === page ? 'active' : ''}`}
              onClick={() => onChange(it)}
            >
              {it}
            </button>
          ),
        )}
        <button
          className="pgn-btn"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Keyingi"
        >
          ›
        </button>
      </div>

      <style>{`
        .pgn {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
          padding: 12px 16px;
          border-top: 1px solid var(--line);
        }
        .pgn-range { font-size: 12.5px; color: var(--ink-soft); }
        .pgn-btns { display: flex; align-items: center; gap: 4px; margin-left: auto; }
        .pgn-btn {
          min-width: 32px; height: 32px; padding: 0 8px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--line-strong);
          background: var(--card);
          color: var(--ink);
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: background .12s, border-color .12s, color .12s;
        }
        .pgn-btn:hover:not(:disabled):not(.active) { background: var(--paper-2); }
        .pgn-btn:disabled { opacity: .4; cursor: not-allowed; }
        .pgn-btn.active {
          background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600;
        }
        .pgn-gap { color: var(--ink-faint); padding: 0 2px; }
      `}</style>
    </div>
  );
}
