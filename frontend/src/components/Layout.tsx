import { useState, useEffect, useCallback } from 'react';
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
  IconHome, IconUsers, IconCash, IconBox, IconLogout,
  IconMenu, IconChevronRight, IconSettings, IconCreditCard, IconBarChart,
  IconMapPin, IconTruck, IconWrench, IconX, IconCheck, IconAlert,
} from './icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubItem {
  to: string;
  label: string;
  roles: Role[];
}
interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  roles: Role[];
  single?: boolean;
  to?: string;
  items?: SubItem[];
}

// ─── Navigation structure (matches maquette exactly) ─────────────────────────

const NAV: NavSection[] = [
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    icon: <IconHome size={17} />,
    roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT', 'LOGISTICS', 'COMMERCIAL'],
    single: true,
    to: '/',
  },
  {
    id: 'parametrage',
    label: 'Paramétrage',
    icon: <IconSettings size={17} />,
    roles: ['SUPER', 'ADMIN'],
    items: [
      { to: '/pdvs',       label: 'Points de vente',  roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
      { to: '/users',      label: 'Utilisateurs',     roles: ['SUPER', 'ADMIN'] },
      { to: '/objectifs',  label: 'Objectifs',        roles: ['SUPER', 'ADMIN'] },
    ],
  },
  {
    id: 'operations',
    label: 'Opérations',
    icon: <IconCash size={17} />,
    badge: 0,
    badgeColor: 'var(--green)',
    roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'],
    items: [
      { to: '/encaissements', label: 'Encaissements', roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'] },
      { to: '/versements',    label: 'Versements',    roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'ACCOUNTANT'] },
    ],
  },
  {
    id: 'credit',
    label: 'Gestion Crédit',
    icon: <IconCreditCard size={17} />,
    roles: ['SUPER', 'ADMIN', 'ACCOUNTANT'],
    items: [
      { to: '/commissions', label: 'Commissions',     roles: ['SUPER', 'ADMIN', 'ACCOUNTANT', 'COMMERCIAL'] },
    ],
  },
  {
    id: 'abonnement',
    label: 'Service Abonnement',
    icon: <IconUsers size={17} />,
    badge: 0,
    badgeColor: 'var(--green)',
    roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'COMMERCIAL'],
    items: [
      { to: '/subscribers', label: 'Abonnés',   roles: ['SUPER', 'ADMIN', 'PDV_OPERATOR', 'COMMERCIAL'] },
      { to: '/decoders',    label: 'Décodeurs', roles: ['SUPER', 'ADMIN', 'LOGISTICS'] },
    ],
  },
  {
    id: 'commercial',
    label: 'Suivi Commercial',
    icon: <IconBarChart size={17} />,
    roles: ['SUPER', 'ADMIN', 'COMMERCIAL'],
    items: [
      { to: '/objectifs',   label: 'Objectifs & KPIs',    roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
      { to: '/commissions', label: 'Calcul commissions',  roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
    ],
  },
  {
    id: 'logistique',
    label: 'Logistique Principale / SAT',
    icon: <IconTruck size={17} />,
    badge: 0,
    badgeColor: 'var(--red)',
    roles: ['SUPER', 'ADMIN', 'LOGISTICS'],
    items: [
      { to: '/decoders', label: 'Stock décodeurs', roles: ['SUPER', 'ADMIN', 'LOGISTICS'] },
    ],
  },
  {
    id: 'g11',
    label: 'Logistique G11',
    icon: <IconBox size={17} />,
    roles: ['SUPER', 'ADMIN', 'LOGISTICS'],
    items: [
      { to: '/decoders', label: 'Inventaire G11', roles: ['SUPER', 'ADMIN', 'LOGISTICS'] },
    ],
  },
  {
    id: 'accessoires',
    label: 'Gestion Accessoires',
    icon: <IconWrench size={17} />,
    roles: ['SUPER', 'ADMIN', 'LOGISTICS'],
    items: [
      { to: '/decoders', label: 'Accessoires', roles: ['SUPER', 'ADMIN', 'LOGISTICS'] },
    ],
  },
  {
    id: 'vad',
    label: 'Gestion des VAD',
    icon: <IconMapPin size={17} />,
    roles: ['SUPER', 'ADMIN', 'COMMERCIAL'],
    items: [
      { to: '/pdvs', label: 'Vendeurs à domicile', roles: ['SUPER', 'ADMIN', 'COMMERCIAL'] },
    ],
  },
  {
    id: 'analytique',
    label: 'États Analytiques',
    icon: <IconBarChart size={17} />,
    roles: ['SUPER', 'ADMIN'],
    items: [
      { to: '/audit-log', label: "Journal d'audit", roles: ['SUPER', 'ADMIN'] },
    ],
  },
];

// ─── Role label in French ─────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  SUPER: 'Super Admin',
  ADMIN: 'Administrateur',
  PDV_OPERATOR: 'Opérateur PDV',
  ACCOUNTANT: 'Comptable',
  LOGISTICS: 'Logistique',
  COMMERCIAL: 'Commercial',
};

// ─── Breadcrumb map ───────────────────────────────────────────────────────────

const TITLES: Record<string, { title: string; crumb: string }> = {
  '/':              { title: 'Tableau de Bord',         crumb: '' },
  '/pdvs':          { title: 'Points de vente',         crumb: 'Paramétrage' },
  '/subscribers':   { title: 'Abonnés',                 crumb: 'Service Abonnement' },
  '/encaissements': { title: 'Encaissements',            crumb: 'Opérations' },
  '/versements':    { title: 'Versements',               crumb: 'Opérations' },
  '/decoders':      { title: 'Décodeurs',                crumb: 'Logistique Principale / SAT' },
  '/commissions':   { title: 'Commissions',              crumb: 'Gestion Crédit' },
  '/objectifs':     { title: 'Objectifs',                crumb: 'Suivi Commercial' },
  '/users':         { title: 'Utilisateurs',             crumb: 'Paramétrage' },
  '/audit-log':     { title: "Journal d'audit",          crumb: 'États Analytiques' },
  '/profile':       { title: 'Mon profil',               crumb: 'Compte' },
};

// ─── Alert banner type ────────────────────────────────────────────────────────

export interface AlertBanner {
  id: string;
  type: 'warning' | 'success' | 'error';
  message: string;
  link?: string;
  linkLabel?: string;
}

// Context to push alerts from pages
import { createContext, useContext } from 'react';
export const AlertContext = createContext<{
  alerts: AlertBanner[];
  addAlert: (a: Omit<AlertBanner, 'id'>) => void;
  removeAlert: (id: string) => void;
}>({ alerts: [], addAlert: () => {}, removeAlert: () => {} });
export const useAlerts = () => useContext(AlertContext);

// ─── Main Layout ──────────────────────────────────────────────────────────────

const EMPTY_PWD = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ ...EMPTY_PWD });
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Alert banners
  const [alerts, setAlerts] = useState<AlertBanner[]>([]);
  const addAlert = useCallback((a: Omit<AlertBanner, 'id'>) => {
    setAlerts((prev) => [...prev, { ...a, id: Math.random().toString(36).slice(2) }]);
  }, []);
  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Notifications
  const canReceiveNotifs = ['SUPER', 'ADMIN', 'ACCOUNTANT'].includes(user?.role ?? '');
  const { toasts, addToast, unreadCount, clearUnread } = useToasts();
  useNotifications(addToast, canReceiveNotifs);
  const dismissToast = (_id: string) => {};

  const meta = TITLES[location.pathname] ?? { title: 'SENDISTRI', crumb: '' };
  const userInit = (user?.email ?? '?').slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '';

  // Filter nav by role
  const visibleNav = NAV.filter((s) => user && s.roles.includes(user.role));

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

  // ─── Sidebar ──────────────────────────────────────────────────────────────

  const sidebar = (
    <aside className="flex h-full w-[268px] flex-shrink-0 flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-[18px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <BrandStar size={38} radius={11} />
        <div className="flex flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-wide text-white">SENDISTRI</span>
          <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--sidebar-muted)' }}>ERP Distribution</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {visibleNav.map((sec) => {
          const isOpen = expanded === sec.id;
          const isChildActive = !sec.single && sec.items?.some((i) => {
            const match = location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to));
            return match;
          });
          const isActive = sec.single
            ? (location.pathname === sec.to)
            : isChildActive;

          const filteredItems = sec.items?.filter((i) => user && i.roles.includes(user.role)) ?? [];

          return (
            <div key={sec.id}>
              {/* Section header */}
              {sec.single ? (
                <NavLink
                  to={sec.to!}
                  end
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition-all"
                  style={({ isActive: a }) => ({
                    background: a ? 'rgba(255,255,255,0.97)' : 'transparent',
                    color: a ? '#0B2A1B' : 'rgba(255,255,255,0.72)',
                  })}
                >
                  <span className="flex w-5 items-center justify-center">{sec.icon}</span>
                  <span className="flex-1">{sec.label}</span>
                </NavLink>
              ) : (
                <button
                  onClick={() => setExpanded(isOpen ? null : sec.id)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition-all text-left"
                  style={{
                    background: isActive && !isOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                  }}
                >
                  <span className="flex w-5 items-center justify-center">{sec.icon}</span>
                  <span className="flex-1 text-left">{sec.label}</span>
                  {sec.badge != null && sec.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                      style={{ background: sec.badgeColor ?? 'var(--green)' }}>
                      {sec.badge}
                    </span>
                  )}
                  <span
                    className="ml-auto flex items-center justify-center transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'rgba(255,255,255,0.4)' }}
                  >
                    <IconChevronRight size={14} />
                  </span>
                </button>
              )}

              {/* Sub-items */}
              {!sec.single && isOpen && filteredItems.length > 0 && (
                <div className="mt-0.5 ml-3 space-y-0.5 pl-5" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                  {filteredItems.map((item) => (
                    <NavLink
                      key={item.to + item.label}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center rounded-[8px] px-2.5 py-2 text-[13px] font-medium transition-all"
                      style={({ isActive: a }) => ({
                        background: a ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: a ? '#fff' : 'rgba(255,255,255,0.6)',
                      })}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Profile footer */}
      <div className="relative px-3.5 py-3.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {profileMenuOpen && (
          <div
            className="absolute bottom-[68px] left-3 right-3 z-[70] rounded-xl p-1.5 animate-pop"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
          >
            <button
              onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text)' }}
            >
              Mon profil &amp; 2FA
            </button>
            <button
              onClick={() => { setProfileMenuOpen(false); setPwdOpen(true); setPwdError(''); setPwdSuccess(false); setPwdForm({ ...EMPTY_PWD }); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--text)' }}
            >
              Changer mot de passe
            </button>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setProfileMenuOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-center gap-2.5 border-none bg-transparent p-0 text-left"
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#0E8A4F,#E2A000)' }}
            >
              {userInit}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13.5px] font-bold text-white">{user?.email?.split('@')[0]}</span>
              <span className="block text-[11px] font-medium" style={{ color: 'var(--sidebar-muted)' }}>{roleLabel}</span>
            </span>
          </button>
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className="flex rounded-[7px] p-1.5 transition-colors hover:bg-white/10"
            style={{ color: 'var(--sidebar-muted)' }}
          >
            <IconLogout size={17} />
          </button>
        </div>
      </div>
    </aside>
  );

  // ─── Alert banner helpers ─────────────────────────────────────────────────

  const alertStyles: Record<string, { bg: string; border: string; icon: React.ReactNode; textColor: string; linkColor: string }> = {
    warning: {
      bg: 'var(--yellow-l)',
      border: 'var(--yellow-d)',
      icon: <IconAlert size={16} />,
      textColor: '#7a4a00',
      linkColor: 'var(--yellow-d)',
    },
    success: {
      bg: 'var(--green-ll)',
      border: 'var(--green)',
      icon: <IconCheck size={16} />,
      textColor: 'var(--green-d)',
      linkColor: 'var(--green-d)',
    },
    error: {
      bg: 'var(--red-l)',
      border: 'var(--red)',
      icon: <IconAlert size={16} />,
      textColor: 'var(--red-d)',
      linkColor: 'var(--red-d)',
    },
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      <div data-theme={theme} className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        {/* Desktop sidebar */}
        <div className="hidden md:flex">{sidebar}</div>

        {/* Mobile drawer */}
        {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {sidebar}
        </div>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header
            className="flex h-16 flex-shrink-0 items-center gap-3 px-4 md:px-6"
            style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
          >
            <button onClick={() => setSidebarOpen(true)} className="flex md:hidden" style={{ color: 'var(--text-2)' }}>
              <IconMenu size={22} />
            </button>

            {/* Breadcrumb + title */}
            <div className="min-w-0 flex-1">
              {meta.crumb && (
                <div className="mb-0.5 text-[11px] font-semibold" style={{ color: 'var(--text-3)' }}>
                  {meta.crumb} {' >'}
                </div>
              )}
              <div className="truncate text-[17px] font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
                {meta.title}
              </div>
            </div>

            <GlobalSearchHeader />

            {/* Desktop/Mobile/Theme toggle */}
            <div className="hidden items-center gap-1.5 md:flex">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
                title="Vue bureau"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </button>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
                title="Vue mobile"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>
              </button>
            </div>

            <button
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              className="flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors"
              style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
              title="Changer thème"
            >
              {theme === 'light' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>}
            </button>

            {canReceiveNotifs && (
              <button
                onClick={clearUnread}
                className="relative flex h-9 w-9 items-center justify-center rounded-[9px] transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-2)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: 'var(--red)', border: '2px solid var(--surface)' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
          </header>

          {/* Alert banners */}
          {alerts.length > 0 && (
            <div className="flex-shrink-0 space-y-2 px-4 pt-4 md:px-6">
              {alerts.map((a) => {
                const s = alertStyles[a.type];
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium animate-fade"
                    style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.textColor }}
                  >
                    <span style={{ color: s.linkColor }}>{s.icon}</span>
                    <span className="flex-1">{a.message}</span>
                    {a.link && (
                      <a
                        href={a.link}
                        className="text-sm font-bold underline"
                        style={{ color: s.linkColor }}
                      >
                        {a.linkLabel ?? 'consulter'}
                      </a>
                    )}
                    <button
                      onClick={() => removeAlert(a.id)}
                      className="flex opacity-60 hover:opacity-100"
                      style={{ color: s.textColor }}
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:px-6 md:py-5">
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>

        <NotificationToast toasts={toasts} onDismiss={dismissToast} />

        <Modal open={pwdOpen} title="Changer mon mot de passe" onClose={() => setPwdOpen(false)}>
          {pwdError && (
            <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--red-l)', color: 'var(--red-d)' }}>{pwdError}</div>
          )}
          {pwdSuccess && (
            <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--green-l)', color: 'var(--green-d)' }}>
              Mot de passe changé avec succès.
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); changePwdMutation.mutate(); }} className="space-y-4">
            <TextField label="Mot de passe actuel" name="currentPassword" type="password" value={pwdForm.currentPassword} onChange={setPwd('currentPassword')} required />
            <TextField label="Nouveau mot de passe" name="newPassword" type="password" value={pwdForm.newPassword} onChange={setPwd('newPassword')} required />
            <TextField label="Confirmer" name="confirmPassword" type="password" value={pwdForm.confirmPassword} onChange={setPwd('confirmPassword')} required />
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Min. 8 caractères, une majuscule, une minuscule, un chiffre.</p>
            <FormActions onCancel={() => setPwdOpen(false)} submitting={changePwdMutation.isPending}>
              Changer le mot de passe
            </FormActions>
          </form>
        </Modal>
      </div>
    </AlertContext.Provider>
  );
}
