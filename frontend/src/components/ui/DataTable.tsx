import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Jami qatori (tfoot) uchun — ko'rinib turgan qatorlardan hisoblanadi */
  footer?: (rows: T[]) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  compact?: boolean;
  /** Client-side pagination (sahifadagi qatorlar soni). false => paginationsiz */
  pageSize?: number | false;
  /** O'zgarganda 1-sahifaga qaytadi (masalan filtr qiymati) */
  resetKey?: unknown;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyTitle = 'Hozircha hech narsa yo\'q',
  emptyDescription,
  onRowClick,
  compact = false,
  pageSize = 15,
  resetKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const total = data?.length ?? 0;
  const paginate = pageSize !== false && total > pageSize;
  const size = pageSize === false ? total : pageSize;
  const pageCount = paginate ? Math.ceil(total / size) : 1;

  // filtr o'zgarsa 1-sahifaga qaytamiz
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // qatorlar kamaysa joriy sahifani diapazonga moslaymiz
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (!paginate) return data;
    const start = (page - 1) * size;
    return data.slice(start, start + size);
  }, [data, paginate, page, size]);

  if (isLoading) {
    return (
      <div className="table-state">
        <Spinner label="Yuklanmoqda..." />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const hasFooter = columns.some((c) => c.footer);

  return (
    <div className={`table-wrap ${compact ? 'compact' : ''}`}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? 'left', width: c.width }}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'clickable' : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot>
            <tr>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>
                  {c.footer ? c.footer(rows) : null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>

      {paginate && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          totalItems={total}
          pageSize={size}
        />
      )}

      <style>{`
        .table-wrap { width: 100%; overflow-x: auto; }
        .table-state { padding: 32px 24px; text-align: center; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        thead th {
          padding: 12px 18px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-soft);
          background: var(--paper-2);
          border-bottom: 1px solid var(--line);
          text-transform: uppercase;
          letter-spacing: .4px;
          white-space: nowrap;
        }
        tbody td {
          padding: 13px 18px;
          border-bottom: 1px solid var(--line);
          color: var(--ink);
          vertical-align: middle;
        }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr.clickable { cursor: pointer; }
        tbody tr.clickable:hover { background: var(--paper-2); }
        tfoot td {
          padding: 13px 18px;
          background: var(--paper-2);
          border-top: 2px solid var(--line);
          font-weight: 700;
          color: var(--ink);
          white-space: nowrap;
        }
        .compact thead th { padding: 9px 14px; }
        .compact tbody td { padding: 10px 14px; }
        .compact tfoot td { padding: 10px 14px; }
      `}</style>
    </div>
  );
}
