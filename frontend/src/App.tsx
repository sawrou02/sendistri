import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pdvs from './pages/Pdvs';
import PdvDetail from './pages/PdvDetail';
import Profile from './pages/Profile';
import Subscribers from './pages/Subscribers';
import Encaissements from './pages/Encaissements';
import Versements from './pages/Versements';
import Decoders from './pages/Decoders';
import Commissions from './pages/Commissions';
import Users from './pages/Users';
import Objectifs from './pages/Objectifs';
import AuditLog from './pages/AuditLog';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sendistri-dark text-white">
        Chargement…
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pdvs" element={<Pdvs />} />
        <Route path="pdvs/:id" element={<PdvDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="subscribers" element={<Subscribers />} />
        <Route path="encaissements" element={<Encaissements />} />
        <Route path="versements" element={<Versements />} />
        <Route path="decoders" element={<Decoders />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="users" element={<Users />} />
        <Route path="objectifs" element={<Objectifs />} />
        <Route path="audit-log" element={<AuditLog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
