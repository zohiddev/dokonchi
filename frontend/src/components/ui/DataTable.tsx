import type { ReactNode } from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
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
}: DataTableProps<T>) {
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
          {data.map((row) => (
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
      </table>

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
        .compact thead th { padding: 9px 14px; }
        .compact tbody td { padding: 10px 14px; }
      `}</style>
    </div>
  );
}
