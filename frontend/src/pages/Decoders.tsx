import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

interface Decoder {
  id: string;
  serial: string;
  type: string;
  model?: string | null;
  statut: string;
  pdv?: { name: string } | null;
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
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '— (stock)' },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { serial: '', type: '', model: '' };

export default function Decoders() {
  const { user } = useAuth();
  const canManage = ['SUPER', 'LOGISTICS'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Decoder | null>(null);
  const [assignPdv, setAssignPdv] = useState('');
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/decoders'] });

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/decoders', { serial: form.serial, type: form.type, model: form.model || undefined });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setForm({ ...EMPTY });
      setError('');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/decoders/${assignFor!.id}/assign`, { pdvId: assignPdv });
    },
    onSuccess: () => {
      invalidate();
      setAssignFor(null);
      setAssignPdv('');
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/decoders/${id}/return`);
    },
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Decoder>
        title="Décodeurs"
        endpoint="/decoders"
        columns={columns}
        searchable={false}
        toolbar={
          canManage ? (
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Ajouter au stock
            </button>
          ) : undefined
        }
        rowActions={
          canManage
            ? (row) => (
                <div className="flex justify-end gap-2">
                  {row.statut === 'STOCK' && (
                    <button
                      onClick={() => setAssignFor(row)}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      Affecter
                    </button>
                  )}
                  {row.statut === 'DEPLOYED' && (
                    <button
                      onClick={() => returnMutation.mutate(row.id)}
                      className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                    >
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="grid grid-cols-2 gap-4"
        >
          <TextField label="N° série" name="serial" value={form.serial} onChange={set('serial')} required />
          <TextField label="Type" name="type" value={form.type} onChange={set('type')} required />
          <TextField label="Modèle" name="model" value={form.model} onChange={set('model')} />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>

      <Modal open={!!assignFor} title={`Affecter ${assignFor?.serial ?? ''}`} onClose={() => setAssignFor(null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            assignMutation.mutate();
          }}
        >
          <SelectField
            label="Point de vente"
            name="pdvId"
            value={assignPdv}
            onChange={setAssignPdv}
            required
            options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
          />
          <FormActions onCancel={() => setAssignFor(null)} submitting={assignMutation.isPending}>
            Affecter
          </FormActions>
        </form>
      </Modal>
    </>
  );
}
