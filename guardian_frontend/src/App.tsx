import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { ThemeProvider } from './app/ThemeContext';
import { WebSocketProvider } from './app/WebSocketContext';
import { restoreSession, sessionExpired } from './features/auth/authSlice';
import AppRoutes from './AppRoutes';
import ErrorBoundary from './components/layout/ErrorBoundary';
function AppContent() {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector((state) => state.auth.initialized);
  useEffect(() => {
    void dispatch(restoreSession());
    const expire = () => dispatch(sessionExpired());
    window.addEventListener('shield:session-expired', expire);
    return () => window.removeEventListener('shield:session-expired', expire);
  }, [dispatch]);
  if (!initialized) return <div className="session-loading" role="status">Connecting to Shield…</div>;
  return <ThemeProvider><WebSocketProvider><BrowserRouter><AppRoutes /></BrowserRouter></WebSocketProvider></ThemeProvider>;
}
export default function App() { return <ErrorBoundary><Provider store={store}><AppContent /></Provider></ErrorBoundary>; }
