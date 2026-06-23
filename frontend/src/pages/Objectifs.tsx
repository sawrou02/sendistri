import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

interface Objectif {
  id: string;
  periode: string;
  recrutement_cible: number;
  reabonnement_cible: number;
  ca_cible: string;
  pdv?: { name: string; code: string } | null;
}

const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));

function currentPeriode() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const EMPTY = { pdvId: '', periode: currentPeriode(), recrutement_cible: '', reabonnement_cible: '', ca_cible: '' };

const columns: Column<Objectif>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : <em className="text-text-3">Distributeur</em> },
  { key: 'periode', header: 'Période' },
  { key: 'recrutement_cible', header: 'Recrutement cible', align: 'right', render: (r) => fmt(r.recrutement_cible) },
  { key: 'reabonnement_cible', header: 'Réabonn. cible', align: 'right', render: (r) => fmt(r.reabonnement_cible) },
  { key: 'ca_cible', header: 'CA cible', align: 'right', render: (r) => `${fmt(r.ca_cible)} F` },
];

export default function Objectifs() {
  const { user } = useAuth();
  const canManage = ['SUPER', 'ADMIN'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Objectif | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/objectifs'] });

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
    enabled: canManage,
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY });
    setError('');
    setOpen(true);
  };

  const openEdit = (row: Objectif) => {
    setEditTarget(row);
    setForm({
      pdvId: '',
      periode: row.periode,
      recrutement_cible: String(row.recrutement_cible),
      reabonnement_cible: String(row.reabonnement_cible),
      ca_cible: String(row.ca_cible),
    });
    setError('');
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        recrutement_cible: Number(form.recrutement_cible),
        reabonnement_cible: Number(form.reabonnement_cible),
        ca_cible: Number(form.ca_cible),
      };
      if (editTarget) {
        return api.put(`/objectifs/${editTarget.id}`, body);
      }
      return api.post('/objectifs', {
        ...body,
        periode: form.periode,
        ...(form.pdvId && { pdvId: form.pdvId }),
      });
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setError('');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de l\'enregistrement.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/objectifs/${id}`),
    onSuccess: invalidate,
  });

  return (
    <>
      <DataTable<Objectif>
        title="Objectifs"
        endpoint="/objectifs"
        columns={columns}
        searchable={false}
        toolbar={
          canManage ? (
            <button
              onClick={openCreate}
              className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-d"
            >
              + Nouvel objectif
            </button>
          ) : undefined
        }
        rowActions={
          canManage
            ? (row) => (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openEdit(row)}
                    className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(row.id)}
                    className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red hover:bg-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              )
            : undefined
        }
      />

      <Modal
        open={open}
        title={editTarget ? `Modifier objectif — ${editTarget.periode}` : 'Nouvel objectif'}
        onClose={() => setOpen(false)}
      >
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{error}</div>}
        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
          className="grid grid-cols-2 gap-4"
        >
          {!editTarget && (
            <>
              <TextField
                label="Période (AAAA-MM)"
                name="periode"
                value={form.periode}
                onChange={set('periode')}
                required
              />
              <SelectField
                label="PDV (vide = distributeur)"
                name="pdvId"
                value={form.pdvId}
                onChange={set('pdvId')}
                options={[
                  { value: '', label: '— Niveau distributeur —' },
                  ...(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
                ]}
              />
            </>
          )}
          <TextField
            label="Recrutement cible"
            name="recrutement_cible"
            type="number"
            value={form.recrutement_cible}
            onChange={set('recrutement_cible')}
            required
          />
          <TextField
            label="Réabonnement cible"
            name="reabonnement_cible"
            type="number"
            value={form.reabonnement_cible}
            onChange={set('reabonnement_cible')}
            required
          />
          <div className="col-span-2">
            <TextField
              label="CA cible (F)"
              name="ca_cible"
              type="number"
              value={form.ca_cible}
              onChange={set('ca_cible')}
              required
            />
          </div>
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={saveMutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
