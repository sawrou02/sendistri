import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

interface PdvFull {
  id: string;
  code: string;
  name: string;
  type: string;
  secteur: string;
  region: string;
  phone?: string | null;
  email?: string | null;
  caution: string;
  solde: string;
  statut: string;
  created_at: string;
  _count: { subscribers: number; encaissements: number; decoders: number };
}

interface PdvStats {
  subscribers: { total: number; active: number };
  encaissements: { count: number; totalMontant: string; pending: number };
  versements: { total: string };
  decoders: Record<string, number>;
}

interface Encaissement {
  id: string;
  type: string;
  formule: string;
  montant: string;
  statut: string;
  mode_paiement: string;
  created_at: string;
}

interface Subscriber {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  phone: string;
  formule: string;
  statut: string;
  date_expiry?: string;
}

const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-gray-100 text-gray-500',
    SUSPENDED: 'bg-red-100 text-red-600',
    PENDING: 'bg-amber-100 text-amber-700',
    VALIDATED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    ECHU: 'bg-orange-100 text-orange-600',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>{s}</span>;
};

type Tab = 'overview' | 'encaissements' | 'abonnes';

export default function PdvDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');

  const { data: pdv, isLoading } = useQuery({
    queryKey: ['pdv', id],
    queryFn: async () => (await api.get<{ data: PdvFull }>(`/pdvs/${id}`)).data.data,
    enabled: !!id,
  });

  const { data: stats } = useQuery({
    queryKey: ['pdv-stats', id],
    queryFn: async () => (await api.get<{ data: PdvStats }>(`/pdvs/${id}/stats`)).data.data,
    enabled: !!id,
  });

  const { data: encaissementsData } = useQuery({
    queryKey: ['pdv-encaissements', id],
    queryFn: async () => (await api.get<{ data: Encaissement[]; meta: unknown }>(`/encaissements?pdvId=${id}&limit=20`)).data.data,
    enabled: !!id && tab === 'encaissements',
  });

  const { data: subscribersData } = useQuery({
    queryKey: ['pdv-subscribers', id],
    queryFn: async () => (await api.get<{ data: Subscriber[]; meta: unknown }>(`/subscribers?pdvId=${id}&limit=20`)).data.data,
    enabled: !!id && tab === 'abonnes',
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Chargement…</div>;
  }

  if (!pdv) {
    return <div className="rounded-xl bg-white p-8 text-center text-gray-500">PDV introuvable.</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'encaissements', label: `Encaissements (${pdv._count.encaissements})` },
    { key: 'abonnes', label: `Abonnés (${pdv._count.subscribers})` },
  ];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pdvs')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-sendistri-dark">{pdv.name}</h1>
          <p className="text-sm text-gray-500">{pdv.code} · {pdv.type} · {pdv.region}</p>
        </div>
        <div className="ml-auto">{statutBadge(pdv.statut)}</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Solde</p>
          <p className="mt-1 text-lg font-bold text-sendistri-green">{fmt(pdv.solde)} F</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">CA total</p>
          <p className="mt-1 text-lg font-bold text-sendistri-dark">{fmt(stats?.encaissements.totalMontant ?? 0)} F</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Abonnés actifs</p>
          <p className="mt-1 text-lg font-bold text-sendistri-dark">{stats?.subscribers.active ?? '—'}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Enc. en attente</p>
          <p className="mt-1 text-lg font-bold text-orange-500">{stats?.encaissements.pending ?? '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'border-b-2 border-sendistri-green text-sendistri-green'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-sendistri-dark">Informations générales</h2>
            <dl className="space-y-3 text-sm">
              {[
                ['Code', pdv.code],
                ['Nom', pdv.name],
                ['Type', pdv.type],
                ['Secteur', pdv.secteur],
                ['Région', pdv.region],
                ['Téléphone', pdv.phone ?? '—'],
                ['Email', pdv.email ?? '—'],
                ['Caution', `${fmt(pdv.caution)} F`],
                ['Créé le', fmtDate(pdv.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-800">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-sendistri-dark">Décodeurs</h2>
            {stats?.decoders && Object.keys(stats.decoders).length > 0 ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(stats.decoders).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="font-bold text-sendistri-dark">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-gray-400">Aucun décodeur associé.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'encaissements' && (
        <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Formule</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {(encaissementsData ?? []).map((e) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{fmtDate(e.created_at)}</td>
                  <td className="px-4 py-3">{e.type}</td>
                  <td className="px-4 py-3">{e.formule}</td>
                  <td className="px-4 py-3">{e.mode_paiement}</td>
                  <td className="px-4 py-3">{statutBadge(e.statut)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(e.montant)} F</td>
                </tr>
              ))}
              {(!encaissementsData || encaissementsData.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun encaissement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'abonnes' && (
        <div className="rounded-xl bg-white shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Formule</th>
                <th className="px-4 py-3">Expiration</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(subscribersData ?? []).map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3 font-medium">{s.prenom} {s.nom}</td>
                  <td className="px-4 py-3">{s.phone}</td>
                  <td className="px-4 py-3">{s.formule}</td>
                  <td className="px-4 py-3">{s.date_expiry ? fmtDate(s.date_expiry) : '—'}</td>
                  <td className="px-4 py-3">{statutBadge(s.statut)}</td>
                </tr>
              ))}
              {(!subscribersData || subscribersData.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun abonné</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
