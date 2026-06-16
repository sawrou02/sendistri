import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';
import NotificationToast, { useToasts } from './NotificationToast';
import { useNotifications } from '../hooks/useNotifications';
import { TextField, FormActions } from './Field';
import ErrorBoundary from './ErrorBoundary';
import GlobalSearchHeader from './GlobalSearchHeader';
import { BrandStar } from './Brand';
import api from '../api/client';
import type { Role } from '../types';
import {
  IconHome, IconStore, IconUsers, IconCash, IconBank, IconBox, IconPercent,
  IconTarget, IconShield, IconList, IconBell, IconSun, IconMoon, IconLogout,
  IconMenu,
} from './icons';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: React.ReactNode;
  dot: string;
}
interface NavSection {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: 'Pilotage', icon: <IconHome size={18} />, iconColor: 'var(--green)',
    items: [
      { to: '/', label: 'Tableau de bord', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT', 'LOGISTICS', 'COMMERCIAL'], icon: <IconHome size={16} />, dot: 'var(--green)' },
    ],
  },
  {
    label: 'Réseau', icon: <IconStore size={18} />, iconColor: 'var(--green)',
    items: [
      { to: '/pdvs', label: 'Points de vente', roles: ['SUPER', 'ADMIN', 'COMMERCIAL'], icon: <IconStore size={16} />, dot: 'var(--green)' },
      { to: '/subscribers', label: 'Abonnés', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'COMMERCIAL'], icon: <IconUsers size={16} />, dot: 'var(--green)' },
    ],
  },
  {
    label: 'Opérations', icon: <IconCash size={18} />, iconColor: 'var(--yellow)',
    items: [
      { to: '/encaissements', label: 'Encaissements', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'], icon: <IconCash size={16} />, dot: 'var(--yellow)' },
      { to: '/versements', label: 'Versements', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'], icon: <IconBank size={16} />, dot: 'var(--yellow)' },
      { to: '/decoders', label: 'Décodeurs', roles: ['SUPER', 'ADMIN', 'LOGISTICS'], icon: <IconBox size={16} />, dot: 'var(--yellow)' },
    ],
  },
  {
    label: 'Finance', icon: <IconPercent size={18} />, iconColor: 'var(--blue)',
    items: [
      { to: '/commissions', label: 'Commissions', roles: ['SUPER', 'ADMIN', 'ACCOUNTANT', 'COMMERCIAL'], icon: <IconPercent size={16} />, dot: 'var(--blue)' },
      { to: '/objectifs', label: 'Objectifs', roles: ['SUPER', 'ADMIN', 'COMMERCIAL'], icon: <IconTarget size={16} />, dot: 'var(--blue)' },
    ],
  },
  {
    label: 'Administration', icon: <IconShield size={18} />, iconColor: 'var(--red)',
    items: [
      { to: '/users', label: 'Utilisateurs', roles: ['SUPER', 'ADMIN'], icon: <IconUsers size={16} />, dot: 'var(--red)' },
      { to: '/audit-log', label: "Journal d'audit", roles: ['SUPER', 'ADMIN'], icon: <IconList size={16} />, dot: 'var(--red)' },
    ],
  },
];

const TITLES: Record<string, { title: string; crumb: string }> = {
  '/': { title: 'Tableau de bord', crumb: 'Pilotage' },
  '/pdvs': { title: 'Points de vente', crumb: 'Réseau' },
  '/subscribers': { title: 'Abonnés', crumb: 'Réseau' },
  '/encaissements': { title: 'Encaissements', crumb: 'Opérations' },
  '/versements': { title: 'Versements', crumb: 'Opérations' },
  '/decoders': { title: 'Décodeurs', crumb: 'Opérations' },
  '/commissions': { title: 'Commissions', crumb: 'Finance' },
  '/objectifs': { title: 'Objectifs', crumb: 'Finance' },
  '/users': { title: 'Utilisateurs', crumb: 'Administration' },
  '/audit-log': { title: "Journal d'audit", crumb: 'Administration' },
  '/profile': { title: 'Mon profil', crumb: 'Compte' },
};

const EMPTY_PWD = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ ...EMPTY_PWD });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Theme (light/dark) persisted to localStorage.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Sections filtered by role, with at least one visible item.
  const sections = useMemo(
    () => SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => user && i.roles.includes(user.role)) }))
      .filter((s) => s.items.length > 0),
    [user],
  );

  const canReceiveNotifs = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const { toasts, addToast, unreadCount, clearUnread } = useToasts();
  useNotifications(addToast, canReceiveNotifs);
  const dismissToast = (_id: string) => { /* auto-dismiss */ };

  const meta = TITLES[location.pathname] ?? { title: 'SENDISTRI', crumb: '' };
  const userInit = (user?.email ?? '?').slice(0, 2).toUpperCase();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const changePwdMutation = useMutation({
    mutationFn: async () => {
      if (pwdForm.newPassword !== pwdForm.confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');
      await api.post('/auth/change-password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
    },
    onSuccess: () => {
      setPwdSuccess(true); setPwdError(''); setPwdForm({ ...EMPTY_PWD });
      setTimeout(() => { setPwdOpen(false); setPwdSuccess(false); }, 1500);
    },
    onError: (err) => {
      if (err instanceof Error && !('response' in err)) setPwdError(err.message);
      else { const ax = err as AxiosError<{ message?: string }>; setPwdError(ax.response?.data?.message ?? 'Erreur.'); }
    },
  });
  const setPwd = (k: keyof typeof EMPTY_PWD) => (v: string) => setPwdForm((f) => ({ ...f, [k]: v }));

  const sidebar = (
    <aside className="flex h-full w-[266px] flex-shrink-0 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-[18px] py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <BrandStar size={38} radius={11} />
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-wide text-white">SENDISTRI</span>
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--sidebar-muted)' }}>ERP Distribution</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {sections.map((sec) => (
          <div key={sec.label} className="mb-3">
            <div className="flex items-center gap-2.5 px-2.5 pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--sidebar-muted)' }}>
              <span style={{ color: sec.iconColor, display: 'flex' }}>{sec.icon}</span>
              {sec.label}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] font-semibold transition"
                  style={({ isActive }) => ({
                    color: isActive ? '#fff' : 'var(--sidebar-text)',
                    background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  })}
                >
                  <span className="flex h-[18px] w-[18px] items-center justify-center" style={{ color: 'inherit', opacity: 0.85 }}>{item.icon}</span>
                  <span className="text-left">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile footer */}
      <div className="relative px-3.5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {profileOpen && (
          <div className="absolute bottom-[64px] left-3 right-3 z-[70] rounded-xl p-1.5 animate-pop"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
            <button onClick={() => { setProfileOpen(false); navigate('/profile'); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-[var(--surface-2)]" style={{ color: 'var(--text)' }}>
              Mon profil
            </button>
            <button onClick={() => { setProfileOpen(false); setPwdOpen(true); setPwdError(''); setPwdSuccess(false); setPwdForm({ ...EMPTY_PWD }); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-[var(--surface-2)]" style={{ color: 'var(--text)' }}>
              Changer mot de passe
            </button>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <button onClick={() => setProfileOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2.5 border-none bg-transparent p-0 text-left">
            <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#0E8A4F,#E2A000)' }}>{userInit}</span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-bold text-white">{user?.email}</span>
              <span className="block text-[11px]" style={{ color: 'var(--sidebar-muted)' }}>{user?.role}</span>
            </span>
          </button>
          <button onClick={handleLogout} title="Déconnexion" className="flex rounded-[7px] p-1.5" style={{ color: 'var(--sidebar-muted)' }}>
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div data-theme={theme} className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 px-4 md:px-6" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="flex md:hidden" style={{ color: 'var(--text-2)' }}><IconMenu size={22} /></button>
          <div className="min-w-0 flex-1">
            <div className="mb-px text-[11.5px] font-semibold" style={{ color: 'var(--text-3)' }}>{meta.crumb}</div>
            <div className="truncate text-[18px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>{meta.title}</div>
          </div>

          <GlobalSearchHeader />

          <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
            className="flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}>
            {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>

          {canReceiveNotifs && (
            <button onClick={clearUnread} className="relative flex h-10 w-10 items-center justify-center rounded-[10px]"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}>
              <IconBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1 text-[10px] font-bold text-white"
                  style={{ background: 'var(--red)', border: '2px solid var(--surface)' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:px-7 md:py-6">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />

      <Modal open={pwdOpen} title="Changer mon mot de passe" onClose={() => setPwdOpen(false)}>
        {pwdError && <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--red-l)', color: 'var(--red-d)' }}>{pwdError}</div>}
        {pwdSuccess && <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>Mot de passe changé avec succès.</div>}
        <form onSubmit={(e) => { e.preventDefault(); changePwdMutation.mutate(); }} className="space-y-4">
          <TextField label="Mot de passe actuel" name="currentPassword" type="password" value={pwdForm.currentPassword} onChange={setPwd('currentPassword')} required />
          <TextField label="Nouveau mot de passe" name="newPassword" type="password" value={pwdForm.newPassword} onChange={setPwd('newPassword')} required />
          <TextField label="Confirmer le nouveau mot de passe" name="confirmPassword" type="password" value={pwdForm.confirmPassword} onChange={setPwd('confirmPassword')} required />
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Min. 8 caractères, une majuscule, une minuscule, un chiffre.</p>
          <FormActions onCancel={() => setPwdOpen(false)} submitting={changePwdMutation.isPending}>Changer le mot de passe</FormActions>
        </form>
      </Modal>
    </div>
  );
}
