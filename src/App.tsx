import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, BookOpen, FileText,
  CheckSquare, ScrollText, Bell, Settings, Upload,
  Wifi, WifiOff, Scale, Menu, X, ChevronRight, LogOut, ShieldCheck
} from 'lucide-react';
import {
  getCurrentRole, getCurrentUser,
  subscribeRole, getIsOnline, toggleOnline, subscribeOnline,
  getNotifications, markNotificationRead, getToasts,
  subscribeToasts, getIsAuthenticated, subscribeAuth, logout, showToast,
  requestRoleSwitch, getPendingRoleSwitch, clearPendingRoleSwitch,
  initializeStore, getIsInitialized, subscribeInitialized,
} from './store';
import type { Toast } from './store';
import type { UserRole, Notification as NotifType } from './types';

import Login from './pages/Login';
import MatrixRain from './components/MatrixRain';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import EvidencePage from './pages/Evidence';
import LegalIntel from './pages/LegalIntel';
import CaseDiary from './pages/CaseDiary';
import Documents from './pages/Documents';
import Review from './pages/Review';
import AuditLogs from './pages/AuditLogs';
import Admin from './pages/Admin';

import './index.css';

/* ─── NAVIGATION ITEMS ─── */
const NAV_ITEMS = [
  { label: 'Overview', section: true },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { label: 'Investigation', section: true },
  { path: '/cases', icon: FolderOpen, label: 'Cases', badge: 3 },
  { path: '/evidence', icon: Upload, label: 'Evidence' },
  { path: '/legal', icon: Scale, label: 'Legal Intelligence' },
  { path: '/diary', icon: BookOpen, label: 'Case Diary' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { label: 'Workflow', section: true },
  { path: '/review', icon: CheckSquare, label: 'Reviews', badge: 2 },
  { path: '/audit', icon: ScrollText, label: 'Audit Logs' },
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

/* ─── TOAST RENDERER ─── */
function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    setToasts(getToasts());
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

/* ─── NOTIFICATIONS PANEL ─── */
function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifs, setNotifs] = useState<NotifType[]>([]);
  useEffect(() => { setNotifs(getNotifications()); }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>Notifications</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {notifs.length === 0 && (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p>No notifications</p>
            </div>
          )}
          {notifs.map(n => (
            <div
              key={n.id}
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                background: n.read ? 'transparent' : 'rgba(201, 168, 76, 0.04)',
              }}
              onClick={() => { markNotificationRead(n.id); setNotifs(getNotifications()); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--govt-gold)', flexShrink: 0, boxShadow: '0 0 6px rgba(201,168,76,0.5)' }} />}
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{n.title}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>{n.message}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {new Date(n.timestamp).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── SIDEBAR ─── */
function Sidebar({ collapsed }: { collapsed: boolean }) {
  const user = getCurrentUser();
  const roleLabels: Record<UserRole, string> = { io: 'Investigation Officer', sho: 'Station House Officer', legal: 'Legal Advisor', admin: 'Administrator' };

  return (
    <aside className="sidebar" style={collapsed ? { width: 'var(--sidebar-collapsed)' } : undefined}>
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
        {NAV_ITEMS.filter(item => !item.adminOnly || user.role === 'admin').map((item, i) => {
          // Skip section labels that have no visible children after them
          if (item.section && item.adminOnly && user.role !== 'admin') return null;
          if (item.section) {
            return !collapsed ? <div key={i} className="sidebar-section-label">{item.label}</div> : <div key={i} style={{ height: 16 }} />;
          }
          const Icon = item.icon!;
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
              {!collapsed && item.badge && <span className="sidebar-badge">{item.badge}</span>}
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
              <div className="sidebar-user-role">{roleLabels[user.role]}</div>
            </div>
          )}
          {!collapsed && <LogOut size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
        </div>
      </div>
    </aside>
  );
}

/* ─── TOP BAR ─── */
function TopBar({ onMenuToggle, sidebarCollapsed }: { onMenuToggle: () => void; sidebarCollapsed: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(getCurrentRole());
  const [online, setOnline] = useState(getIsOnline());
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = getNotifications().filter(n => !n.read).length;

  useEffect(() => {
    const unsub1 = subscribeRole(setRole);
    const unsub2 = subscribeOnline(setOnline);
    return () => { unsub1(); unsub2(); };
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
            {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
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

          {/* Notifications */}
          <button className="topbar-icon-btn" onClick={() => setShowNotifs(true)}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="badge-dot" />}
          </button>

          {/* Settings — admin only */}
          {role === 'admin' && (
            <button className="topbar-icon-btn" title="Administration" onClick={() => navigate('/admin')}>
              <Settings size={18} />
            </button>
          )}
        </div>
      </header>
      <NotificationsPanel open={showNotifs} onClose={() => setShowNotifs(false)} />
    </>
  );
}

/* ─── MAIN APP ─── */
function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuth, setIsAuth] = useState(getIsAuthenticated);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [isReady, setIsReady] = useState(getIsInitialized);

  useEffect(() => {
    if (!getIsInitialized()) {
      initializeStore().finally(() => setIsReady(true));
    }
    return subscribeInitialized(() => setIsReady(true));
  }, []);

  useEffect(() => {
    return subscribeAuth((auth) => {
      setIsAuth(auth);
      if (!auth) {
        setPendingRole(getPendingRoleSwitch());
      }
    });
  }, []);

  if (!isReady) {
    return (
      <div className="login-page">
        <MatrixRain
          color="#00FF41"
          speed={0.6}
          minFontSize={10}
          maxFontSize={14}
          minOpacity={0.03}
          maxOpacity={0.35}
          mutationRate={0.02}
          scanlines={true}
          zIndex={0}
        />
        <div className="scanline-overlay" />
        <div className="login-card" style={{ textAlign: 'center', padding: '56px 36px' }}>
          <div className="login-logo gold-pulse" style={{ margin: '0 auto 20px' }}>
            <ShieldCheck size={28} strokeWidth={2.2} />
          </div>
          <h2 style={{
            background: 'linear-gradient(135deg, #E8C96A, #00D4FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 12,
            fontWeight: 900,
          }}>
            CrimeGPT 2.0
          </h2>
          <p className="binary-text" style={{ fontSize: '0.8rem', letterSpacing: '0.06em' }}>
            Initializing Secure Investigation Environment...
          </p>
          <div style={{
            marginTop: 20,
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            opacity: 0.6,
          }}>
            GUJARAT POLICE • CYBER CRIME DIVISION
          </div>
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
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="app-main" style={sidebarCollapsed ? { marginLeft: 'var(--sidebar-collapsed)' } : undefined}>
        <TopBar onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} sidebarCollapsed={sidebarCollapsed} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/legal" element={<LegalIntel />} />
            <Route path="/diary" element={<CaseDiary />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/review" element={<Review />} />
            <Route path="/audit" element={<AuditLogs />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
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
