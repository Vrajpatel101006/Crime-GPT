import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, BookOpen, FileText,
  CheckSquare, ScrollText, Bell, Settings, Upload,
  Wifi, WifiOff, Scale, Menu, X, ChevronRight, LogOut, ShieldCheck, Clock
} from 'lucide-react';
import {
  getCurrentRole, getCurrentUser,
  subscribeRole, getIsOnline, toggleOnline, subscribeOnline,
  getNotifications, subscribeNotifications, getToasts,
  subscribeToasts, getIsAuthenticated, subscribeAuth, logout, showToast,
  requestRoleSwitch, getPendingRoleSwitch, clearPendingRoleSwitch,
  getPushPermission,
  initializeStore, getIsInitialized, subscribeInitialized,
  getUserRank, rankName, getAccessibleCases, subscribeCases,
  getUnresolvedWorkflowEvents, subscribeWorkflowEvents,
  getSessionTimeoutMs, touchSession, restoreSession, clearSession,
} from './store';
import type { Toast } from './store';
import type { UserRole } from './types';

import Login from './pages/Login';

import AlertCenter from './components/AlertCenter';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cases = lazy(() => import('./pages/Cases'));
const EvidencePage = lazy(() => import('./pages/Evidence'));
const LegalIntel = lazy(() => import('./pages/LegalIntel'));
const CaseDiary = lazy(() => import('./pages/CaseDiary'));
const Documents = lazy(() => import('./pages/Documents'));
const Review = lazy(() => import('./pages/Review'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Admin = lazy(() => import('./pages/Admin'));

import './index.css';

/* ─── NAVIGATION ITEMS ─── */
/* visibleTo controls which roles see each nav item — undefined = all roles */
const NAV_ITEMS: Array<{ path?: string; icon?: React.ComponentType<{ size?: number; className?: string }>; label: string; badge?: number; section?: boolean; adminOnly?: boolean; visibleTo?: Array<'io' | 'sho' | 'legal' | 'admin'> }> = [
  { label: 'Overview', section: true },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { label: 'Investigation', section: true },
  { path: '/cases', icon: FolderOpen, label: 'Cases' },
  { path: '/evidence', icon: Upload, label: 'Evidence' },
  { path: '/legal', icon: Scale, label: 'Legal Intelligence' },
  { path: '/diary', icon: BookOpen, label: 'Case Diary', visibleTo: ['io', 'sho', 'admin'] },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { label: 'Workflow', section: true },
  { path: '/review', icon: CheckSquare, label: 'Reviews', visibleTo: ['sho', 'legal', 'admin'] },
  { path: '/audit', icon: ScrollText, label: 'Audit Logs', adminOnly: true },
  { label: 'System', section: true, adminOnly: true },
  { path: '/admin', icon: Settings, label: 'Administration', adminOnly: true },
];

/* ─── PAGE TITLES ─── */
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/cases': 'Cases',
  '/evidence': 'Evidence Management',
  '/legal': 'Legal Intelligence',
  '/diary': 'Case Diary',
  '/documents': 'Document Generator',
  '/review': 'Case Reviews',
  '/audit': 'Audit Logs',
  '/admin': 'Administration',
};

/* ─── ROUTE ACCESS MAP ─── */
const ROUTE_ROLES: Record<string, Array<'io' | 'sho' | 'legal' | 'admin'>> = {
  '/diary': ['io', 'sho', 'admin'],
  '/review': ['sho', 'legal', 'admin'],
  '/audit': ['admin'],
  '/admin': ['admin'],
};

function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: Array<'io' | 'sho' | 'legal' | 'admin'> }) {
  const role = getCurrentRole();
  if (!allowedRoles.includes(role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <ShieldCheck size={48} style={{ color: 'var(--text-muted)', marginBottom: 16, opacity: 0.4 }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
          This page is restricted to <strong>{allowedRoles.map(r => r.toUpperCase()).join(', ')}</strong> roles only.
          Your current role ({role.toUpperCase()}) does not have access.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

/* ─── TOAST RENDERER ─── */
function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>(() => getToasts());
  useEffect(() => {
    return subscribeToasts(setToasts);
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'} {t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── ALERT CENTER (component: src/components/AlertCenter.tsx) ─── */

/* ─── SIDEBAR ─── */
function Sidebar({ collapsed, mobileOpen, isMobile }: { collapsed: boolean; mobileOpen: boolean; isMobile: boolean }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const [, setTick] = useState(0);

  // Re-render on data changes for live badge counts
  useEffect(() => {
    const unsub = subscribeCases(() => setTick(t => t + 1));
    return () => { unsub(); };
  }, []);

  // Dynamic badge counts from accessible data
  const accessibleCases = getAccessibleCases();
  const activeCases = accessibleCases.filter(c => c.status === 'active' || c.status === 'draft').length;
  const pendingReviews = accessibleCases.filter(c => c.reviewStatus === 'pending_sho' || c.reviewStatus === 'pending_legal').length;

  const dynamicBadges: Record<string, number | undefined> = {
    '/cases': activeCases > 0 ? activeCases : undefined,
    '/review': pendingReviews > 0 ? pendingReviews : undefined,
  };

  return (
    <aside
      className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}
      style={
        isMobile
          ? undefined  // mobile: CSS handles transform via .mobile-open class
          : collapsed
            ? { width: 'var(--sidebar-collapsed)' }
            : undefined
      }
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={20} strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="sidebar-logo-text">
            <h2>CrimeGPT</h2>
            <span>Gujarat Police</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.filter(item => {
          if (item.adminOnly && user.role !== 'admin') return false;
          if (item.visibleTo && !item.visibleTo.includes(user.role)) return false;
          return true;
        }).map((item, i) => {
          // Skip section labels that have no visible children after them
          if (item.section && item.adminOnly && user.role !== 'admin') return null;
          if (item.section) {
            return !collapsed ? <div key={i} className="sidebar-section-label">{item.label}</div> : <div key={i} style={{ height: 16 }} />;
          }
          const Icon = item.icon!;
          const badge = item.path ? dynamicBadges[item.path] : undefined;
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="sidebar-item-icon" size={20} />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && badge && <span className="sidebar-badge">{badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={() => {
            logout();
            showToast('You have been logged out securely.', 'info');
          }}
          title="Click to log out"
        >
          <div className="sidebar-avatar">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{rankName(userRank)} • {user.station}</div>
            </div>
          )}
          {!collapsed && <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        </div>
      </div>
    </aside>
  );
}

/* ─── TOP BAR ─── */
function TopBar({ onMenuToggle, sidebarCollapsed, isMobile, mobileMenuOpen }: { onMenuToggle: () => void; sidebarCollapsed: boolean; isMobile: boolean; mobileMenuOpen: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(getCurrentRole());
  const [online, setOnline] = useState(getIsOnline());
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [escalationCount, setEscalationCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      setUnreadCount(getNotifications().filter(n => !n.read).length);
      setEscalationCount(getUnresolvedWorkflowEvents().filter(e => e.category === 'escalation').length);
    };
    updateCounts();
    const u1 = subscribeNotifications(updateCounts);
    const u2 = subscribeWorkflowEvents(updateCounts);
    const unsub1 = subscribeRole(setRole);
    const unsub2 = subscribeOnline(setOnline);
    return () => { unsub1(); unsub2(); u1(); u2(); };
  }, []);

  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (newRole !== role) {
      showToast(`Switching to ${newRole.toUpperCase()} role — please log in with ${newRole.toUpperCase()} credentials.`, 'info');
      requestRoleSwitch(newRole);
    }
  }, [role]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'CrimeGPT';

  return (
    <>
      <header className="topbar" style={sidebarCollapsed ? { left: 'var(--sidebar-collapsed)' } : undefined}>
        <div className="topbar-left">
          <button className="btn btn-ghost btn-icon" onClick={onMenuToggle}>
            {isMobile
              ? (mobileMenuOpen ? <X size={18} /> : <Menu size={18} />)
              : (sidebarCollapsed ? <Menu size={18} /> : <X size={18} />)
            }
          </button>
          <div className="topbar-breadcrumb">
            <span>CrimeGPT</span>
            <ChevronRight size={14} style={{ color: 'var(--govt-gold)', opacity: 0.7 }} />
            <strong>{pageTitle}</strong>
          </div>
        </div>
        <div className="topbar-right">
          {/* Role Switcher */}
          <div className="role-switcher">
            <label>Role</label>
            <select value={role} onChange={handleRoleChange}>
              <option value="io">Investigation Officer</option>
              <option value="sho">Station House Officer</option>
              <option value="legal">Legal Advisor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {/* Network Status */}
          <button
            className={`topbar-status ${online ? 'online' : 'offline'}`}
            onClick={toggleOnline}
            title="Toggle network status for demo"
            style={{ cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <span className="status-dot" />
            {online ? <><Wifi size={13} /> Online</> : <><WifiOff size={13} /> Offline</>}
          </button>

          {/* Notifications - Alert Center */}
          <button className="topbar-icon-btn" onClick={() => setShowNotifs(true)} style={{ position: 'relative' }}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot" />}
            {escalationCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 2,
                fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px',
                borderRadius: 6, background: '#FF3B3B', color: '#fff',
                minWidth: 14, textAlign: 'center', lineHeight: '14px',
              }}>{escalationCount}</span>
            )}
          </button>

          {/* Settings — admin only */}
          {role === 'admin' && (
            <button className="topbar-icon-btn" title="Administration" onClick={() => navigate('/admin')}>
              <Settings size={18} />
            </button>
          )}
        </div>
      </header>
      <AlertCenter key={String(showNotifs)} open={showNotifs} onClose={() => setShowNotifs(false)} />
    </>
  );
}

/* ─── IDLE TIMEOUT HOOK ─── */
function useIdleTimeout(isAuth: boolean, onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef(60);

  const resetTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearInterval(warnTimerRef.current);
    setShowWarning(false);
    countdownRef.current = 60;
    setCountdown(60);

    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      countdownRef.current = 60;
      setCountdown(60);
      warnTimerRef.current = setInterval(() => {
        countdownRef.current -= 1;
        setCountdown(countdownRef.current);
        if (countdownRef.current <= 0) {
          if (warnTimerRef.current) clearInterval(warnTimerRef.current);
          onLogout();
        }
      }, 1000);
    }, getSessionTimeoutMs());
  }, [onLogout]);

  useEffect(() => {
    if (!isAuth) return;
    const EVENTS = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
    const handleActivity = () => {
      touchSession();
      resetTimers();
    };
    const handleVisibility = () => {
      if (document.hidden) {
        // Pause: clear timers while tab is hidden
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (warnTimerRef.current) clearInterval(warnTimerRef.current);
      } else {
        // Resume: restart from fresh activity
        touchSession();
        resetTimers();
      }
    };
    EVENTS.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    resetTimers(); // start initial timer
    return () => {
      EVENTS.forEach(e => document.removeEventListener(e, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibility);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warnTimerRef.current) clearInterval(warnTimerRef.current);
    };
  }, [isAuth, resetTimers]);

  return { showWarning, countdown };
}

/* ─── MAIN APP ─── */
function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const [isAuth, setIsAuth] = useState(getIsAuthenticated);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [isReady, setIsReady] = useState(getIsInitialized);
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for screen size changes
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (e.matches) setMobileMenuOpen(false); // close mobile menu on resize to mobile
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!getIsInitialized()) {
      initializeStore().finally(() => setIsReady(true));
    }
    return subscribeInitialized(() => setIsReady(true));
  }, []);

  // Auto-login on refresh if stored session is still valid
  useEffect(() => {
    if (isReady && !getIsAuthenticated()) {
      if (restoreSession()) {
        setIsAuth(true);
      }
    }
  }, [isReady]);

  // Idle timeout — logs out after sessionTimeout minutes of inactivity
  const handleIdleLogout = useCallback(() => {
    clearSession();
    logout();
    showToast('Logged out due to inactivity. Please sign in again.', 'warning', 6000);
  }, []);
  const { showWarning, countdown } = useIdleTimeout(isAuth, handleIdleLogout);

  useEffect(() => {
    return subscribeAuth((auth) => {
      setIsAuth(auth);
      if (!auth) {
        setPendingRole(getPendingRoleSwitch());
      }
      // After login, check if notification permission was denied
      if (auth) {
        setTimeout(() => {
          if (getPushPermission() === 'denied') {
            showToast('Notifications blocked. Enable them in browser settings to receive OS-level alerts.', 'warning', 6000);
          }
        }, 3500);
      }
    });
  }, []);

  // Auto-redirect when role changes and current path is inaccessible
  useEffect(() => {
    return subscribeRole((newRole) => {
      const restrictedRoles = ROUTE_ROLES[location.pathname];
      if (restrictedRoles && !restrictedRoles.includes(newRole)) {
        navigate('/', { replace: true });
        showToast('Redirected to Dashboard — previous page is restricted for your role.', 'info');
      }
    });
  }, [location.pathname, navigate]);

  if (!isReady) {
    return (
      <div className="login-page" style={{ background: 'var(--govt-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <div style={{ margin: '0 auto 24px', opacity: 0.9 }}>
            <ShieldCheck size={48} strokeWidth={1.5} color="var(--govt-gold)" />
          </div>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            letterSpacing: '0.02em',
            marginBottom: 8,
            color: '#FFFFFF'
          }}>
            National Criminal Intelligence System
          </h2>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)',
            letterSpacing: '0.05em'
          }}>
            Secure Initialization...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <Login
        onLogin={() => { clearPendingRoleSwitch(); setPendingRole(null); setIsAuth(true); }}
        initialRole={pendingRole || undefined}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile backdrop overlay — closes menu on tap */}
      {isMobile && mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <Sidebar collapsed={sidebarCollapsed} mobileOpen={isMobile && mobileMenuOpen} isMobile={isMobile} />
      <div
        className="app-main"
        style={
          isMobile
            ? { marginLeft: 0 }
            : sidebarCollapsed
              ? { marginLeft: 'var(--sidebar-collapsed)' }
              : undefined
        }
      >
        <TopBar
          onMenuToggle={() => {
            if (isMobile) {
              setMobileMenuOpen(o => !o);
            } else {
              setSidebarCollapsed(c => !c);
            }
          }}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          mobileMenuOpen={mobileMenuOpen}
        />
        <main className="app-content">
          <ErrorBoundary>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
              <div className="confidence-bar" style={{ width: 200, height: 4 }}>
                <div className="confidence-fill high" style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading module...</span>
            </div>
          }>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/legal" element={<LegalIntel />} />
            <Route path="/diary" element={<RoleGuard allowedRoles={ROUTE_ROLES['/diary']}><CaseDiary /></RoleGuard>} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/review" element={<RoleGuard allowedRoles={ROUTE_ROLES['/review']}><Review /></RoleGuard>} />
            <Route path="/audit" element={<RoleGuard allowedRoles={ROUTE_ROLES['/audit']}><AuditLogs /></RoleGuard>} />
            <Route path="/admin" element={<RoleGuard allowedRoles={ROUTE_ROLES['/admin']}><Admin /></RoleGuard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />

      {/* Idle session timeout warning — auto-dismisses on any user activity */}
      {showWarning && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            background: 'var(--surface-1)', borderRadius: 'var(--radius-xl)',
            padding: '40px 48px', textAlign: 'center', maxWidth: 380, width: '100%',
            border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-xl)',
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: countdown <= 10 ? 'rgba(211,47,47,0.1)' : 'rgba(237,108,2,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Clock size={26} style={{ color: countdown <= 10 ? 'var(--brand-danger)' : 'var(--brand-warning)' }} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Session Expiring
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              You will be automatically logged out due to inactivity.
            </p>
            <div style={{
              fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
              color: countdown <= 10 ? 'var(--brand-danger)' : 'var(--brand-warning)',
              marginBottom: 20,
            }}>
              {countdown}s
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Move your mouse or press any key to stay logged in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
