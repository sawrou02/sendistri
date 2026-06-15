import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../api/client';
import type { PaginationMeta } from '../types';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface Props<T> {
  title: string;
  endpoint: string;
  columns: Column<T>[];
  searchable?: boolean;
}

export default function DataTable<T extends { id: string }>({
  title,
  endpoint,
  columns,
  searchable = true,
}: Props<T>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: [endpoint, page, debounced],
    queryFn: async () => {
      const res = await api.get<{ data: T[]; meta?: PaginationMeta }>(endpoint, {
        params: { page, limit: 20, ...(debounced && { search: debounced }) },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  function applySearch() {
    setPage(1);
    setDebounced(search);
  }

  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sendistri-dark">{title}</h1>
        {searchable && (
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="Rechercher…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sendistri-green"
            />
            <button
              onClick={applySearch}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Rechercher
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-gray-500">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-sendistri-red">
                  Erreur de chargement
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                  Aucun résultat
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
