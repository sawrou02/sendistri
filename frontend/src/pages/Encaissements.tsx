import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';
import { downloadPdf, downloadCsvData } from '../utils/export';

interface Encaissement {
  id: string;
  type: string;
  formule: string;
  montant: number;
  mode_paiement: string;
  statut: string;
  created_at: string;
  pdv?: { name: string; code: string } | null;
  subscriber?: { nom: string; prenom: string } | null;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);
const FORMULES = ['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE'];
const MODES = ['WAVE', 'ORANGE_MONEY', 'CASH', 'CHEQUE'];

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    VALIDATED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-sendistri-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Encaissement>[] = [
  { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString('fr-FR') },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—' },
  { key: 'type', header: 'Type' },
  { key: 'formule', header: 'Formule' },
  { key: 'mode_paiement', header: 'Mode' },
  { key: 'montant', header: 'Montant', align: 'right', render: (r) => `${fmt(r.montant)} F` },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { pdvId: '', type: 'REABONNEMENT', formule: '', duree: '1', montant: '', modePaiement: '' };

async function fetchAllEncaissements(): Promise<Encaissement[]> {
  const res = await api.get<{ data: Encaissement[] }>('/encaissements', { params: { limit: 5000, page: 1 } });
  return res.data.data;
}

async function handleExportPdf() {
  const rows = await fetchAllEncaissements();
  const total = rows.reduce((s, r) => s + Number(r.montant), 0);
  downloadPdf({
    title: 'Rapport des Encaissements',
    subtitle: `Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} entrée(s)`,
    filename: `encaissements-${new Date().toISOString().slice(0, 10)}.pdf`,
    columns: [
      { header: 'Date', dataKey: 'date', width: 22 },
      { header: 'PDV', dataKey: 'pdv', width: 45 },
      { header: 'Type', dataKey: 'type', width: 28 },
      { header: 'Formule', dataKey: 'formule', width: 28 },
      { header: 'Mode', dataKey: 'mode', width: 28 },
      { header: 'Montant (F)', dataKey: 'montant', align: 'right', width: 30 },
      { header: 'Statut', dataKey: 'statut', width: 22 },
      { header: 'Abonné', dataKey: 'subscriber', width: 40 },
    ],
    rows: rows.map((r) => ({
      date: new Date(r.created_at).toLocaleDateString('fr-FR'),
      pdv: r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      type: r.type,
      formule: r.formule,
      mode: r.mode_paiement,
      montant: new Intl.NumberFormat('fr-FR').format(r.montant),
      statut: r.statut,
      subscriber: r.subscriber ? `${r.subscriber.prenom} ${r.subscriber.nom}` : '—',
    })),
    totals: [
      { label: 'Total encaissements', value: `${new Intl.NumberFormat('fr-FR').format(total)} F CFA` },
      { label: 'Nombre d\'entrées', value: String(rows.length) },
    ],
  });
}

async function handleExportCsv() {
  const rows = await fetchAllEncaissements();
  downloadCsvData(
    'Encaissements',
    ['Date', 'PDV', 'Type', 'Formule', 'Mode de paiement', 'Montant (F)', 'Statut', 'Abonné'],
    rows.map((r) => [
      new Date(r.created_at).toLocaleDateString('fr-FR'),
      r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      r.type,
      r.formule,
      r.mode_paiement,
      r.montant,
      r.statut,
      r.subscriber ? `${r.subscriber.prenom} ${r.subscriber.nom}` : '—',
    ]),
    `encaissements-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export default function Encaissements() {
  const { user } = useAuth();
  const canValidate = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const extraParams = {
    ...(filterStatut && { statut: filterStatut }),
    ...(filterType && { type: filterType }),
    ...(filterFrom && { from: filterFrom }),
    ...(filterTo && { to: filterTo }),
  };

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/encaissements'] });

  const bulkMutation = useMutation({
    mutationFn: async ({ ids, statut }: { ids: string[]; statut: 'VALIDATED' | 'REJECTED' }) => {
      await api.post('/encaissements/bulk-validate', { ids, statut });
    },
    onSuccess: invalidate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/encaissements', {
        pdvId: user?.role === 'PDV_OPERATOR' ? user.pdvId : form.pdvId,
        type: form.type,
        formule: form.formule,
        duree: Number(form.duree),
        montant: Number(form.montant),
        modePaiement: form.modePaiement,
      });
    },
    onSuccess: () => { invalidate(); setOpen(false); setForm({ ...EMPTY }); setError(''); },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: 'VALIDATED' | 'REJECTED' }) => {
      await api.post(`/encaissements/${id}/validate`, { statut });
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Encaissement>
        title="Encaissements"
        endpoint="/encaissements"
        columns={columns}
        searchable={false}
        extraParams={extraParams}
        selectable={canValidate}
        bulkActions={(ids, clear) => (
          <>
            <button
              onClick={() => bulkMutation.mutate({ ids, statut: 'VALIDATED' }, { onSuccess: clear })}
              disabled={bulkMutation.isPending}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              ✓ Valider tout
            </button>
            <button
              onClick={() => bulkMutation.mutate({ ids, statut: 'REJECTED' }, { onSuccess: clear })}
              disabled={bulkMutation.isPending}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
            >
              ✕ Rejeter tout
            </button>
          </>
        )}
        filters={
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Statut</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none">
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="VALIDATED">Validé</option>
                <option value="REJECTED">Rejeté</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none">
                <option value="">Tous</option>
                <option value="RECRUTEMENT">Recrutement</option>
                <option value="REABONNEMENT">Réabonnement</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Du</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Au</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none" />
            </div>
            {(filterStatut || filterType || filterFrom || filterTo) && (
              <button onClick={() => { setFilterStatut(''); setFilterType(''); setFilterFrom(''); setFilterTo(''); }}
                className="self-end rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                Effacer
              </button>
            )}
          </>
        }
        toolbar={
          <div className="flex gap-2">
            {canValidate && (
              <>
                <button
                  onClick={handleExportCsv}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  ↓ CSV
                </button>
                <button
                  onClick={handleExportPdf}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  ↓ PDF
                </button>
              </>
            )}
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Nouvel encaissement
            </button>
          </div>
        }
        rowActions={
          canValidate
            ? (row) =>
                row.statut === 'PENDING' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => decisionMutation.mutate({ id: row.id, statut: 'VALIDATED' })}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      Valider
                    </button>
                    <button
                      onClick={() => decisionMutation.mutate({ id: row.id, statut: 'REJECTED' })}
                      className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-sendistri-red hover:bg-red-200"
                    >
                      Rejeter
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">—</span>
                )
            : undefined
        }
      />

      <Modal open={open} title="Nouvel encaissement" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid grid-cols-2 gap-4">
          {user?.role !== 'PDV_OPERATOR' && (
            <SelectField label="PDV" name="pdvId" value={form.pdvId} onChange={set('pdvId')} required
              options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          )}
          <SelectField label="Type" name="type" value={form.type} onChange={set('type')} required
            options={[{ value: 'REABONNEMENT', label: 'Réabonnement' }, { value: 'RECRUTEMENT', label: 'Recrutement' }]} />
          <SelectField label="Formule" name="formule" value={form.formule} onChange={set('formule')} required
            options={FORMULES.map((f) => ({ value: f, label: f }))} />
          <TextField label="Durée (mois)" name="duree" type="number" value={form.duree} onChange={set('duree')} required />
          <TextField label="Montant (F)" name="montant" type="number" value={form.montant} onChange={set('montant')} required />
          <SelectField label="Mode de paiement" name="modePaiement" value={form.modePaiement} onChange={set('modePaiement')} required
            options={MODES.map((m) => ({ value: m, label: m }))} />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
