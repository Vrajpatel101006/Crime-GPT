import { useState, useCallback, useEffect } from 'react';
import { Mail, Lock, ShieldCheck, LogIn, Loader2, Eye, EyeOff, ChevronDown, AlertCircle, Info, Fingerprint } from 'lucide-react';
import { login, showToast } from '../store';
import { DEMO_CREDENTIALS } from '../services/auth';
import type { UserRole } from '../types';

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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
      showToast('Authentication successful.', 'success');
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
    <div className="login-split-container">
      {/* LEFT SECTION - Government Branding */}
      <div className="login-left-panel">
        {/* Subtle background abstract shapes */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(0,103,184,0.05) 0%, rgba(16,35,62,0) 70%)', borderRadius: '50%' }} />
        
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 480 }}>
          <ShieldCheck size={72} strokeWidth={1.5} color="var(--govt-gold)" style={{ margin: '0 auto 32px' }} />
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            National Criminal Intelligence System
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#8899AA', fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1.6 }}>
            Secure Law Enforcement Platform
          </p>
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--govt-gold)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>सत्यमेव जयते</span>
            <div style={{ fontSize: '0.75rem', color: '#5B6470', letterSpacing: '0.1em', marginTop: 8 }}>GOVERNMENT OF INDIA • HOME DEPARTMENT</div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Login Panel */}
      <div className="login-right-panel">
        <div className="login-card-inner">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Agent Sign In</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 32 }}>Enter your official credentials to access the secure portal.</p>

          {/* Security Notice */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: '6px',
            background: 'rgba(0, 103, 184, 0.04)',
            border: '1px solid rgba(0, 103, 184, 0.1)',
            marginBottom: '24px',
          }}>
            <Fingerprint size={18} style={{ color: 'var(--auth-blue)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Session secured with end-to-end encryption.
            </span>
          </div>

          {/* Role Switch Notice */}
          {initialRole && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', borderRadius: '6px',
              background: 'rgba(237, 108, 2, 0.08)', border: '1px solid rgba(237, 108, 2, 0.2)',
              marginBottom: '24px',
            }}>
              <Info size={16} style={{ color: 'var(--brand-warning)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--brand-warning)' }}>Role switch detected.</strong> Please log in with <strong>{roleLabels[initialRole]}</strong> credentials.
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', borderRadius: '6px',
              background: 'rgba(211, 47, 47, 0.08)', border: '1px solid rgba(211, 47, 47, 0.2)',
              marginBottom: '24px',
            }}>
              <AlertCircle size={16} style={{ color: 'var(--brand-danger)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--brand-danger)', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Official Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value.slice(0, 100)); setError(''); }}
                  placeholder="officer@gujpol.gov.in"
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 42px',
                    fontSize: '0.95rem',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    background: '#FFF',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--auth-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 42px',
                    fontSize: '0.95rem',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    background: '#FFF',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--auth-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Login As</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    padding: '12px 42px',
                    fontSize: '0.95rem',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    background: '#FFF',
                    appearance: 'none',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--auth-blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                >
                  <option value="io">Investigation Officer</option>
                  <option value="sho">Station House Officer</option>
                  <option value="legal">Legal Advisor</option>
                  <option value="admin">Administrator</option>
                </select>
                <ChevronDown size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--auth-blue)',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 0.2s',
                opacity: isLoading ? 0.8 : 1
              }}
              onMouseEnter={e => !isLoading && (e.currentTarget.style.background = 'var(--auth-blue-hover)')}
              onMouseLeave={e => !isLoading && (e.currentTarget.style.background = 'var(--auth-blue)')}
            >
              {isLoading
                ? <><Loader2 size={18} className="spin" /> Authenticating...</>
                : <><LogIn size={18} /> Sign In</>
              }
            </button>
          </form>

          {/* Demo Credentials */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setShowDemo(!showDemo)}
              style={{
                width: '100%', background: 'none', border: '1px dashed var(--border-strong)',
                color: 'var(--text-secondary)', padding: 10, borderRadius: 6,
                fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Info size={16} /> {showDemo ? 'Hide' : 'Show'} Demo Credentials
            </button>

            {showDemo && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_CREDENTIALS.map(cred => (
                  <div
                    key={cred.role}
                    onClick={() => quickFill(cred)}
                    style={{
                      padding: '12px', borderRadius: '6px',
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--auth-blue)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{cred.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                          {cred.email}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '4px 8px', background: '#E1E8F0', color: '#5B6470', borderRadius: 4 }}>
                        {cred.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Status Badge */}
          <div style={{
            marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: 0.7,
          }}>
            <ShieldCheck size={12} color="var(--govt-gold)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--govt-gold)', letterSpacing: '0.05em' }}>
              Secure Authentication • Role-Based Access Control
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
