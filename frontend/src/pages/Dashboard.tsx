import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import api from '../api/client';
import type { Kpis } from '../types';
import { useAuth } from '../context/AuthContext';
import { downloadPdfReport } from '../utils/export';
import { IconCash, IconUsers, IconBox, IconBank, IconTrendUp, IconTrendDown } from '../components/icons';

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

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

function trend(current: number, previous: number) {
  if (previous === 0) return { label: '+0%', up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { label: `${pct >= 0 ? '+' : ''}${pct}%`, up: pct >= 0 };
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  bar: string;
  trendLabel?: string;
  trendUp?: boolean;
  sub?: string;
}
function KpiCard({ label, value, icon, iconBg, iconColor, bar, trendLabel, trendUp, sub }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[14px] p-4 pt-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div className="mb-3 flex min-h-[38px] items-start justify-between gap-2.5">
        <div className="text-[12px] font-bold uppercase leading-tight tracking-[0.03em]" style={{ color: 'var(--text-2)' }}>{label}</div>
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <div className="mb-0.5 font-mono text-[25px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>{value}</div>
      {(trendLabel || sub) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trendLabel && (
            <span className="inline-flex items-center gap-0.5 rounded-[7px] px-1.5 py-0.5 text-[12px] font-bold"
              style={{ color: trendUp ? 'var(--green-d)' : 'var(--red-d)', background: trendUp ? 'var(--green-l)' : 'var(--red-l)' }}>
              {trendUp ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}{trendLabel}
            </span>
          )}
          {sub && <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{sub}</span>}
        </div>
      )}
      <div className="absolute bottom-0 left-0 h-[3px] w-full" style={{ background: bar }} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const canReport = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const now = new Date();
  const [reportPeriode, setReportPeriode] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [generating, setGenerating] = useState(false);

  const { data: kpis } = useQuery({ queryKey: ['kpis'], queryFn: async () => (await api.get<{ data: Kpis }>('/dashboard/kpis')).data.data });
  const { data: charts } = useQuery({ queryKey: ['charts'], queryFn: async () => (await api.get<{ data: Charts }>('/dashboard/charts')).data.data });

  const evo = kpis?.evolution_ca ? trend(kpis.evolution_ca.mois_courant, kpis.evolution_ca.mois_precedent) : null;

  async function handleRapport() {
    setGenerating(true);
    try {
      const { data } = await api.get<{ data: RapportData }>(`/dashboard/rapport?periode=${reportPeriode}`);
      const r = data.data;
      downloadPdfReport({
        title: `Rapport mensuel SENDISTRI — ${r.periode}`,
        subtitle: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
        sections: [
          { heading: 'Synthèse', rows: [
            ['CA encaissé (validé)', `${fmt(r.encaissements.montant)} F`, `${r.encaissements.count} enc.`],
            ['Versements confirmés', `${fmt(r.versements.montant)} F`, `${r.versements.count} vers.`],
            ['Nouveaux abonnés', String(r.nouveaux_abonnes), ''],
          ] },
          { heading: 'Top PDVs par CA', headers: ['PDV', 'Code', 'Encaissements', 'Montant (F)'], rows: r.top_pdvs.map((p) => [p.pdv.name, p.pdv.code, String(p.count), fmt(p.montant)]) },
          { heading: 'Répartition par formule', headers: ['Formule', 'Nbr', 'Montant (F)'], rows: r.by_formule.map((f) => [f.formule, String(f.count), fmt(f.montant)]) },
          { heading: 'Répartition par mode de paiement', headers: ['Mode', 'Nbr', 'Montant (F)'], rows: r.by_mode.map((m) => [m.mode, String(m.count), fmt(m.montant)]) },
        ],
        filename: `rapport-${r.periode}.pdf`,
      });
    } finally { setGenerating(false); }
  }

  const monthly = (charts?.monthly ?? []).map((m) => ({ periode: m.periode.slice(5), montant: m.montant, count: m.count }));

  return (
    <div className="animate-fade space-y-[18px]">
      {canReport && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input type="month" value={reportPeriode} onChange={(e) => setReportPeriode(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)' }} />
          <button onClick={handleRapport} disabled={generating}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ background: 'var(--sidebar-bg)' }}>
            {generating ? 'Génération…' : 'Rapport PDF'}
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="CA du jour (validé)" value={`${fmt(kpis?.encaissements_jour.montant ?? 0)} F`}
          icon={<IconCash size={20} />} iconBg="var(--green-l)" iconColor="var(--green-d)" bar="var(--green)"
          trendLabel={evo?.label} trendUp={evo?.up} sub="vs mois préc." />
        <KpiCard label="Abonnés actifs" value={fmt(kpis?.abonnes_actifs ?? 0)}
          icon={<IconUsers size={20} />} iconBg="var(--blue-l)" iconColor="var(--blue)" bar="var(--blue)" />
        <KpiCard label="Décodeurs en stock" value={fmt(kpis?.decodeurs_stock ?? 0)}
          icon={<IconBox size={20} />} iconBg="var(--yellow-l)" iconColor="var(--yellow-d)" bar="var(--yellow)" />
        <KpiCard label="Encaissements en attente" value={`${fmt(kpis?.encaissements_en_attente?.montant ?? 0)} F`}
          icon={<IconBank size={20} />} iconBg="var(--red-l)" iconColor="var(--red-d)" bar="var(--red)"
          sub={`${kpis?.encaissements_en_attente?.count ?? 0} à valider`} />
      </div>

      {/* Activité réseau + Top PDVs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-[14px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="mb-1.5">
            <div className="text-[15px] font-extrabold" style={{ color: 'var(--text)' }}>Activité du réseau</div>
            <div className="text-[12.5px]" style={{ color: 'var(--text-3)' }}>Encaissements validés · 12 derniers mois</div>
          </div>
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="periode" fontSize={11} stroke="var(--text-3)" tickLine={false} axisLine={false} />
                <YAxis fontSize={11} stroke="var(--text-3)" tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${fmt(v)} F`, 'CA']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12 }} />
                <Bar dataKey="montant" fill="var(--green)" radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[14px] p-[18px]" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="mb-3.5 text-[15px] font-extrabold" style={{ color: 'var(--text)' }}>Top PDVs · CA validé</div>
          <div className="flex flex-col">
            {(charts?.topPdvs ?? []).slice(0, 7).map((p, i) => (
              <div key={p.pdv_id} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>{i + 1}</span>
                  <span className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>{p.name}</span>
                </div>
                <span className="flex-shrink-0 font-mono text-[13px] font-semibold" style={{ color: 'var(--green-d)' }}>{fmt(p.montant)}</span>
              </div>
            ))}
            {(!charts || charts.topPdvs.length === 0) && <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Aucune donnée</div>}
          </div>
        </div>
      </div>

      {/* Objectif + répartition formule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[14px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="mb-0.5 text-[15px] font-extrabold" style={{ color: 'var(--text)' }}>Objectif recrutement</div>
          <div className="mb-3.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>Mois en cours</div>
          {kpis?.objectif_recrutement && kpis.objectif_recrutement.cible > 0 ? (
            <>
              <div className="mb-2 flex justify-between text-sm">
                <span style={{ color: 'var(--text-2)' }}>{kpis.objectif_recrutement.recrutes} / {kpis.objectif_recrutement.cible}</span>
                <span className="font-bold" style={{ color: 'var(--green-d)' }}>{kpis.objectif_recrutement.taux}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, kpis.objectif_recrutement.taux)}%`, background: 'var(--green)' }} />
              </div>
            </>
          ) : <div className="py-6 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Aucun objectif défini</div>}
        </div>

        <div className="rounded-[14px] p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="mb-3.5 text-[15px] font-extrabold" style={{ color: 'var(--text)' }}>Répartition par formule</div>
          <div className="flex flex-col">
            {(charts?.byFormule ?? []).map((f) => {
              const total = (charts?.byFormule ?? []).reduce((s, x) => s + Number(x._sum.montant ?? 0), 0) || 1;
              const val = Number(f._sum.montant ?? 0);
              const pct = Math.round((val / total) * 100);
              return (
                <div key={f.formule} className="py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>{f.formule}</span>
                    <span className="font-mono" style={{ color: 'var(--text-2)' }}>{fmt(val)} F</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--green)' }} />
                  </div>
                </div>
              );
            })}
            {(!charts || charts.byFormule.length === 0) && <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-3)' }}>Aucune donnée</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
