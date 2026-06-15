import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import { TextField, FormActions } from './Field';
import api from '../api/client';
import type { Role } from '../types';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT', 'LOGISTICS', 'COMMERCIAL'] },
  { to: '/pdvs', label: 'Points de vente', roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
  { to: '/subscribers', label: 'Abonnés', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'COMMERCIAL'] },
  { to: '/encaissements', label: 'Encaissements', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'] },
  { to: '/versements', label: 'Versements', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'] },
  { to: '/decoders', label: 'Décodeurs', roles: ['SUPER', 'ADMIN', 'LOGISTICS'] },
  { to: '/commissions', label: 'Commissions', roles: ['SUPER', 'ADMIN', 'ACCOUNTANT', 'COMMERCIAL'] },
  { to: '/objectifs', label: 'Objectifs', roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
  { to: '/users', label: 'Utilisateurs', roles: ['SUPER', 'ADMIN'] },
  { to: '/audit-log', label: "Journal d'audit", roles: ['SUPER', 'ADMIN'] },
];

const EMPTY_PWD = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ ...EMPTY_PWD });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const items = NAV.filter((i) => user && i.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const changePwdMutation = useMutation({
    mutationFn: async () => {
      if (pwdForm.newPassword !== pwdForm.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas.');
      }
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
    },
    onSuccess: () => {
      setPwdSuccess(true);
      setPwdError('');
      setPwdForm({ ...EMPTY_PWD });
      setTimeout(() => { setPwdOpen(false); setPwdSuccess(false); }, 1500);
    },
    onError: (err) => {
      if (err instanceof Error && !('response' in err)) {
        setPwdError(err.message);
      } else {
        const ax = err as AxiosError<{ message?: string }>;
        setPwdError(ax.response?.data?.message ?? 'Erreur lors du changement de mot de passe.');
      }
    },
  });

  const set = (k: keyof typeof EMPTY_PWD) => (v: string) => setPwdForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-64 flex-col bg-sendistri-dark text-white">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sendistri-green">★</div>
          <span className="text-lg font-extrabold tracking-widest">SENDISTRI</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-sendistri-green text-white' : 'text-gray-300 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4 text-sm">
          <p className="truncate font-medium">{user?.email}</p>
          <p className="mb-3 text-xs text-gray-400">{user?.role}</p>
          <button
            onClick={() => { setPwdOpen(true); setPwdError(''); setPwdSuccess(false); setPwdForm({ ...EMPTY_PWD }); }}
            className="mb-2 w-full rounded-lg bg-white/10 py-2 text-sm hover:bg-white/20"
          >
            Changer mot de passe
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-sendistri-red/80 py-2 text-sm hover:bg-sendistri-red"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>

      <Modal open={pwdOpen} title="Changer mon mot de passe" onClose={() => setPwdOpen(false)}>
        {pwdError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{pwdError}</div>
        )}
        {pwdSuccess && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Mot de passe changé avec succès.
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); changePwdMutation.mutate(); }}
          className="space-y-4"
        >
          <TextField
            label="Mot de passe actuel"
            name="currentPassword"
            type="password"
            value={pwdForm.currentPassword}
            onChange={set('currentPassword')}
            required
          />
          <TextField
            label="Nouveau mot de passe"
            name="newPassword"
            type="password"
            value={pwdForm.newPassword}
            onChange={set('newPassword')}
            required
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            name="confirmPassword"
            type="password"
            value={pwdForm.confirmPassword}
            onChange={set('confirmPassword')}
            required
          />
          <p className="text-xs text-gray-400">
            Min. 8 caractères, une majuscule, une minuscule, un chiffre.
          </p>
          <FormActions onCancel={() => setPwdOpen(false)} submitting={changePwdMutation.isPending}>
            Changer le mot de passe
          </FormActions>
        </form>
      </Modal>
    </div>
  );
}
