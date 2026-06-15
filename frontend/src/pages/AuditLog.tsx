import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  resource_id?: string | null;
  ip_address: string;
  timestamp: string;
  user?: { email: string } | null;
  details?: Record<string, unknown> | null;
}

interface AuditResponse {
  success: boolean;
  data: AuditEntry[];
  meta: { page: number; totalPages: number; total: number };
}

const METHOD_BADGE: Record<string, string> = {
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-sendistri-red',
};

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = {
    page,
    limit: 50,
    ...(resource && { resource }),
    ...(from && { from }),
    ...(to && { to }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['/audit-logs', params],
    queryFn: async () => (await api.get<AuditResponse>('/audit-logs', { params })).data,
  });

  const entries = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        <span className="text-sm text-gray-400">{meta ? `${meta.total} entrées` : ''}</span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Ressource (ex: encaissements)"
          value={resource}
          onChange={(e) => { setResource(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none"
        />
        {(resource || from || to) && (
          <button
            onClick={() => { setResource(''); setFrom(''); setTo(''); setPage(1); }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Effacer filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Aucune entrée trouvée.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Horodatage</th>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Ressource</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((e) => (
                <>
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {new Date(e.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.user?.email ?? <em className="text-gray-400">Système</em>}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${METHOD_BADGE[e.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {e.resource}
                      {e.resource_id && <span className="ml-1 text-gray-400">/{e.resource_id.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.ip_address}</td>
                    <td className="px-4 py-3">
                      {e.details && (
                        <button
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
                        >
                          {expanded === e.id ? 'Masquer' : 'Voir'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && e.details && (
                    <tr key={`${e.id}-details`} className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="overflow-auto rounded bg-gray-100 p-3 text-xs text-gray-700">
                          {JSON.stringify(e.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-xs text-gray-400">
              Page {meta.page} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={meta.page <= 1}
                className="rounded border border-gray-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded border border-gray-200 px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
