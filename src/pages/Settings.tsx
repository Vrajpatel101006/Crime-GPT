/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  User, Globe, FileText, Bell, Save, ShieldCheck,
} from 'lucide-react';
import {
  getCurrentUser, getCurrentRole, getUserRank, rankName,
  requestRoleSwitch, showToast,
  getUserPreferences, updateUserPreferences, subscribeUserPreferences,
} from '../store';
import type { UserPreferences } from '../store';
import type { UserRole } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { requestPushPermission, isPushEnabled, getNotificationPermission } from '../services/push';

/* ─── ROLE LABELS ─── */
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'io', label: 'Investigation Officer' },
  { value: 'sho', label: 'Station House Officer' },
  { value: 'legal', label: 'Legal Advisor' },
  { value: 'admin', label: 'Administrator' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  io: '#6366f1', sho: '#f59e0b', legal: '#10b981', admin: '#ef4444',
};

/* ─── MAIN EXPORT ─── */
export default function Settings() {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const [role, setRole] = useState<UserRole>(getCurrentRole());

  const { language, changeLanguage, languages } = useTranslation();
  const [prefs, setPrefs] = useState<UserPreferences>(getUserPreferences());
  const [pushEnabled, setPushEnabled] = useState(isPushEnabled());
  const [pushSupported] = useState(() => typeof Notification !== 'undefined');

  useEffect(() => {
    return subscribeUserPreferences(() => setPrefs(getUserPreferences()));
  }, []);

  /* ── Role switch ── */
  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as UserRole;
    if (newRole !== role) {
      setRole(newRole);
      showToast(
        `Switching to ${newRole.toUpperCase()} role — please log in with ${newRole.toUpperCase()} credentials.`,
        'info',
      );
      requestRoleSwitch(newRole);
    }
  }, [role]);

  /* ── Language change (immediate) ── */
  const handleUiLanguage = useCallback(async (code: string) => {
    const lang = code as 'en' | 'hi' | 'gu';
    await changeLanguage(lang);
    updateUserPreferences({ uiLanguage: lang });
    showToast('Language changed successfully.', 'success');
  }, [changeLanguage]);

  /* ── Push notification toggle ── */
  const handlePushToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      const granted = await requestPushPermission();
      setPushEnabled(granted);
      if (granted) {
        updateUserPreferences({ desktopNotifications: true });
        showToast('Desktop notifications enabled.', 'success');
      } else {
        showToast('Notification permission denied. Please allow in browser settings.', 'warning');
      }
    } else {
      setPushEnabled(false);
      updateUserPreferences({ desktopNotifications: false });
      showToast('Desktop notifications disabled.', 'info');
    }
  }, []);

  /* ── Save other preferences ── */
  const handleSave = useCallback(() => {
    updateUserPreferences(prefs);
    showToast('Preferences saved — changes apply immediately.', 'success');
  }, [prefs]);

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const pushPerm = pushSupported ? getNotificationPermission() : 'denied';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-muted">Manage your profile, language, and application preferences</p>
        </div>
      </div>

      <div className="settings-grid">

        {/* ── Profile Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <User size={18} style={{ color: ROLE_COLORS[role] }} />
            <h4>Profile</h4>
          </div>
          <div className="settings-profile">
            <div className="settings-avatar" style={{ background: ROLE_COLORS[role] }}>
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="settings-profile-info">
              <div className="settings-profile-name">{user.name}</div>
              <div className="settings-profile-meta">
                {rankName(userRank)} &bull; {user.station}
              </div>
              <div className="settings-profile-meta">{user.email}</div>
              <div className="settings-profile-meta" style={{ fontFamily: 'monospace' }}>
                Badge: {user.badge}
              </div>
            </div>
          </div>
        </div>

        {/* ── Role Switcher Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <ShieldCheck size={18} style={{ color: '#6366f1' }} />
            <h4>Active Role</h4>
          </div>
          <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>
            Switch roles to view the application as a different officer type. You will be asked to log in again with the corresponding credentials.
          </p>
          <div className="form-group">
            <label>Current Role</label>
            <select className="form-select" value={role} onChange={handleRoleChange}>
              {ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="settings-role-badges">
            {ROLE_OPTIONS.map(r => (
              <span
                key={r.value}
                className="badge"
                style={{
                  background: ROLE_COLORS[r.value] + '18',
                  color: ROLE_COLORS[r.value],
                  border: `1px solid ${ROLE_COLORS[r.value]}40`,
                  opacity: r.value === role ? 1 : 0.5,
                }}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Language Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Globe size={18} style={{ color: '#10b981' }} />
            <h4>Language &amp; Localization</h4>
          </div>
          <div className="form-group">
            <label>Interface Language</label>
            <select
              className="form-select"
              value={language}
              onChange={e => handleUiLanguage(e.target.value)}
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag ? `${l.flag} ` : ''}{l.nativeName} ({l.name})
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Changes apply immediately across all pages.
            </small>
          </div>
          <div className="form-group">
            <label>Default Document Language</label>
            <select
              className="form-select"
              value={prefs.documentLanguage}
              onChange={e => updatePref('documentLanguage', e.target.value as 'en' | 'hi' | 'gu')}
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag ? `${l.flag} ` : ''}{l.nativeName} ({l.name})
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Used when generating FIR, chargesheet, and other court documents.
            </small>
          </div>
        </div>

        {/* ── Document Defaults Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <FileText size={18} style={{ color: '#f59e0b' }} />
            <h4>Document Defaults</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Paper Size</label>
              <select
                className="form-select"
                value={prefs.paperSize}
                onChange={e => updatePref('paperSize', e.target.value as 'A4' | 'Legal' | 'Letter')}
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Legal">Legal (8.5 × 14 in)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Document Format</label>
              <select
                className="form-select"
                value={prefs.documentFormat}
                onChange={e => updatePref('documentFormat', e.target.value as 'standard' | 'detailed')}
              >
                <option value="standard">Standard</option>
                <option value="detailed">Detailed (with annotations)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Auto-Save Drafts</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={prefs.autoSaveDrafts}
                onChange={e => updatePref('autoSaveDrafts', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {prefs.autoSaveDrafts ? 'Enabled' : 'Disabled'}
              </span>
            </label>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
              Automatically save document drafts while editing.
            </small>
          </div>
        </div>

        {/* ── Notifications Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Bell size={18} style={{ color: '#ef4444' }} />
            <h4>Notifications</h4>
          </div>
          <div className="form-group">
            <label>Desktop Push Notifications</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={pushEnabled}
                disabled={!pushSupported || pushPerm === 'denied'}
                onChange={e => handlePushToggle(e.target.checked)}
              />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {pushEnabled
                  ? 'Enabled'
                  : pushPerm === 'denied'
                    ? 'Blocked by browser'
                    : 'Disabled'}
              </span>
            </label>
            {pushPerm === 'denied' && (
              <small style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
                Notifications are blocked. Reset permission in your browser's site settings to re-enable.
              </small>
            )}
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
              Receive OS-level alerts for case updates, escalations, and approvals. In-app alerts always appear in the Alert Center.
            </small>
          </div>
          <div className="settings-notif-preview">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Notification priority levels:
            </div>
            <div className="settings-notif-levels">
              <span className="badge badge-danger">🔴 Critical — requires immediate action</span>
              <span className="badge badge-warning">🟡 High — action needed soon</span>
              <span className="badge" style={{ background: '#6366f118', color: '#6366f1', border: '1px solid #6366f140' }}>
                🔵 Normal — informational
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Save bar ── */}
      <div className="settings-save-bar">
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Language changes apply instantly. Other preferences require saving.
        </span>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Save Preferences
        </button>
      </div>
    </div>
  );
}
