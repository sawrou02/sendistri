import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

const fmt = (n: string | number) => new Intl.NumberFormat('fr-FR').format(Number(n));

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-gray-100 text-gray-600',
    SUSPENDED: 'bg-red-100 text-sendistri-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? ''}`}>{s}</span>;
};

const columns: Column<Pdv>[] = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Nom' },
  { key: 'type', header: 'Type' },
  { key: 'region', header: 'Région' },
  { key: 'solde', header: 'Solde', align: 'right', render: (r) => `${fmt(r.solde)} F` },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { code: '', name: '', type: 'PDV', secteur: '', region: '', phone: '', email: '', caution: '' };

export default function Pdvs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user?.role === 'SUPER' || user?.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/pdvs', {
        code: form.code,
        name: form.name,
        type: form.type,
        secteur: form.secteur,
        region: form.region,
        phone: form.phone || undefined,
        email: form.email || undefined,
        caution: Number(form.caution),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/pdvs'] });
      setOpen(false);
      setForm({ ...EMPTY });
      setError('');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  return (
    <>
      <DataTable<Pdv>
        title="Points de vente"
        endpoint="/pdvs"
        columns={columns}
        extraParams={filterStatut ? { statut: filterStatut } : {}}
        filters={
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Statut</label>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sendistri-green"
            >
              <option value="">Tous</option>
              <option value="ACTIVE">Actif</option>
              <option value="INACTIVE">Inactif</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>
        }
        rowActions={(row) => (
          <button
            onClick={() => navigate(`/pdvs/${row.id}`)}
            className="rounded px-2 py-1 text-xs text-sendistri-green hover:underline"
          >
            Détail →
          </button>
        )}
        toolbar={
          canCreate ? (
            <button
              onClick={() => setOpen(true)}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Nouveau PDV
            </button>
          ) : undefined
        }
      />

      <Modal open={open} title="Nouveau point de vente" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-2 gap-4"
        >
          <TextField label="Code" name="code" value={form.code} onChange={set('code')} required />
          <TextField label="Nom" name="name" value={form.name} onChange={set('name')} required />
          <SelectField
            label="Type"
            name="type"
            value={form.type}
            onChange={set('type')}
            required
            options={[
              { value: 'PDV', label: 'PDV' },
              { value: 'PARTNER', label: 'Partenaire' },
            ]}
          />
          <TextField label="Secteur" name="secteur" value={form.secteur} onChange={set('secteur')} required />
          <TextField label="Région" name="region" value={form.region} onChange={set('region')} required />
          <TextField label="Caution (F)" name="caution" type="number" value={form.caution} onChange={set('caution')} required />
          <TextField label="Téléphone" name="phone" value={form.phone} onChange={set('phone')} />
          <TextField label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={mutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
