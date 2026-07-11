import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, LogIn, Mail, Loader2, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { resolvePostLoginPath } from '../routes.js';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const from = location.state?.from;
      const currentPath = from
        ? `${from.pathname || ''}${from.search || ''}`
        : '';
      navigate(resolvePostLoginPath(user, currentPath), { replace: true });
    } catch (err) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img src="/icon.png" alt="Spacehaat" className="login-logo" />
          <div>
            <div className="login-name">Spacehaat</div>
            <div className="login-sub">Command Center</div>
          </div>
        </div>

        <h1 className="login-title">Sign in</h1>
        <p className="login-lead">Access is restricted to authorised team members.</p>

        <form onSubmit={submit} className="login-form">
          <label className="fld">
            <span className="lab">Email</span>
            <div className="login-input">
              <Mail />
              <input
                type="email"
                autoComplete="username"
                placeholder="you@spacehaat.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </label>

          <label className="fld">
            <span className="lab">Password</span>
            <div className="login-input">
              <Lock />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </label>

          {error ? <div className="login-error">{error}</div> : null}

          <button type="submit" className="btn primary lg login-submit" disabled={loading}>
            {loading ? <Loader2 className="spin" /> : <LogIn />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-foot">
          <ShieldCheck /> Secured with encrypted sessions
        </div>
      </div>
    </div>
  );
}
