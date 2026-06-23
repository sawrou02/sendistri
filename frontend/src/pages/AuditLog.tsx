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

const METHOD_BADGE: Record<string, { bg: string; color: string }> = {
  POST:   { bg: 'var(--blue-l)',   color: 'var(--blue)' },
  PUT:    { bg: 'var(--yellow-l)', color: 'var(--yellow)' },
  PATCH:  { bg: 'var(--yellow-l)', color: 'var(--yellow)' },
  DELETE: { bg: 'var(--red-l)',    color: 'var(--red)' },
};

const inputCls = 'rounded-[9px] border px-3 py-2 text-[13px] outline-none transition-colors';
const inputStyle: React.CSSProperties = {
  borderColor: 'var(--border-strong)',
  background: 'var(--surface)',
  color: 'var(--text)',
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
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
          Journal d'audit
        </h1>
        <span className="text-sm" style={{ color: 'var(--text-3)' }}>
          {meta ? `${meta.total} entrées` : ''}
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Ressource (ex: encaissements)"
          value={resource}
          onChange={(e) => { setResource(e.target.value); setPage(1); }}
          className={inputCls}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        />
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className={inputCls}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        />
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className={inputCls}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--green)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        />
        {(resource || from || to) && (
          <button
            onClick={() => { setResource(''); setFrom(''); setTo(''); setPage(1); }}
            className="rounded-[9px] px-3 py-2 text-sm"
            style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface)' }}
          >
            Effacer filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
      >
        {isLoading ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-3)' }}>Chargement…</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-3)' }}>Aucune entrée trouvée.</div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <tr>
                {['Horodatage', 'Utilisateur', 'Action', 'Ressource', 'IP', 'Détails'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em]"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <>
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className="transition-colors"
                    onMouseEnter={(el) => (el.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(el) => (el.currentTarget.style.background = '')}
                  >
                    <td className="whitespace-nowrap px-4 py-3" style={{ color: 'var(--text-3)' }}>
                      {new Date(e.timestamp).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>
                      {e.user?.email ?? <em style={{ color: 'var(--text-3)' }}>Système</em>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-bold"
                        style={{
                          background: METHOD_BADGE[e.action]?.bg ?? 'var(--surface-2)',
                          color: METHOD_BADGE[e.action]?.color ?? 'var(--text-3)',
                        }}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-2)' }}>
                      {e.resource}
                      {e.resource_id && (
                        <span style={{ color: 'var(--text-3)' }}>/{e.resource_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-3)' }}>
                      {e.ip_address}
                    </td>
                    <td className="px-4 py-3">
                      {e.details && (
                        <button
                          onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                          className="rounded px-2 py-0.5 text-xs"
                          style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}
                        >
                          {expanded === e.id ? 'Masquer' : 'Voir'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === e.id && e.details && (
                    <tr key={`${e.id}-details`} style={{ background: 'var(--surface-2)' }}>
                      <td colSpan={6} className="px-4 py-3">
                        <pre
                          className="overflow-auto rounded-lg p-3 text-xs font-mono"
                          style={{ background: 'var(--bg)', color: 'var(--text-2)' }}
                        >
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
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              Page {meta.page} / {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={meta.page <= 1}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface)' }}
              >
                ← Précédent
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={meta.page >= meta.totalPages}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                style={{ border: '1px solid var(--border-strong)', color: 'var(--text-2)', background: 'var(--surface)' }}
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
