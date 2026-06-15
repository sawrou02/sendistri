import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

interface SearchResult {
  pdvs: { id: string; name: string; code: string; statut: string }[];
  subscribers: { id: string; nom: string; prenom: string; code: string; formule: string }[];
  encaissements: { id: string; montant: string; formule: string; statut: string; pdv?: { name: string } }[];
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get<{ data: SearchResult }>(`/search?q=${encodeURIComponent(q)}`);
      setResults(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const total = results ? results.pdvs.length + results.subscribers.length + results.encaissements.length : 0;

  function go(path: string) {
    navigate(path);
    setQuery('');
    setResults(null);
    setOpen(false);
  }

  const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));

  return (
    <div ref={ref} className="relative px-3 py-2">
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
        <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher…"
          className="w-full bg-transparent text-sm text-white placeholder-gray-400 outline-none"
        />
        {loading && <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-3 right-3 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl bg-white shadow-xl">
          {total === 0 && !loading && (
            <p className="px-4 py-3 text-sm text-gray-500">Aucun résultat</p>
          )}

          {(results?.pdvs ?? []).length > 0 && (
            <div>
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase text-gray-400">PDVs</p>
              {results!.pdvs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => go(`/pdvs/${p.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-sendistri-dark text-sm">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.code}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.subscribers ?? []).length > 0 && (
            <div>
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase text-gray-400">Abonnés</p>
              {results!.subscribers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(`/subscribers`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-sendistri-dark text-sm">{s.prenom} {s.nom}</span>
                  <span className="text-xs text-gray-400">{s.code} · {s.formule}</span>
                </button>
              ))}
            </div>
          )}

          {(results?.encaissements ?? []).length > 0 && (
            <div>
              <p className="border-b px-4 py-2 text-xs font-semibold uppercase text-gray-400">Encaissements</p>
              {results!.encaissements.map((e) => (
                <button
                  key={e.id}
                  onClick={() => go(`/encaissements`)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-sendistri-dark text-sm">{fmt(e.montant)} F</span>
                  <span className="text-xs text-gray-400">{e.formule} · {e.pdv?.name ?? ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
