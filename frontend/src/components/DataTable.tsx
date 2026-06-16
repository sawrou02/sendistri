import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';
import type { PaginationMeta } from '../types';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
}

interface Props<T> {
  title: string;
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
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      const allSelected = ids.every((id) => prev.has(id));
      const next = allSelected ? new Set<string>() : new Set(ids);
      onSelectionChange?.([...next]);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    onSelectionChange?.([]);
  }

  // Reset to page 1 when filters change
  const stableParams = JSON.stringify(extraParams);
  useState(() => { setPage(1); });

  const { data, isLoading, isError } = useQuery({
    queryKey: [endpoint, page, debounced, stableParams],
    queryFn: async () => {
      const res = await api.get<{ data: T[]; meta?: PaginationMeta }>(endpoint, {
        params: {
          page,
          limit: 20,
          ...(debounced && { search: debounced }),
          ...extraParams,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  function applySearch() {
    setPage(1);
    setDebounced(search);
  }

  // Defensive: only ever map over a real array, even if the API shape drifts.
  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-bold text-sendistri-dark md:text-2xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {searchable && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                placeholder="Rechercher…"
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sendistri-green sm:w-auto"
              />
              <button
                onClick={applySearch}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Rechercher
              </button>
            </>
          )}
          {toolbar}
        </div>
      </div>

      {filters && <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">{filters}</div>}

      {selectable && selected.size > 0 && bulkActions && (
        <div className="flex items-center gap-3 rounded-xl bg-sendistri-dark px-4 py-3 text-white">
          <span className="text-sm">{selected.size} sélectionné(s)</span>
          <div className="ml-auto flex gap-2">{bulkActions([...selected], clearSelection)}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                {selectable && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                      onChange={() => toggleAll(rows.map((r) => r.id))}
                      className="rounded"
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''} ${c.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>
                    {c.header}
                  </th>
                ))}
                {rowActions && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0)} className="px-4 py-6 text-center text-gray-400">
                    Chargement…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0)} className="px-4 py-6 text-center text-sendistri-red">
                    Erreur de chargement
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (rowActions ? 1 : 0) + (selectable ? 1 : 0)} className="px-4 py-6 text-center text-gray-400">
                    Aucun résultat
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b last:border-0 hover:bg-gray-50 ${selected.has(row.id) ? 'bg-emerald-50' : ''}`}
                >
                  {selectable && (
                    <td className="px-4 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="rounded"
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''} ${c.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>
                      {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                  {rowActions && <td className="px-4 py-3 text-right">{rowActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {meta.page} / {meta.totalPages} — {meta.total} résultats
          </span>
          <div className="flex gap-2">
            <button
              disabled={!meta.hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
