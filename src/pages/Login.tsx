import { useState, useCallback, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, LogIn, Loader2, Eye, EyeOff, ChevronDown, AlertCircle, Info, Fingerprint } from 'lucide-react';
import { login, showToast } from '../store';
import { DEMO_CREDENTIALS } from '../services/auth';
import type { UserRole } from '../types';
import MatrixRain from '../components/MatrixRain';

interface LoginProps {
  onLogin: () => void;
  initialRole?: UserRole;
}

export default function Login({ onLogin, initialRole }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole || 'io');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  // Pre-fill credentials when switching roles
  useEffect(() => {
    if (initialRole) {
      const cred = DEMO_CREDENTIALS.find(c => c.role === initialRole);
      if (cred) {
        setRole(initialRole);
        setEmail(cred.email);
        setPassword(cred.password);
        setShowDemo(false);
        showToast(`Please log in with ${cred.label} credentials to continue.`, 'info');
      }
    }
  }, [initialRole]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email address is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }

    setIsLoading(true);
    setError('');

    const result = await login(email, password, role);
    if (result.success) {
      showToast('Authentication successful. Welcome to CrimeGPT.', 'success');
      onLogin();
    } else {
      setError(result.error || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  }, [email, password, role, onLogin]);

  const quickFill = useCallback((cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setRole(cred.role);
    setError('');
    setShowDemo(false);
    showToast(`Demo credentials loaded for ${cred.label}`, 'info');
  }, []);

  const roleLabels: Record<UserRole, string> = {
    io: 'Investigation Officer',
    sho: 'Station House Officer',
    legal: 'Legal Advisor',
    admin: 'Administrator',
  };

  return (
    <div className="login-page">
      {/* Matrix binary rain background */}
      <MatrixRain
        color="#00FF41"
        speed={0.9}
        minFontSize={11}
        maxFontSize={17}
        minOpacity={0.04}
        maxOpacity={0.6}
        mutationRate={0.04}
        scanlines={true}
        zIndex={0}
      />

      {/* Scanline CRT overlay on entire page */}
      <div className="scanline-overlay" />

      <div className="login-card">
        {/* Ashoka Emblem / Government Header */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--govt-gold)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
            opacity: 0.85,
          }}>
            सत्यमेव जयते
          </span>
          <div style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            marginTop: 2,
          }}>
            GOVERNMENT OF GUJARAT • HOME DEPARTMENT
          </div>
        </div>

        {/* Logo + Title */}
        <div className="login-header">
          <div className="login-logo gold-pulse">
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h1 style={{
            background: 'linear-gradient(135deg, #E8C96A, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            letterSpacing: '-0.01em',
          }}>
            CrimeGPT 2.0
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.04em' }}>
            Gujarat Police • Cyber Crime Division
          </p>
        </div>

        {/* Security Notice */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(201,168,76,0.07)',
          border: '1px solid rgba(201,168,76,0.2)',
          marginBottom: 'var(--space-lg)',
        }}>
          <Fingerprint size={17} style={{ color: 'var(--govt-gold-light)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
            Secured Portal • JWT Auth • AES-256 Encryption
          </span>
        </div>

        {/* Role Switch Notice */}
        {initialRole && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.22)',
            marginBottom: 'var(--space-md)',
          }}>
            <Info size={16} style={{ color: 'var(--brand-warning)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--brand-warning)' }}>Role switch detected.</strong> Please log in with <strong>{roleLabels[initialRole]}</strong> credentials.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.22)',
            marginBottom: 'var(--space-md)',
          }}>
            <AlertCircle size={16} style={{ color: 'var(--brand-danger)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--brand-danger)' }}>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin}>
          {/* Email */}
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label" style={{ color: 'var(--govt-gold)', opacity: 0.8 }}>Official Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--govt-gold)', opacity: 0.5 }} />
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value.slice(0, 100)); setError(''); }}
                placeholder="officer@gujpol.gov.in"
                maxLength={100}
                style={{
                  paddingLeft: 38,
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderColor: 'rgba(201, 168, 76, 0.18)',
                }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label" style={{ color: 'var(--govt-gold)', opacity: 0.8 }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--govt-gold)', opacity: 0.5 }} />
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                style={{
                  paddingLeft: 38,
                  paddingRight: 38,
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderColor: 'rgba(201, 168, 76, 0.18)',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--govt-gold)',
                  opacity: 0.5, display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Role */}
          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="form-label" style={{ color: 'var(--govt-gold)', opacity: 0.8 }}>Login As</label>
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--govt-gold)', opacity: 0.5 }} />
              <select
                className="form-select"
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                style={{
                  paddingLeft: 38,
                  appearance: 'none',
                  background: 'rgba(0, 0, 0, 0.45)',
                  borderColor: 'rgba(201, 168, 76, 0.18)',
                }}
              >
                <option value="io">Investigation Officer</option>
                <option value="sho">Station House Officer</option>
                <option value="legal">Legal Advisor</option>
                <option value="admin">Administrator</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--govt-gold)', opacity: 0.5, pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={isLoading}
            style={{
              background: isLoading
                ? undefined
                : 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #00D4FF 100%)',
              boxShadow: '0 4px 24px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.3) inset',
              color: '#0A1628',
              fontWeight: 700,
              letterSpacing: '0.02em',
              fontFamily: 'var(--font-mono)',
              border: 'none',
            }}
          >
            {isLoading
              ? <><Loader2 size={18} className="spin" /> Authenticating...</>
              : <><LogIn size={18} /> SIGN IN SECURELY</>
            }
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 'var(--space-lg) 0 var(--space-md)' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
          <span style={{
            fontSize: '0.68rem', color: 'var(--govt-gold)', textTransform: 'uppercase',
            letterSpacing: '0.14em', fontWeight: 600, fontFamily: 'var(--font-mono)',
            opacity: 0.7,
          }}>
            Hackathon Demo
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.2)' }} />
        </div>

        {/* Demo Credentials */}
        <button
          className="btn btn-ghost w-full"
          onClick={() => setShowDemo(!showDemo)}
          style={{
            justifyContent: 'center', fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
            border: '1px dashed rgba(201,168,76,0.3)',
            color: 'var(--govt-gold-light)',
          }}
        >
          <Info size={15} /> {showDemo ? 'Hide' : 'Show'} Demo Credentials
        </button>

        {showDemo && (
          <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_CREDENTIALS.map(cred => (
              <div
                key={cred.role}
                onClick={() => quickFill(cred)}
                style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.background = 'rgba(10,22,40,0.6)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)'; e.currentTarget.style.background = 'rgba(0,0,0,0.35)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{cred.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {cred.email} • Badge: {cred.badge}
                    </div>
                  </div>
                  <span className={`badge ${cred.role === 'io' ? 'badge-primary' : cred.role === 'sho' ? 'badge-warning' : cred.role === 'legal' ? 'badge-info' : 'badge-neutral'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {cred.label}
                  </span>
                </div>
              </div>
            ))}
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              Click any card to auto-fill credentials
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: 'var(--space-xl)', paddingTop: 'var(--space-md)',
          borderTop: '1px solid rgba(201,168,76,0.15)',
        }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--govt-gold)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', opacity: 0.8 }}>
            Gujarat Police • Cyber Crime Division
          </p>
          <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', opacity: 0.6 }}>
            Protected by Argon2 • TLS 1.3 • JWT Refresh Tokens
          </p>
          <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 6, opacity: 0.45, letterSpacing: '0.08em' }}>
            CrimeGPT v2.0 • Investigation Operating System
          </p>
        </div>
      </div>
    </div>
  );
}
