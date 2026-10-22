import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAppSelector } from '../../app/hooks';

export default function Footer() {
  const role = useAppSelector((state) => state.auth.user?.role);
  return <footer className="shield-footer">
    <span className="flex items-center gap-2"><Shield size={16} /> Shield · {new Date().getFullYear()}</span>
    <nav aria-label="Footer navigation" className="flex flex-wrap gap-4">
      <Link to="/settings">Account &amp; security</Link>
      {(role === 'SUPER_ADMIN' || role === 'GUARDIAN_ADMIN') && <Link to="/health">System health</Link>}
      {role === 'CLIENT_ADMIN' && <Link to="/clients">Application integration</Link>}
    </nav>
  </footer>;
}
