import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, ShieldCheck, Activity, Settings, LogOut, X } from 'lucide-react';
import { useAppSelector } from '../../app/hooks';

const navigation = [
  { path: '/dashboard', name: 'Overview', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'] },
  { path: '/clients', name: 'Applications', icon: Building2, roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'] },
  { path: '/users', name: 'User directory', icon: Users, roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'] },
  { path: '/audit', name: 'Activity & audit', icon: ShieldCheck, roles: ['SUPER_ADMIN', 'CLIENT_ADMIN'] },
  { path: '/health', name: 'System health', icon: Activity, roles: ['SUPER_ADMIN'] },
  { path: '/settings', name: 'Account & security', icon: Settings, roles: ['SUPER_ADMIN', 'CLIENT_ADMIN', 'USER'] },
];
export default function Sidebar({ onClose, onLogout }: { onClose?: () => void; onLogout: () => void }) {
  const user = useAppSelector((state) => state.auth.user);
  return <div className="shield-sidebar">
    <NavLink to="/" className="shield-brand"><span className="brand-mark"><ShieldCheck size={23} /></span><span>Shield<span className="brand-caption">Identity platform</span></span></NavLink>
    {onClose && <button className="sidebar-close icon-button" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>}
    <div className="scope-label">{user?.role === 'SUPER_ADMIN' ? 'Platform administration' : user?.role === 'CLIENT_ADMIN' ? 'Your workspace' : 'Your account'}</div>
    <nav aria-label="Main navigation">{navigation.filter((item) => item.roles.includes(user?.role || '')).map(({ path, name, icon: Icon }) =>
      <NavLink key={path} to={path} onClick={onClose} className={({ isActive }) => `sidebar-link${isActive ? ' selected' : ''}`}><Icon size={19} /><span>{name}</span></NavLink>
    )}</nav>
    <div className="sidebar-note"><ShieldCheck size={19} /><p>One place to manage<br /><strong>trusted access.</strong></p></div>
    <div className="sidebar-account"><div className="avatar">{(user?.username || user?.email || 'S')[0].toUpperCase()}</div><div><strong>{user?.username || user?.email}</strong><span>{user?.role.replaceAll('_', ' ').toLowerCase()}</span></div><button className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={18} /></button></div>
  </div>;
}
