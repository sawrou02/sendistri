import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import NotificationToast, { useToasts } from './NotificationToast';
import { useNotifications } from '../hooks/useNotifications';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ ...EMPTY_PWD });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const items = NAV.filter((i) => user && i.roles.includes(user.role));
  const canReceiveNotifs = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const { toasts, addToast, unreadCount, clearUnread } = useToasts();
  useNotifications(addToast, canReceiveNotifs);

  const dismissToast = (_id: string) => { /* toasts auto-dismiss after 6s */ };

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

  const navContent = (
    <>
      {/* Logo + bell */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sendistri-green">★</div>
          <span className="text-lg font-extrabold tracking-widest">SENDISTRI</span>
        </div>
        {canReceiveNotifs && (
          <button
            onClick={clearUnread}
            className="relative rounded-lg p-2 text-gray-300 hover:bg-white/10"
            aria-label="Notifications"
            title="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sendistri-red text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Recherche */}
      <GlobalSearch />

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
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

      {/* User footer */}
      <div className="border-t border-white/10 p-4 text-sm">
        <Link
          to="/profile"
          onClick={() => setSidebarOpen(false)}
          className="mb-1 block truncate font-medium hover:text-sendistri-green"
        >
          {user?.email}
        </Link>
        <p className="mb-3 text-xs text-gray-400">{user?.role}</p>
        <button
          onClick={() => { setPwdOpen(true); setPwdError(''); setPwdSuccess(false); setPwdForm({ ...EMPTY_PWD }); setSidebarOpen(false); }}
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-sendistri-dark text-white md:flex">
        {navContent}
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile sidebar drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sendistri-dark text-white transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Ouvrir le menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sendistri-green text-xs text-white">★</div>
            <span className="font-extrabold tracking-widest text-sendistri-dark">SENDISTRI</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* SSE notification toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      {/* Change password modal */}
      <Modal open={pwdOpen} title="Changer mon mot de passe" onClose={() => setPwdOpen(false)}>
        {pwdError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{pwdError}</div>
        )}
        {pwdSuccess && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Mot de passe changé avec succès.
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); changePwdMutation.mutate(); }} className="space-y-4">
          <TextField label="Mot de passe actuel" name="currentPassword" type="password"
            value={pwdForm.currentPassword} onChange={set('currentPassword')} required />
          <TextField label="Nouveau mot de passe" name="newPassword" type="password"
            value={pwdForm.newPassword} onChange={set('newPassword')} required />
          <TextField label="Confirmer le nouveau mot de passe" name="confirmPassword" type="password"
            value={pwdForm.confirmPassword} onChange={set('confirmPassword')} required />
          <p className="text-xs text-gray-400">Min. 8 caractères, une majuscule, une minuscule, un chiffre.</p>
          <FormActions onCancel={() => setPwdOpen(false)} submitting={changePwdMutation.isPending}>
            Changer le mot de passe
          </FormActions>
        </form>
      </Modal>
    </div>
  );
}
