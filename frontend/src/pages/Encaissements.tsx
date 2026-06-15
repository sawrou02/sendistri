import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

interface Encaissement {
  id: string;
  type: string;
  formule: string;
  montant: number;
  mode_paiement: string;
  statut: string;
  pdv?: { name: string };
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
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'type', header: 'Type' },
  { key: 'formule', header: 'Formule' },
  { key: 'mode_paiement', header: 'Mode' },
  { key: 'montant', header: 'Montant', align: 'right', render: (r) => `${fmt(r.montant)} F` },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { pdvId: '', type: 'REABONNEMENT', formule: '', duree: '1', montant: '', modePaiement: '' };

export default function Encaissements() {
  const { user } = useAuth();
  const canValidate = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/encaissements'] });

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
        toolbar={
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Nouvel encaissement
          </button>
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
          <SelectField
            label="Type"
            name="type"
            value={form.type}
            onChange={set('type')}
            required
            options={[
              { value: 'REABONNEMENT', label: 'Réabonnement' },
              { value: 'RECRUTEMENT', label: 'Recrutement' },
            ]}
          />
          <SelectField
            label="Formule"
            name="formule"
            value={form.formule}
            onChange={set('formule')}
            required
            options={FORMULES.map((f) => ({ value: f, label: f }))}
          />
          <TextField label="Durée (mois)" name="duree" type="number" value={form.duree} onChange={set('duree')} required />
          <TextField label="Montant (F)" name="montant" type="number" value={form.montant} onChange={set('montant')} required />
          <SelectField
            label="Mode de paiement"
            name="modePaiement"
            value={form.modePaiement}
            onChange={set('modePaiement')}
            required
            options={MODES.map((m) => ({ value: m, label: m }))}
          />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
