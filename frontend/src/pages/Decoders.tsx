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

interface Decoder {
  id: string;
  serial: string;
  type: string;
  model?: string | null;
  statut: string;
  pdv?: { name: string; code: string } | null;
}

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    STOCK: 'bg-blue-100 text-blue-700',
    DEPLOYED: 'bg-emerald-100 text-emerald-700',
    IMMOBILIZED: 'bg-amber-100 text-amber-700',
    LOST: 'bg-red-100 text-sendistri-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Decoder>[] = [
  { key: 'serial', header: 'N° série' },
  { key: 'type', header: 'Type' },
  { key: 'model', header: 'Modèle' },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '— (stock)' },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { serial: '', type: '', model: '' };

async function fetchAllDecoders(): Promise<Decoder[]> {
  const res = await api.get<{ data: Decoder[] }>('/decoders', { params: { limit: 5000 } });
  return res.data.data;
}

async function handleExportCsv() {
  const rows = await fetchAllDecoders();
  downloadCsvData(
    'Décodeurs',
    ['N° série', 'Type', 'Modèle', 'PDV', 'Statut'],
    rows.map((r) => [
      r.serial, r.type, r.model ?? '—',
      r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : 'Stock',
      r.statut,
    ]),
    `decodeurs-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

async function handleExportPdf() {
  const rows = await fetchAllDecoders();
  downloadPdf({
    title: 'Inventaire des Décodeurs',
    subtitle: `Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} décodeur(s)`,
    filename: `decodeurs-${new Date().toISOString().slice(0, 10)}.pdf`,
    columns: [
      { header: 'N° série', dataKey: 'serial', width: 40 },
      { header: 'Type', dataKey: 'type', width: 35 },
      { header: 'Modèle', dataKey: 'model', width: 35 },
      { header: 'PDV', dataKey: 'pdv', width: 60 },
      { header: 'Statut', dataKey: 'statut', width: 25 },
    ],
    rows: rows.map((r) => ({
      serial: r.serial, type: r.type, model: r.model ?? '—',
      pdv: r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : 'Stock',
      statut: r.statut,
    })),
    totals: [
      { label: 'Total décodeurs', value: String(rows.length) },
      { label: 'En stock', value: String(rows.filter((r) => r.statut === 'STOCK').length) },
      { label: 'Déployés', value: String(rows.filter((r) => r.statut === 'DEPLOYED').length) },
    ],
  });
}

export default function Decoders() {
  const { user } = useAuth();
  const canManage = ['SUPER', 'LOGISTICS'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Decoder | null>(null);
  const [assignPdv, setAssignPdv] = useState('');
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/decoders'] });

  const extraParams = { ...(filterStatut && { statut: filterStatut }) };

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async () => api.post('/decoders', { serial: form.serial, type: form.type, model: form.model || undefined }),
    onSuccess: () => { invalidate(); setOpen(false); setForm({ ...EMPTY }); setError(''); },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => api.post(`/decoders/${assignFor!.id}/assign`, { pdvId: assignPdv }),
    onSuccess: () => { invalidate(); setAssignFor(null); setAssignPdv(''); },
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => api.post(`/decoders/${id}/return`),
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Decoder>
        title="Décodeurs"
        endpoint="/decoders"
        columns={columns}
        searchable={false}
        extraParams={extraParams}
        filters={
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Statut</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sendistri-green focus:outline-none">
                <option value="">Tous</option>
                <option value="STOCK">En stock</option>
                <option value="DEPLOYED">Déployé</option>
                <option value="IMMOBILIZED">Immobilisé</option>
                <option value="LOST">Perdu</option>
              </select>
            </div>
            {filterStatut && (
              <button onClick={() => setFilterStatut('')}
                className="self-end rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
                Effacer
              </button>
            )}
          </>
        }
        toolbar={
          <div className="flex gap-2">
            <button onClick={handleExportCsv}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ↓ CSV
            </button>
            <button onClick={handleExportPdf}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              ↓ PDF
            </button>
            {canManage && (
              <button onClick={() => setOpen(true)}
                className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                + Ajouter au stock
              </button>
            )}
          </div>
        }
        rowActions={
          canManage
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {row.statut === 'STOCK' && (
                    <button onClick={() => setAssignFor(row)}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200">
                      Affecter
                    </button>
                  )}
                  {row.statut === 'DEPLOYED' && (
                    <button onClick={() => returnMutation.mutate(row.id)}
                      className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200">
                      Retour stock
                    </button>
                  )}
                  {row.statut !== 'STOCK' && row.statut !== 'DEPLOYED' && (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              )
            : undefined
        }
      />

      <Modal open={open} title="Ajouter un décodeur au stock" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="grid grid-cols-2 gap-4">
          <TextField label="N° série" name="serial" value={form.serial} onChange={set('serial')} required />
          <TextField label="Type" name="type" value={form.type} onChange={set('type')} required />
          <TextField label="Modèle" name="model" value={form.model} onChange={set('model')} />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>

      <Modal open={!!assignFor} title={`Affecter ${assignFor?.serial ?? ''}`} onClose={() => setAssignFor(null)}>
        <form onSubmit={(e) => { e.preventDefault(); assignMutation.mutate(); }}>
          <SelectField label="Point de vente" name="pdvId" value={assignPdv} onChange={setAssignPdv} required
            options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          <FormActions onCancel={() => setAssignFor(null)} submitting={assignMutation.isPending}>
            Affecter
          </FormActions>
        </form>
      </Modal>
    </>
  );
}
