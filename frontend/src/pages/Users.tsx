import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import DataTable, { Column } from '../components/DataTable';
import Modal from '../components/Modal';
import { TextField, SelectField, FormActions } from '../components/Field';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Pdv, Role } from '../types';

interface AppUser {
  id: string;
  email: string;
  role: Role;
  pdv_id?: string | null;
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
}

const ROLES: Role[] = ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT', 'LOGISTICS', 'COMMERCIAL'];

const roleBadge = (r: Role) => {
  const map: Record<string, string> = {
    SUPER: 'bg-purple-100 text-purple-700',
    ADMIN: 'bg-blue-100 text-blue-700',
    PDV_OPERATOR: 'bg-emerald-100 text-emerald-700',
    ACCOUNTANT: 'bg-amber-100 text-amber-700',
    LOGISTICS: 'bg-orange-100 text-orange-700',
    COMMERCIAL: 'bg-cyan-100 text-cyan-700',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[r] ?? ''}`}>{r}</span>;
};

const EMPTY_CREATE = { email: '', password: '', role: 'PDV_OPERATOR' as Role, pdvId: '' };
const EMPTY_RESET = { newPassword: '' };

export default function Users() {
  const { user: me } = useAuth();
  const isSuperAdmin = me?.role === 'SUPER';
  const canRead = ['SUPER', 'ADMIN'].includes(me?.role ?? '');
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CREATE });
  const [resetForm, setResetForm] = useState({ ...EMPTY_RESET });
  const [error, setError] = useState('');
  const [resetError, setResetError] = useState('');

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/users'] });

  const { data: pdvs } = useQuery({
    queryKey: ['/pdvs', 'all'],
    queryFn: async () => (await api.get<{ data: Pdv[] }>('/pdvs', { params: { limit: 100 } })).data.data,
    enabled: canRead,
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/users', {
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.pdvId && { pdvId: form.pdvId }),
      }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setForm({ ...EMPTY_CREATE });
      setError('');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Erreur lors de la création.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/users/${id}`),
    onSuccess: invalidate,
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => api.put(`/users/${id}`, { is_active: true }),
    onSuccess: invalidate,
  });

  const resetMutation = useMutation({
    mutationFn: async () => api.post(`/users/${resetTarget!.id}/reset-password`, resetForm),
    onSuccess: () => {
      setResetTarget(null);
      setResetForm({ ...EMPTY_RESET });
      setResetError('');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setResetError(ax.response?.data?.message ?? 'Erreur lors de la réinitialisation.');
    },
  });

  const columns: Column<AppUser>[] = [
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Rôle', render: (r) => roleBadge(r.role) },
    {
      key: 'is_active',
      header: 'Statut',
      render: (r) =>
        r.is_active ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Actif</span>
        ) : (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red">Inactif</span>
        ),
    },
    {
      key: 'last_login',
      header: 'Dernière connexion',
      render: (r) => (r.last_login ? new Date(r.last_login).toLocaleString('fr-FR') : '—'),
    },
    {
      key: 'created_at',
      header: 'Créé le',
      render: (r) => new Date(r.created_at).toLocaleDateString('fr-FR'),
    },
  ];

  return (
    <>
      <DataTable<AppUser>
        title="Utilisateurs"
        endpoint="/users"
        columns={columns}
        searchable
        toolbar={
          isSuperAdmin ? (
            <button
              onClick={() => { setCreateOpen(true); setError(''); }}
              className="rounded-lg bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-d"
            >
              + Nouvel utilisateur
            </button>
          ) : undefined
        }
        rowActions={
          isSuperAdmin
            ? (row) => (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setResetTarget(row); setResetError(''); }}
                    className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
                  >
                    Réinit. MDP
                  </button>
                  {row.id !== me?.id && (
                    row.is_active ? (
                      <button
                        onClick={() => deactivateMutation.mutate(row.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red hover:bg-red-200"
                      >
                        Désactiver
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivateMutation.mutate(row.id)}
                        className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
                      >
                        Réactiver
                      </button>
                    )
                  )}
                </div>
              )
            : undefined
        }
      />

      {/* Create user modal */}
      <Modal open={createOpen} title="Nouvel utilisateur" onClose={() => setCreateOpen(false)}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{error}</div>}
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="col-span-2">
            <TextField label="Email" name="email" type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="col-span-2">
            <TextField
              label="Mot de passe temporaire"
              name="password"
              type="password"
              value={form.password}
              onChange={set('password')}
              required
            />
          </div>
          <SelectField
            label="Rôle"
            name="role"
            value={form.role}
            onChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}
            required
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <SelectField
            label="PDV (si opérateur)"
            name="pdvId"
            value={form.pdvId}
            onChange={set('pdvId')}
            options={[{ value: '', label: '— Aucun —' }, ...(pdvs ?? []).map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))]}
          />
          <div className="col-span-2">
            <FormActions onCancel={() => setCreateOpen(false)} submitting={createMutation.isPending} />
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={!!resetTarget}
        title={`Réinitialiser MDP — ${resetTarget?.email ?? ''}`}
        onClose={() => setResetTarget(null)}
      >
        {resetError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red">{resetError}</div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); resetMutation.mutate(); }}
          className="space-y-4"
        >
          <TextField
            label="Nouveau mot de passe"
            name="newPassword"
            type="password"
            value={resetForm.newPassword}
            onChange={(v) => setResetForm({ newPassword: v })}
            required
          />
          <p className="text-xs text-text-3">
            Min. 8 caractères, une majuscule, une minuscule, un chiffre. L'utilisateur devra changer son mot de passe à la prochaine connexion.
          </p>
          <FormActions onCancel={() => setResetTarget(null)} submitting={resetMutation.isPending}>
            Réinitialiser
          </FormActions>
        </form>
      </Modal>
    </>
  );
}
