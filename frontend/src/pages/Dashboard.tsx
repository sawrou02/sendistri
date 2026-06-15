import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import api from '../api/client';
import type { Kpis } from '../types';

interface Charts {
  monthly: { periode: string; montant: number; count: number }[];
  byFormule: { formule: string; _sum: { montant: string | null }; _count: number }[];
}

const COLORS = ['#0E8A4F', '#E2A000', '#D23A2C', '#0B2A1B', '#3B82F6'];

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function Card({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent ?? 'text-sendistri-dark'}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: kpis } = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => (await api.get<{ data: Kpis }>('/dashboard/kpis')).data.data,
  });

  const { data: charts } = useQuery({
    queryKey: ['charts'],
    queryFn: async () => (await api.get<{ data: Charts }>('/dashboard/charts')).data.data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sendistri-dark">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Encaissements du jour" value={`${fmt(kpis?.encaissements_jour.montant ?? 0)} F`} accent="text-sendistri-green" />
        <Card label="Abonnés actifs" value={fmt(kpis?.abonnes_actifs ?? 0)} />
        <Card label="Décodeurs en stock" value={fmt(kpis?.decodeurs_stock ?? 0)} />
        <Card label="Versements en attente" value={`${fmt(kpis?.versements_en_attente.montant ?? 0)} F`} accent="text-sendistri-gold" />
      </div>

      {kpis?.objectif_recrutement && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-gray-700">Objectif recrutement du mois</span>
            <span className="text-gray-500">
              {kpis.objectif_recrutement.recrutes} / {kpis.objectif_recrutement.cible} ({kpis.objectif_recrutement.taux}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-sendistri-green"
              style={{ width: `${Math.min(100, kpis.objectif_recrutement.taux)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-sendistri-dark">Encaissements par mois</h2>
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
                <td className="py-2 text-right font-medium">{fmt(e.montant)} F</td>
              </tr>
            ))}
            {(!kpis || kpis.recent_encaissements.length === 0) && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400">
                  Aucune donnée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
