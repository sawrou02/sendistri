import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../api/client';
import type { Kpis } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadPdfReport } from '../utils/export';

interface Charts {
  monthly: { periode: string; montant: number; count: number }[];
  byFormule: { formule: string; _sum: { montant: string | null }; _count: number }[];
  topPdvs: { pdv_id: string; name: string; montant: number }[];
}

interface RapportData {
  periode: string;
  encaissements: { montant: number; count: number };
  versements: { montant: number; count: number };
  nouveaux_abonnes: number;
  top_pdvs: { pdv: { name: string; code: string }; montant: number; count: number }[];
  by_formule: { formule: string; montant: number; count: number }[];
  by_mode: { mode: string; montant: number; count: number }[];
}

const COLORS = ['#0E8A4F', '#E2A000', '#D23A2C', '#0B2A1B', '#3B82F6'];

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function evoPct(current: number, previous: number): { label: string; up: boolean } {
  if (previous === 0) return { label: '+0%', up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}

function Card({ label, value, accent, sub }: { label: string; value: string; accent?: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-sendistri-dark'}`}>{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

function EvoBadge({ current, previous }: { current: number; previous: number }) {
  const { label, up } = evoPct(current, previous);
  return (
    <span className={`text-xs font-medium ${up ? 'text-emerald-600' : 'text-red-500'}`}>
      {label} vs mois préc.
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const canReport = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const now = new Date();
  const defaultPeriode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [reportPeriode, setReportPeriode] = useState(defaultPeriode);
  const [generating, setGenerating] = useState(false);

  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => (await api.get<{ data: Kpis }>('/dashboard/kpis')).data.data,
  });

  const { data: charts } = useQuery({
    queryKey: ['charts'],
    queryFn: async () => (await api.get<{ data: Charts }>('/dashboard/charts')).data.data,
  });

  async function handleRapport() {
    setGenerating(true);
    try {
      const { data } = await api.get<{ data: RapportData }>(`/dashboard/rapport?periode=${reportPeriode}`);
      const r = data.data;
      downloadPdfReport({
        title: `Rapport mensuel SENDISTRI — ${r.periode}`,
        subtitle: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        sections: [
          {
            heading: 'Synthèse',
            rows: [
              ['CA encaissé (validé)', `${fmt(r.encaissements.montant)} F`, `${r.encaissements.count} enc.`],
              ['Versements confirmés', `${fmt(r.versements.montant)} F`, `${r.versements.count} vers.`],
              ['Nouveaux abonnés', String(r.nouveaux_abonnes), ''],
            ],
          },
          {
            heading: 'Top PDVs par CA',
            headers: ['PDV', 'Code', 'Encaissements', 'Montant (F)'],
            rows: r.top_pdvs.map((p) => [p.pdv.name, p.pdv.code, String(p.count), fmt(p.montant)]),
          },
          {
            heading: 'Répartition par formule',
            headers: ['Formule', 'Nbr', 'Montant (F)'],
            rows: r.by_formule.map((f) => [f.formule, String(f.count), fmt(f.montant)]),
          },
          {
            heading: 'Répartition par mode de paiement',
            headers: ['Mode', 'Nbr', 'Montant (F)'],
            rows: r.by_mode.map((m) => [m.mode, String(m.count), fmt(m.montant)]),
          },
        ],
        filename: `rapport-${r.periode}.pdf`,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-sendistri-dark">Tableau de bord</h1>
        {canReport && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={reportPeriode}
              onChange={(e) => setReportPeriode(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sendistri-green"
            />
            <button
              onClick={handleRapport}
              disabled={generating}
              className="rounded-lg bg-sendistri-dark px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {generating ? 'Génération…' : 'Rapport PDF'}
            </button>
          </div>
        )}
      </div>

      {/* KPI cards — 5 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card
          label="CA du jour (validé)"
          value={`${fmt(kpis?.encaissements_jour.montant ?? 0)} F`}
          accent="text-sendistri-green"
          sub={kpis?.evolution_ca && (
            <EvoBadge current={kpis.evolution_ca.mois_courant} previous={kpis.evolution_ca.mois_precedent} />
          )}
        />
        <Card label="Abonnés actifs" value={fmt(kpis?.abonnes_actifs ?? 0)} />
        <Card label="Décodeurs en stock" value={fmt(kpis?.decodeurs_stock ?? 0)} />
        <Card
          label="Versements en attente"
          value={`${fmt(kpis?.versements_en_attente.montant ?? 0)} F`}
          accent="text-sendistri-gold"
          sub={<span className="text-xs text-gray-400">{kpis?.versements_en_attente.count ?? 0} versement(s)</span>}
        />
        <Card
          label="Encaissements en attente"
          value={`${fmt(kpis?.encaissements_en_attente?.montant ?? 0)} F`}
          accent="text-orange-500"
          sub={<span className="text-xs text-gray-400">{kpis?.encaissements_en_attente?.count ?? 0} à valider</span>}
        />
      </div>

      {/* Objectif */}
      {kpis?.objectif_recrutement && kpis.objectif_recrutement.cible > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-gray-700">Objectif recrutement du mois</span>
            <span className="text-gray-500">
              {kpis.objectif_recrutement.recrutes} / {kpis.objectif_recrutement.cible} ({kpis.objectif_recrutement.taux}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-sendistri-green transition-all"
              style={{ width: `${Math.min(100, kpis.objectif_recrutement.taux)}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-sendistri-dark">Encaissements validés par mois</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts?.monthly ?? []}>
              <XAxis dataKey="periode" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => `${fmt(v)} F`} />
              <Bar dataKey="montant" fill="#0E8A4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-sendistri-dark">Répartition par formule</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={(charts?.byFormule ?? []).map((f) => ({
                  name: f.formule,
                  value: Number(f._sum.montant ?? 0),
                }))}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {(charts?.byFormule ?? []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => `${fmt(v)} F`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-sendistri-dark">Top PDVs par CA validé</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">#</th>
                <th className="pb-2">PDV</th>
                <th className="pb-2 text-right">CA (F)</th>
              </tr>
            </thead>
            <tbody>
              {(charts?.topPdvs ?? []).map((pdv, i) => (
                <tr key={pdv.pdv_id} className="border-b last:border-0">
                  <td className="py-2 text-gray-400">{i + 1}</td>
                  <td className="py-2 font-medium">{pdv.name}</td>
                  <td className="py-2 text-right font-semibold text-sendistri-green">{fmt(pdv.montant)}</td>
                </tr>
              ))}
              {(!charts || charts.topPdvs.length === 0) && (
                <tr><td colSpan={3} className="py-4 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-sendistri-dark">Derniers encaissements</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">PDV</th>
                <th className="pb-2">Formule</th>
                <th className="pb-2">Mode</th>
                <th className="pb-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {(kpis?.recent_encaissements ?? []).map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2">{e.pdv?.name ?? '—'}</td>
                  <td className="py-2">{e.formule}</td>
                  <td className="py-2">{e.mode_paiement}</td>
                  <td className="py-2 text-right font-medium">{fmt(Number(e.montant))} F</td>
                </tr>
              ))}
              {(!kpis || kpis.recent_encaissements.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400">Aucune donnée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
