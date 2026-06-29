/* ============================================
   CRIMEGPT 2.0 — ERROR BOUNDARY
   ============================================
   Catches runtime errors in child components
   (including lazy-loaded pages) and displays
   a styled recovery UI instead of a white screen.

   React requirement: error boundaries must be
   class components — there is no hooks API.
   ============================================ */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console for debugging.
    // We intentionally do NOT write to the audit log here —
    // the error may have corrupted the store, and flooding
    // the audit trail with render errors is not useful.
    console.error('[CrimeGPT] Uncaught render error:', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '70vh', padding: '32px',
        }}>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)', padding: '48px 56px',
            textAlign: 'center', maxWidth: 420, width: '100%',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Icon */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
              background: 'rgba(211, 47, 47, 0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={30} style={{ color: 'var(--brand-danger)' }} />
            </div>

            {/* Heading */}
            <h2 style={{
              fontSize: '1.25rem', fontWeight: 700,
              color: 'var(--text-primary)', marginBottom: 8,
            }}>
              Something went wrong
            </h2>

            {/* Message */}
            <p style={{
              fontSize: '0.9rem', color: 'var(--text-secondary)',
              lineHeight: 1.6, marginBottom: 28, maxWidth: 320, margin: '0 auto 28px',
            }}>
              The page encountered an unexpected error.
              No data has been compromised. Please reload to continue your investigation.
            </p>

            {/* Reload button */}
            <button
              onClick={this.handleReload}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', fontSize: '0.9rem', fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer',
                background: 'var(--auth-blue)', color: '#FFFFFF',
                border: 'none', borderRadius: 'var(--radius-md)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--auth-blue-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--auth-blue)')}
            >
              Reload Page
            </button>

            {/* Help text */}
            <p style={{
              fontSize: '0.75rem', color: 'var(--text-muted)',
              marginTop: 20, letterSpacing: '0.03em',
            }}>
              If this persists, contact your system administrator.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
