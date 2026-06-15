import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv } from '../types';

interface Subscriber {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  phone: string;
  formule: string;
  statut: string;
  pdv?: { name: string };
}

const FORMULES = ['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE'];

const columns: Column<Subscriber>[] = [
  { key: 'code', header: 'Code' },
  { key: 'nom', header: 'Nom', render: (r) => `${r.prenom} ${r.nom}` },
  { key: 'phone', header: 'Téléphone' },
  { key: 'formule', header: 'Formule' },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv?.name ?? '—' },
  { key: 'statut', header: 'Statut' },
];

const EMPTY = { code: '', nom: '', prenom: '', phone: '', pdvId: '', formule: '', date_abo: '' };

export default function Subscribers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/subscribers', {
        code: form.code,
        nom: form.nom,
        prenom: form.prenom,
        phone: form.phone,
        pdvId: user?.role === 'PDV_OPERATOR' ? user.pdvId : form.pdvId,
        formule: form.formule,
        date_abo: form.date_abo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/subscribers'] });
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
      <DataTable<Subscriber>
        title="Abonnés"
        endpoint="/subscribers"
        columns={columns}
        toolbar={
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Nouvel abonné
          </button>
        }
      />

      <Modal open={open} title="Nouvel abonné" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid grid-cols-2 gap-4"
        >
          <TextField label="Code" name="code" value={form.code} onChange={set('code')} required />
          <TextField label="Téléphone" name="phone" value={form.phone} onChange={set('phone')} required />
          <TextField label="Prénom" name="prenom" value={form.prenom} onChange={set('prenom')} required />
          <TextField label="Nom" name="nom" value={form.nom} onChange={set('nom')} required />
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
            label="Formule"
            name="formule"
            value={form.formule}
            onChange={set('formule')}
            required
            options={FORMULES.map((f) => ({ value: f, label: f }))}
          />
          <TextField label="Date d'abonnement" name="date_abo" type="date" value={form.date_abo} onChange={set('date_abo')} required />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={mutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
