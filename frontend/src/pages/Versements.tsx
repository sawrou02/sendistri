import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

interface Versement {
  id: string;
  montant: number;
  banque: string;
  bordereau: string;
  statut: string;
  pdv?: { name: string };
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-sendistri-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Versement>[] = [
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
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
        toolbar={
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Nouveau versement
          </button>
        }
        rowActions={
          canConfirm
            ? (row) =>
                row.statut === 'PENDING' ? (
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => decisionMutation.mutate({ id: row.id, statut: 'CONFIRMED' })}
                      className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                    >
                      Confirmer
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

      <Modal open={open} title="Nouveau versement" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="grid grid-cols-2 gap-4"
        >
          {user?.role !== 'PDV_OPERATOR' && (
            <SelectField
              label="PDV"
              name="pdvId"
              value={form.pdvId}
              onChange={set('pdvId')}
              required
              options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
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
