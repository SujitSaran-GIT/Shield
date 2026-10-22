import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Search, LogOut } from 'lucide-react';
import { useTheme } from '../../app/ThemeContext';
import { notificationApi, type Notification } from '../../api/notificationApi';
import { errorMessage } from '../../api/axiosConfig';
import type { User } from '../../types';
export default function Header({ user, onLogout }: { user: User | null; onLogout: () => void; sidebarOpen?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notificationToggle = useRef<HTMLButtonElement>(null);
  const notificationPanel = useRef<HTMLElement>(null);
  const notificationId = useId();
  useEffect(() => { if (opened) notificationPanel.current?.focus(); }, [opened]);
  const closeNotifications = () => { setOpened(false); notificationToggle.current?.focus(); };
  const openNotifications = async () => {
    setOpened(!opened);
    if (opened) return;
    setLoading(true); setError('');
    try { setNotifications((await notificationApi.getUnreadNotifications()).data); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  };
  const readAll = async () => {
    try { await notificationApi.markAllAsRead(); setNotifications([]); }
    catch (failure) { setError(errorMessage(failure)); }
  };
  const search = (event: FormEvent) => { event.preventDefault(); navigate(`/users?query=${encodeURIComponent(query.trim())}`); };
  return <header className="shield-header"><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{location.pathname.slice(1).replaceAll('-', ' ') || 'Overview'}</strong></div><div className="header-actions">
    {user?.role !== 'USER' && <form className="header-search" onSubmit={search}><Search size={17} /><input aria-label="Search users" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users…" /><kbd>↵</kbd></form>}
    <button className="icon-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={toggleTheme}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
    <div className="notification-menu" onKeyDown={(event) => { if (event.key === 'Escape' && opened) { event.preventDefault(); closeNotifications(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpened(false); }}><button ref={notificationToggle} className="icon-button" aria-label="Notifications" aria-expanded={opened} aria-controls={notificationId} onClick={() => { void openNotifications(); }}><Bell size={19} /></button>{opened && <section ref={notificationPanel} id={notificationId} tabIndex={-1} className="notification-panel" aria-label="Notifications"><div className="panel-heading"><strong>Notifications</strong><button className="text-button" onClick={() => { void readAll(); }}>Mark all read</button></div>{loading ? <p role="status">Loading notifications…</p> : error ? <p role="alert">{error}</p> : notifications.length === 0 ? <p>You're all caught up.</p> : notifications.map((item) => <article key={item.id}><strong>{item.title}</strong><p>{item.message}</p></article>)}<button className="text-button" onClick={closeNotifications}>Close</button></section>}</div>
    <Link to="/settings" className="header-account" aria-label="Account settings"><span className="avatar">{(user?.username || user?.email || 'S')[0].toUpperCase()}</span><span>{user?.username || 'Your account'}</span></Link><button className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={18} /></button>
  </div></header>;
}
