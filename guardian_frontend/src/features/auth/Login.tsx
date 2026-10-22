import { useState, type FormEvent } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { loginAdmin } from './authSlice';
export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await dispatch(loginAdmin({ email: email.trim(), password }));
    if (loginAdmin.fulfilled.match(result)) navigate('/', { replace: true });
  };
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <div className="auth-page">
    <section className="auth-story"><Link to="/login" className="shield-brand"><span className="brand-mark"><ShieldCheck /></span><span>Shield<span className="brand-caption">Identity platform</span></span></Link>
      <div className="auth-statement"><span className="eyebrow">Trust starts with identity</span><h1>The right access.<br />For every person.</h1><p>Manage your applications, understand authentication activity, and keep your workspace secure.</p><div className="auth-proof"><ShieldCheck size={20} /><span>Centralized identity. Clearly defined control.</span></div></div><span className="auth-copyright">Shield authentication platform</span>
    </section>
    <main className="auth-main"><div className="auth-form"><span className="eyebrow">Welcome back</span><h2>Sign in to Shield</h2><p className="text-muted">Your applications and identities, in one workspace.</p>
      {error && <div role="alert" className="form-error">{error}</div>}
      <form onSubmit={submit} className="form-stack">
        <label htmlFor="email">Email address<input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@company.com" /></label>
        <label htmlFor="password">Password<div className="password-field"><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} className="icon-button" onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        <Link className="auth-reset" to="/reset-password">Forgot your password?</Link>
        <button className="primary-button" disabled={loading}>{loading ? 'Signing in…' : <>Sign in <ArrowRight size={18} /></>}</button>
      </form><p className="auth-switch">New to Shield? <Link to="/register">Create a workspace account</Link></p>
      <div className="auth-help">Signing in to an integrated application? Start from that application's sign-in page.</div>
    </div></main>
  </div>;
}
