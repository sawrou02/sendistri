import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((i) => user && i.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="flex w-64 flex-col bg-sendistri-dark text-white">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sendistri-green">★</div>
          <span className="text-lg font-extrabold tracking-widest">SENDISTRI</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
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
          <p className="text-xs text-gray-400">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg bg-white/10 py-2 text-sm hover:bg-white/20"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
