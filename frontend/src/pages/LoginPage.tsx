import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { extractError } from '../lib/axios';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [phone, setPhone] = useState('+998901234567');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(phone, password);
      navigate(from === '/login' ? '/' : from, { replace: true });
    } catch (err) {
      setError(extractError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand">
          <div className="mark"><img src="/logo-mark.png" alt="Do'konchi" /></div>
          <div>
            <h1>Do'konchi</h1>
            <span>Hisob-kitob</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Telefon</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 9X XXX XX XX"
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            <span>Parol</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </label>
          {error && <div className="login-err">{error}</div>}
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Kirilmoqda...' : 'Kirish'}
          </button>
          <div className="login-hint">
            Sinov: <code>+998901234567</code> / <code>admin123</code>
          </div>
        </form>
      </div>

      <style>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            radial-gradient(circle at 20% 10%, var(--accent-soft) 0%, transparent 50%),
            radial-gradient(circle at 90% 90%, var(--amber-soft) 0%, transparent 55%),
            var(--paper);
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 32px 28px;
          box-shadow: var(--shadow);
        }
        .login-card .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .login-card .brand .mark {
          width: 46px; height: 46px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid var(--line);
          overflow: hidden;
          flex-shrink: 0;
        }
        .login-card .brand .mark img {
          width: 100%; height: 100%;
          object-fit: contain;
          display: block;
        }
        .login-card .brand h1 {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
        }
        .login-card .brand span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .6px;
          color: var(--ink-soft);
        }
        .login-form { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field span {
          font-size: 12px;
          color: var(--ink-soft);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: .4px;
        }
        .field input {
          padding: 11px 14px;
          border: 1px solid var(--line-strong);
          border-radius: 10px;
          background: var(--paper-2);
          color: var(--ink);
          outline: none;
          transition: border-color .15s, background .15s;
        }
        .field input:focus {
          border-color: var(--accent);
          background: var(--card);
        }
        .login-err {
          background: var(--brick-soft);
          color: var(--brick);
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13px;
        }
        .btn-primary {
          background: var(--accent);
          color: var(--paper-2);
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: filter .15s, transform .15s;
        }
        .btn-primary:hover:not(:disabled) {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
        .login-hint {
          font-size: 12px;
          color: var(--ink-faint);
          text-align: center;
          margin-top: 4px;
        }
        .login-hint code {
          font-family: 'IBM Plex Mono', monospace;
          background: var(--paper);
          padding: 1px 6px;
          border-radius: 4px;
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}
