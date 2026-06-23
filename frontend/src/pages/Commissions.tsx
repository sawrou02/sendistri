import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { downloadPdf, downloadCsvData } from '../utils/export';

interface Commission {
  id: string;
  periode: string;
  montant_base: string;
  montant_bonus: string;
  montant_total: string;
  statut: string;
  pdv?: { name: string; code: string };
}

async function fetchAllCommissions(): Promise<Commission[]> {
  const res = await api.get<{ data: Commission[] }>('/commissions', { params: { limit: 5000 } });
  return res.data.data;
}

async function handleExportPdf() {
  const rows = await fetchAllCommissions();
  const total = rows.reduce((s, r) => s + Number(r.montant_total), 0);
  downloadPdf({
    title: 'Rapport des Commissions',
    subtitle: `Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} entrée(s)`,
    filename: `commissions-${new Date().toISOString().slice(0, 10)}.pdf`,
    columns: [
      { header: 'PDV', dataKey: 'pdv', width: 55 },
      { header: 'Période', dataKey: 'periode', width: 25 },
      { header: 'Base comm. (F)', dataKey: 'base', align: 'right', width: 35 },
      { header: 'Bonus (F)', dataKey: 'bonus', align: 'right', width: 30 },
      { header: 'Total (F)', dataKey: 'total', align: 'right', width: 35 },
      { header: 'Statut', dataKey: 'statut', width: 22 },
    ],
    rows: rows.map((r) => ({
      pdv: r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      periode: r.periode,
      base: new Intl.NumberFormat('fr-FR').format(Number(r.montant_base)),
      bonus: new Intl.NumberFormat('fr-FR').format(Number(r.montant_bonus)),
      total: new Intl.NumberFormat('fr-FR').format(Number(r.montant_total)),
      statut: r.statut,
    })),
    totals: [
      { label: 'Total commissions à verser', value: `${new Intl.NumberFormat('fr-FR').format(total)} F CFA` },
      { label: 'Nombre de PDVs', value: String(rows.length) },
    ],
  });
}

async function handleExportCsv() {
  const rows = await fetchAllCommissions();
  downloadCsvData(
    'Commissions',
    ['PDV', 'Période', 'Base comm. (F)', 'Bonus (F)', 'Total (F)', 'Statut'],
    rows.map((r) => [
      r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      r.periode,
      Number(r.montant_base),
      Number(r.montant_bonus),
      Number(r.montant_total),
      r.statut,
    ]),
    `commissions-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

interface Commission {
  id: string;
  periode: string;
  montant_base: string;
  montant_bonus: string;
  montant_total: string;
  statut: string;
  pdv?: { name: string; code: string };
}

const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    CALCULATED: 'bg-blue-100 text-blue-700',
    VALIDATED: 'bg-emerald-100 text-emerald-700',
    PAID: 'bg-gray-100 text-text-2',
  };
  const labels: Record<string, string> = {
    CALCULATED: 'Calculé',
    VALIDATED: 'Validé',
    PAID: 'Payé',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>
      {labels[s] ?? s}
    </span>
  );
};

const columns: Column<Commission>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—' },
  { key: 'periode', header: 'Période' },
  { key: 'montant_base', header: 'Base comm.', align: 'right', render: (r) => `${fmt(r.montant_base)} F` },
  { key: 'montant_bonus', header: 'Bonus', align: 'right', render: (r) => `${fmt(r.montant_bonus)} F` },
  { key: 'montant_total', header: 'Total', align: 'right', render: (r) => <strong>{fmt(r.montant_total)} F</strong> },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Commissions() {
  const { user } = useAuth();
  const canManage = ['SUPER', 'ADMIN'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [calcOpen, setCalcOpen] = useState(false);
  const [periode, setPeriode] = useState(currentPeriode());
  const [calcError, setCalcError] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);

  const [filterStatut, setFilterStatut] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('');

  const extraParams = {
    ...(filterStatut && { statut: filterStatut }),
    ...(filterPeriode && { periode: filterPeriode }),
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/commissions'] });

  const calculateMutation = useMutation({
    mutationFn: async () => (await api.post('/commissions/calculate', { periode })).data,
    onSuccess: (data: { message?: string }) => {
      invalidate();
      setCalcError('');
      setCalcResult(data.message ?? 'Calcul effectué.');
    },
    onError: () => setCalcError('Erreur lors du calcul des commissions.'),
  });

  const validateMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/commissions/${id}/validate`),
    onSuccess: invalidate,
  });

  const paidMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/commissions/${id}/mark-paid`),
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Commission>
        title="Commissions"
        endpoint="/commissions"
        columns={columns}
        searchable={false}
        extraParams={extraParams}
        filters={
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Statut</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none">
                <option value="">Tous</option>
                <option value="CALCULATED">Calculé</option>
                <option value="VALIDATED">Validé</option>
                <option value="PAID">Payé</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Période (AAAA-MM)</label>
              <input type="month" value={filterPeriode}
                onChange={(e) => setFilterPeriode(e.target.value ? e.target.value.slice(0, 7) : '')}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none" />
            </div>
            {(filterStatut || filterPeriode) && (
              <button onClick={() => { setFilterStatut(''); setFilterPeriode(''); }}
                className="self-end rounded-lg border border-border px-3 py-2 text-sm text-text-3 hover:bg-surface-2">
                Effacer
              </button>
            )}
          </>
        }
        toolbar={
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-2 hover:bg-surface-2"
            >
              ↓ CSV
            </button>
            <button
              onClick={handleExportPdf}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              ↓ PDF
            </button>
            {canManage && (
              <button
                onClick={() => { setCalcOpen(true); setCalcResult(null); setCalcError(''); }}
                className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-d"
              >
                Calculer commissions
              </button>
            )}
          </div>
        }
        rowActions={
          canManage
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {row.statut === 'CALCULATED' && (
                    <button
                      onClick={() => validateMutation.mutate(row.id)}
                      disabled={validateMutation.isPending}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                    >
                      Valider
                    </button>
                  )}
                  {row.statut === 'VALIDATED' && (
                    <button
                      onClick={() => paidMutation.mutate(row.id)}
                      disabled={paidMutation.isPending}
                      className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                    >
                      Marquer payé
                    </button>
                  )}
                  {row.statut === 'PAID' && (
                    <span className="text-xs text-text-3">Payé</span>
                  )}
                </div>
              )
            : undefined
        }
      />

      <Modal open={calcOpen} title="Calculer les commissions" onClose={() => setCalcOpen(false)}>
        {calcError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{calcError}</div>
        )}
        {calcResult && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{calcResult}</div>
        )}
        <p className="mb-4 text-sm text-text-3">
          Calcule les commissions (5% du CA validé + 10% bonus si objectif atteint) pour tous les PDVs actifs sur la période choisie.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            calculateMutation.mutate();
          }}
          className="space-y-4"
        >
          <TextField
            label="Période (AAAA-MM)"
            name="periode"
            value={periode}
            onChange={setPeriode}
            required
          />
          <FormActions onCancel={() => setCalcOpen(false)} submitting={calculateMutation.isPending}>
            Lancer le calcul
          </FormActions>
        </form>
      </Modal>
    </>
  );
}
