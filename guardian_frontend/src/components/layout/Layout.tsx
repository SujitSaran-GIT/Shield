import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import NotificationContainer from '../common/NotificationContainer';
export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialog = useRef<HTMLDialogElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const signOut = async () => { setMobileOpen(false); await dispatch(logout()); navigate('/login'); };
  useEffect(() => {
    const dialog = mobileDialog.current;
    if (!mobileOpen || !dialog) return;
    const toggle = menuToggle.current;
    const overflow = document.body.style.overflow;
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => { if (event.matches) setMobileOpen(false); };
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
    document.body.style.overflow = 'hidden';
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      dialog.close();
      document.body.style.overflow = overflow;
      toggle?.focus();
    };
  }, [mobileOpen]);
  return <div className="shield-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="desktop-navigation"><Sidebar onLogout={signOut} /></aside>
    {mobileOpen && <dialog ref={mobileDialog} id="mobile-navigation" className="mobile-navigation" aria-label="Navigation" onCancel={(event) => { event.preventDefault(); setMobileOpen(false); }} onClick={(event) => {
      if (event.target === event.currentTarget || (event.target instanceof Element && event.target.closest('a'))) setMobileOpen(false);
    }}>
      <aside aria-label="Mobile navigation"><Sidebar onClose={() => setMobileOpen(false)} onLogout={signOut} /></aside>
    </dialog>}
    <div className="shield-workspace">
      <button ref={menuToggle} className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-haspopup="dialog"><Menu /></button>
      <Header user={user} onLogout={signOut} sidebarOpen />
      <main id="main-content" tabIndex={-1} className="shield-main">
        {/* No exit animation: old protected content unmounts with its route. */}
        <Suspense key={location.pathname} fallback={<div className="page-loading" role="status">Loading this page…</div>}><Outlet /></Suspense>
      </main>
      <footer className="shield-footer"><span>Shield · Identity & access</span><span>Secure by design. Clear by default.</span></footer>
    </div><NotificationContainer />
  </div>;
}
