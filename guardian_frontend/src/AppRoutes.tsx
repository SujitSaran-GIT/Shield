import { lazy, Suspense, type ReactNode } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedGuard from './components/auth/RoleBasedGuard';
import { useAppSelector } from './app/hooks';
const Login = lazy(() => import('./features/auth/Login'));
const Register = lazy(() => import('./features/auth/Register'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Users = lazy(() => import('./features/users/Users'));
const Clients = lazy(() => import('./features/clients/Clients'));
const Audit = lazy(() => import('./features/audit/Audit'));
const Health = lazy(() => import('./features/health/Health'));
const Settings = lazy(() => import('./features/settings/Settings'));
const AccountFlow = lazy(() => import('./features/auth/AccountFlow'));
const admins = ['SUPER_ADMIN', 'CLIENT_ADMIN'];
const guard = (roles: string[], page: ReactNode) => <RoleBasedGuard allowedRoles={roles}>{page}</RoleBasedGuard>;
function Home() { const role = useAppSelector((state) => state.auth.user?.role); return <Navigate to={role === 'USER' ? '/settings' : '/dashboard'} replace />; }
export default function AppRoutes() {
  return <Suspense fallback={<div className="page-loading" role="status">Loading Shield…</div>}><Routes>
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/reset-password" element={<AccountFlow mode="reset" />} />
    <Route path="/bootstrap" element={<AccountFlow mode="bootstrap" />} />
    <Route path="/invitation" element={<AccountFlow mode="invitation" />} />
    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route index element={<Home />} />
      <Route path="dashboard" element={guard(admins, <Dashboard />)} />
      <Route path="users" element={guard(admins, <Users />)} />
      <Route path="clients" element={guard(admins, <Clients />)} />
      <Route path="audit" element={guard(admins, <Audit />)} />
      <Route path="health" element={guard(['SUPER_ADMIN'], <Health />)} />
      <Route path="settings" element={guard([...admins, 'USER'], <Settings />)} />
    </Route>
    <Route path="*" element={<div className="page-loading"><h1>Page not found</h1><Link to="/">Return to your workspace</Link></div>} />
  </Routes></Suspense>;
}
