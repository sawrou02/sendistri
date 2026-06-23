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

interface Versement {
  id: string;
  montant: number;
  banque: string;
  bordereau: string;
  created_at: string;
  statut: string;
  pdv?: { name: string; code: string } | null;
}

async function fetchAllVersements(): Promise<Versement[]> {
  const res = await api.get<{ data: Versement[] }>('/versements', { params: { limit: 5000 } });
  return res.data.data;
}

async function handleExportPdf() {
  const rows = await fetchAllVersements();
  const total = rows.reduce((s, r) => s + Number(r.montant), 0);
  downloadPdf({
    title: 'Rapport des Versements',
    subtitle: `Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} versement(s)`,
    filename: `versements-${new Date().toISOString().slice(0, 10)}.pdf`,
    columns: [
      { header: 'Date', dataKey: 'date', width: 25 },
      { header: 'PDV', dataKey: 'pdv', width: 55 },
      { header: 'Banque', dataKey: 'banque', width: 35 },
      { header: 'Bordereau', dataKey: 'bordereau', width: 35 },
      { header: 'Montant (F)', dataKey: 'montant', align: 'right', width: 30 },
      { header: 'Statut', dataKey: 'statut', width: 22 },
    ],
    rows: rows.map((r) => ({
      date: new Date(r.created_at).toLocaleDateString('fr-FR'),
      pdv: r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      banque: r.banque, bordereau: r.bordereau,
      montant: new Intl.NumberFormat('fr-FR').format(r.montant),
      statut: r.statut,
    })),
    totals: [
      { label: 'Total versé', value: `${new Intl.NumberFormat('fr-FR').format(total)} F CFA` },
      { label: 'Nombre de versements', value: String(rows.length) },
    ],
  });
}

async function handleExportCsv() {
  const rows = await fetchAllVersements();
  downloadCsvData(
    'Versements',
    ['Date', 'PDV', 'Banque', 'N° Bordereau', 'Montant (F)', 'Statut'],
    rows.map((r) => [
      new Date(r.created_at).toLocaleDateString('fr-FR'),
      r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      r.banque, r.bordereau, r.montant, r.statut,
    ]),
    `versements-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Versement>[] = [
  { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString('fr-FR') },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—' },
  { key: 'banque', header: 'Banque' },
  { key: 'bordereau', header: 'Bordereau' },
  { key: 'montant', header: 'Montant', align: 'right', render: (r) => `${fmt(r.montant)} F` },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { pdvId: '', montant: '', banque: '', bordereau: '' };

export default function Versements() {
  const { user } = useAuth();
  const canConfirm = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const extraParams = {
    ...(filterStatut && { statut: filterStatut }),
    ...(filterFrom && { from: filterFrom }),
    ...(filterTo && { to: filterTo }),
  };

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/versements'] });

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/versements', {
        pdvId: user?.role === 'PDV_OPERATOR' ? user.pdvId : form.pdvId,
        montant: Number(form.montant),
        banque: form.banque,
        bordereau: form.bordereau,
      });
    },
    onSuccess: () => { invalidate(); setOpen(false); setForm({ ...EMPTY }); setError(''); },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: 'CONFIRMED' | 'REJECTED' }) => {
      await api.post(`/versements/${id}/confirm`, { statut });
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Versement>
        title="Versements"
        endpoint="/versements"
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
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="REJECTED">Rejeté</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Du</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Au</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none" />
            </div>
            {(filterStatut || filterFrom || filterTo) && (
              <button onClick={() => { setFilterStatut(''); setFilterFrom(''); setFilterTo(''); }}
                className="self-end rounded-lg border border-border px-3 py-2 text-sm text-text-3 hover:bg-surface-2">
                Effacer
              </button>
            )}
          </>
        }
        toolbar={
          <div className="flex gap-2">
            {canConfirm && (
              <>
                <button onClick={handleExportCsv}
                  className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-2 hover:bg-surface-2">
                  ↓ CSV
                </button>
                <button onClick={handleExportPdf}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  ↓ PDF
                </button>
              </>
            )}
            <button onClick={() => setOpen(true)}
              className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-d">
              + Nouveau versement
            </button>
          </div>
        }
        rowActions={
          canConfirm
            ? (row) =>
                row.statut === 'PENDING' ? (
                  <div className="flex justify-end gap-2">
                    <button onClick={() => decisionMutation.mutate({ id: row.id, statut: 'CONFIRMED' })}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                      Confirmer
                    </button>
                    <button onClick={() => decisionMutation.mutate({ id: row.id, statut: 'REJECTED' })}
                      className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red hover:bg-red-200">
                      Rejeter
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-text-3">—</span>
                )
            : undefined
        }
      />

      <Modal open={open} title="Nouveau versement" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid grid-cols-2 gap-4">
          {user?.role !== 'PDV_OPERATOR' && (
            <SelectField label="PDV" name="pdvId" value={form.pdvId} onChange={set('pdvId')} required
              options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          )}
          <TextField label="Banque" name="banque" value={form.banque} onChange={set('banque')} required />
          <TextField label="N° Bordereau" name="bordereau" value={form.bordereau} onChange={set('bordereau')} required />
          <TextField label="Montant (F)" name="montant" type="number" value={form.montant} onChange={set('montant')} required />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
