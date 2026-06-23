import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { IconSearch } from './icons';

interface SearchResult {
  pdvs: { id: string; name: string; code: string }[];
  subscribers: { id: string; nom: string; prenom: string; code: string; formule: string }[];
  encaissements: { id: string; montant: string; formule: string; pdv?: { name: string } }[];
}

export default function GlobalSearchHeader() {
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
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, search]);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));
  const total = results ? results.pdvs.length + results.subscribers.length + results.encaissements.length : 0;

  function go(path: string) { navigate(path); setQuery(''); setResults(null); setOpen(false); }

  type Row = { id: string; title: string; sub: string; type: string; path: string };
  const rows: Row[] = results ? [
    ...results.pdvs.map((p) => ({ id: 'p' + p.id, title: p.name, sub: p.code, type: 'PDV', path: `/pdvs/${p.id}` })),
    ...results.subscribers.map((s) => ({ id: 's' + s.id, title: `${s.prenom} ${s.nom}`, sub: `${s.code} · ${s.formule}`, type: 'Abonné', path: '/subscribers' })),
    ...results.encaissements.map((e) => ({ id: 'e' + e.id, title: `${fmt(e.montant)} F`, sub: `${e.formule} · ${e.pdv?.name ?? ''}`, type: 'Enc.', path: '/encaissements' })),
  ] : [];

  return (
    <div ref={ref} className="relative hidden max-w-[320px] flex-1 sm:block">
      <div className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-3)', display: 'flex' }}><IconSearch size={16} /></span>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un abonné, décodeur, PDV…"
          className="w-full border-none bg-transparent text-[13.5px] outline-none"
          style={{ color: 'var(--text)' }}
        />
        {loading && <div className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--green)]" />}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-[52px] z-[60] max-h-[360px] overflow-y-auto rounded-xl p-1.5 animate-pop"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          {total === 0 && !loading && <p className="px-3 py-3 text-sm" style={{ color: 'var(--text-3)' }}>Aucun résultat</p>}
          {rows.map((r) => (
            <button key={r.id} onClick={() => go(r.path)}
              className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2.5 text-left hover:bg-[var(--surface-2)]">
              <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>
                <IconSearch size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{r.title}</span>
                <span className="block text-[11.5px]" style={{ color: 'var(--text-3)' }}>{r.sub}</span>
              </span>
              <span className="flex-shrink-0 rounded-[7px] px-2 py-0.5 text-[10.5px] font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}>{r.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
