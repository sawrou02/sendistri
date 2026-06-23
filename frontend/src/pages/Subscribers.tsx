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

interface Subscriber {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  phone: string;
  formule: string;
  statut: string;
  pdv?: { name: string; code: string } | null;
}

const FORMULES = ['ACCESS', 'EVASION', 'EVASION_PLUS', 'TOUT_CANAL', 'PRESTIGE'];

const statutBadge = (s: string) => {
  const map: Record<string, string> = {
    ACTIF: 'bg-emerald-100 text-emerald-700',
    SUSPENDU: 'bg-amber-100 text-amber-700',
    RESILIE: 'bg-red-100 text-red',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[s] ?? 'bg-gray-100 text-text-2'}`}>{s}</span>;
};

const columns: Column<Subscriber>[] = [
  { key: 'code', header: 'Code' },
  { key: 'nom', header: 'Nom', render: (r) => `${r.prenom} ${r.nom}` },
  { key: 'phone', header: 'Téléphone' },
  { key: 'formule', header: 'Formule' },
  { key: 'pdv', header: 'PDV', render: (r) => r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—' },
  { key: 'statut', header: 'Statut', render: (r) => statutBadge(r.statut) },
];

const EMPTY = { code: '', nom: '', prenom: '', phone: '', pdvId: '', formule: '', date_abo: '' };

async function fetchAllSubscribers(): Promise<Subscriber[]> {
  const res = await api.get<{ data: Subscriber[] }>('/subscribers', { params: { limit: 5000 } });
  return res.data.data;
}

async function handleExportPdf() {
  const rows = await fetchAllSubscribers();
  downloadPdf({
    title: 'Liste des Abonnés',
    subtitle: `Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${rows.length} abonné(s)`,
    filename: `abonnes-${new Date().toISOString().slice(0, 10)}.pdf`,
    columns: [
      { header: 'Code', dataKey: 'code', width: 22 },
      { header: 'Nom complet', dataKey: 'nom', width: 50 },
      { header: 'Téléphone', dataKey: 'phone', width: 28 },
      { header: 'Formule', dataKey: 'formule', width: 28 },
      { header: 'PDV', dataKey: 'pdv', width: 50 },
      { header: 'Statut', dataKey: 'statut', width: 22 },
    ],
    rows: rows.map((r) => ({
      code: r.code,
      nom: `${r.prenom} ${r.nom}`,
      phone: r.phone,
      formule: r.formule,
      pdv: r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      statut: r.statut,
    })),
    totals: [
      { label: 'Total abonnés', value: String(rows.length) },
      { label: 'Actifs', value: String(rows.filter((r) => r.statut === 'ACTIF').length) },
    ],
  });
}

async function handleExportCsv() {
  const rows = await fetchAllSubscribers();
  downloadCsvData(
    'Abonnés',
    ['Code', 'Prénom', 'Nom', 'Téléphone', 'Formule', 'PDV', 'Statut'],
    rows.map((r) => [
      r.code, r.prenom, r.nom, r.phone, r.formule,
      r.pdv ? `${r.pdv.code} — ${r.pdv.name}` : '—',
      r.statut,
    ]),
    `abonnes-${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export default function Subscribers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterFormule, setFilterFormule] = useState('');

  const extraParams = {
    ...(filterStatut && { statut: filterStatut }),
    ...(filterFormule && { formule: filterFormule }),
  };

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post('/subscribers', {
        code: form.code, nom: form.nom, prenom: form.prenom, phone: form.phone,
        pdvId: user?.role === 'PDV_OPERATOR' ? user.pdvId : form.pdvId,
        formule: form.formule, date_abo: form.date_abo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/subscribers'] });
      setOpen(false); setForm({ ...EMPTY }); setError('');
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
        searchable
        extraParams={extraParams}
        filters={
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Statut</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none">
                <option value="">Tous</option>
                <option value="ACTIF">Actif</option>
                <option value="SUSPENDU">Suspendu</option>
                <option value="RESILIE">Résilié</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-3">Formule</label>
              <select value={filterFormule} onChange={(e) => setFilterFormule(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-green focus:outline-none">
                <option value="">Toutes</option>
                {FORMULES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {(filterStatut || filterFormule) && (
              <button onClick={() => { setFilterStatut(''); setFilterFormule(''); }}
                className="self-end rounded-lg border border-border px-3 py-2 text-sm text-text-3 hover:bg-surface-2">
                Effacer
              </button>
            )}
          </>
        }
        toolbar={
          <div className="flex gap-2">
            <button onClick={handleExportCsv}
              className="rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text-2 hover:bg-surface-2">
              ↓ CSV
            </button>
            <button onClick={handleExportPdf}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              ↓ PDF
            </button>
            <button onClick={() => setOpen(true)}
              className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-d">
              + Nouvel abonné
            </button>
          </div>
        }
      />

      <Modal open={open} title="Nouvel abonné" onClose={() => setOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="grid grid-cols-2 gap-4">
          <TextField label="Code" name="code" value={form.code} onChange={set('code')} required />
          <TextField label="Téléphone" name="phone" value={form.phone} onChange={set('phone')} required />
          <TextField label="Prénom" name="prenom" value={form.prenom} onChange={set('prenom')} required />
          <TextField label="Nom" name="nom" value={form.nom} onChange={set('nom')} required />
          {user?.role !== 'PDV_OPERATOR' && (
            <SelectField label="PDV" name="pdvId" value={form.pdvId} onChange={set('pdvId')} required
              options={(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))} />
          )}
          <SelectField label="Formule" name="formule" value={form.formule} onChange={set('formule')} required
            options={FORMULES.map((f) => ({ value: f, label: f }))} />
          <TextField label="Date d'abonnement" name="date_abo" type="date" value={form.date_abo} onChange={set('date_abo')} required />
          <div className="col-span-2">
            <FormActions onCancel={() => setOpen(false)} submitting={mutation.isPending} />
          </div>
        </form>
      </Modal>
    </>
  );
}
