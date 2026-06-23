import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';
import type { PaginationMeta } from '../types';
import { IconSearch } from './icons';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
}

interface Props<T> {
  title?: string;
  endpoint: string;
  columns: Column<T>[];
  searchable?: boolean;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  extraParams?: Record<string, string | number | undefined>;
  filters?: React.ReactNode;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
}

export default function DataTable<T extends { id: string }>({
  title,
  endpoint,
  columns,
  searchable = true,
  toolbar,
  rowActions,
  extraParams,
  filters,
  selectable,
  onSelectionChange,
  bulkActions,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const stableParams = JSON.stringify(extraParams);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }
  function toggleAll(ids: string[]) {
    setSelected((prev) => {
      const all = ids.every((id) => prev.has(id));
      const next = all ? new Set<string>() : new Set(ids);
      onSelectionChange?.([...next]);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); onSelectionChange?.([]); }

  const { data, isLoading, isError } = useQuery({
    queryKey: [endpoint, page, rowsPerPage, debounced, stableParams],
    queryFn: async () => {
      const res = await api.get<{ data: T[]; meta?: PaginationMeta }>(endpoint, {
        params: { page, limit: rowsPerPage, ...(debounced && { search: debounced }), ...extraParams },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;
  const colCount = columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0);

  const thBase = 'px-4 py-3 text-[11px] font-bold uppercase tracking-[0.04em] whitespace-nowrap';

  return (
    <div className="animate-fade space-y-4">
      {(title || toolbar || filters) && (title || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h1 className="text-xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>{title}</h1>}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {filters && (
        <div className="flex flex-wrap items-end gap-3 rounded-[14px] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {filters}
        </div>
      )}

      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 rounded-[12px] px-4 py-3 text-white" style={{ background: 'var(--sidebar-bg)' }}>
          <span className="text-sm font-semibold">{selected.size} sélectionné(s)</span>
          <div className="ml-auto flex gap-2">{bulkActions([...selected], clearSelection)}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        {/* Toolbar row inside card */}
        <div className="flex flex-wrap items-center gap-3 px-[18px] py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>
            Afficher
            <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="cursor-pointer rounded-lg px-2 py-1.5 text-[12.5px] outline-none"
              style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
            </select>
            lignes
          </div>
          {selectable && selected.size > 0 && (
            <span className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>{selected.size} sélectionné(s)</span>
          )}
          <div className="flex-1" />
          {searchable && (
            <div className="flex min-w-[170px] max-w-[280px] items-center gap-2.5 rounded-[9px] px-3 py-2"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-3)', display: 'flex' }}><IconSearch size={15} /></span>
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setDebounced(search); } }}
                placeholder="Rechercher…" className="w-full border-none bg-transparent text-[13.5px] outline-none" style={{ color: 'var(--text)' }} />
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-3)', textAlign: 'left' }}>
                {selectable && (
                  <th className={thBase} style={{ width: 36 }}>
                    <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={() => toggleAll(rows.map((r) => r.id))} />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} className={`${thBase} ${c.align === 'right' ? 'text-right' : ''} ${c.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>{c.header}</th>
                ))}
                {rowActions && <th className={`${thBase} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={colCount} className="px-4 py-10 text-center" style={{ color: 'var(--text-3)' }}>Chargement…</td></tr>}
              {isError && <tr><td colSpan={colCount} className="px-4 py-10 text-center" style={{ color: 'var(--red)' }}>Erreur de chargement</td></tr>}
              {!isLoading && !isError && rows.length === 0 && (
                <tr><td colSpan={colCount} className="px-4 py-16 text-center">
                  <div className="mb-2.5 flex justify-center" style={{ color: 'var(--text-3)' }}><IconSearch size={28} /></div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Aucun résultat</div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>Essayez de modifier votre recherche.</div>
                </td></tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-[var(--surface-2)]"
                  style={{ borderTop: '1px solid var(--border)', background: selected.has(row.id) ? 'var(--green-ll)' : 'transparent' }}>
                  {selectable && <td className="px-4 py-3" style={{ width: 36 }}><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} /></td>}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right font-mono' : ''} ${c.hideOnMobile ? 'hidden sm:table-cell' : ''}`} style={{ color: 'var(--text)' }}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && <td className="px-4 py-3 text-right">{rowActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 px-[18px] py-3.5 text-[12.5px]" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
          <span>{meta ? `${meta.total} résultat(s) · page ${meta.page}/${Math.max(1, meta.totalPages)}` : ''}</span>
          <div className="flex items-center gap-1.5">
            <button disabled={!meta?.hasPrev} onClick={() => setPage((p) => p - 1)}
              className="h-[30px] rounded-lg px-3 text-[12.5px] font-semibold disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}>Précédent</button>
            <button disabled={!meta?.hasNext} onClick={() => setPage((p) => p + 1)}
              className="h-[30px] rounded-lg px-3 text-[12.5px] font-semibold disabled:opacity-40"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}>Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
}
