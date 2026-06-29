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

  const { t, language, changeLanguage, languages } = useTranslation();
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
        `${t('settings.switchingTo')} ${newRole.toUpperCase()} ${t('settings.role')} — ${t('settings.loginWithCredentials')}`,
        'info',
      );
      requestRoleSwitch(newRole);
    }
  }, [role]);

  /* ── Language change (immediate) ── */
  const handleUiLanguage = useCallback(async (code: string) => {
    const lang = code as 'en' | 'hi' | 'gu';
    await changeLanguage(lang);
    // changeLanguage now saves to Firebase automatically
    showToast(t('settings.languageChangedSuccess'), 'success');
  }, [changeLanguage]);

  /* ── Push notification toggle ── */
  const handlePushToggle = useCallback(async (checked: boolean) => {
    if (checked) {
      const granted = await requestPushPermission();
      setPushEnabled(granted);
      if (granted) {
        updateUserPreferences({ desktopNotifications: true });
        showToast(t('settings.desktopNotificationsEnabled'), 'success');
      } else {
        showToast(t('settings.notificationPermissionDenied'), 'warning');
      }
    } else {
      setPushEnabled(false);
      updateUserPreferences({ desktopNotifications: false });
      showToast(t('settings.desktopNotificationsDisabled'), 'info');
    }
  }, []);

  /* ── Update preference helper ── */
  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  /* ── Document language change (immediate save) ── */
  const handleDocumentLanguage = useCallback((code: string) => {
    const lang = code as 'en' | 'hi' | 'gu';
    updatePref('documentLanguage', lang);
    // Auto-save immediately (no need to click Save button)
    updateUserPreferences({ documentLanguage: lang });
    showToast(t('settings.languageChangedSuccess'), 'success');
  }, [updatePref]);

  /* ── Save other preferences ── */
  const handleSave = useCallback(() => {
    updateUserPreferences(prefs);
    showToast(t('settings.preferencesSaved'), 'success');
  }, [prefs]);


  const pushPerm = pushSupported ? getNotificationPermission() : 'denied';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p className="text-muted">{t('settings.manageProfile')}</p>
        </div>
      </div>

      <div className="settings-grid">

        {/* ── Profile Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <User size={18} style={{ color: ROLE_COLORS[role] }} />
            <h4>{t('settings.profile')}</h4>
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
            <h4>{t('settings.activeRole')}</h4>
          </div>
          <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>
            {t('settings.switchRolesDescription')}
          </p>
          <div className="form-group">
            <label>{t('settings.currentRole')}</label>
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
            <h4>{t('settings.languageLocalization')}</h4>
          </div>
          <div className="form-group">
            <label>{t('settings.interfaceLanguage')}</label>
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
              {t('settings.languageChangesApplyInstantly')}
            </small>
          </div>
          <div className="form-group">
            <label>{t('settings.defaultDocumentLanguage')}</label>
            <select
              className="form-select"
              value={prefs.documentLanguage}
              onChange={e => handleDocumentLanguage(e.target.value)}
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>
                  {l.flag ? `${l.flag} ` : ''}{l.nativeName} ({l.name})
                </option>
              ))}
            </select>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              {t('settings.documentLanguageDescription')}
            </small>
          </div>
        </div>

        {/* ── Document Defaults Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <FileText size={18} style={{ color: '#f59e0b' }} />
            <h4>{t('settings.documentDefaults')}</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>{t('settings.paperSize')}</label>
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
              <label>{t('settings.documentFormat')}</label>
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
            <label>{t('settings.autoSaveDrafts')}</label>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={prefs.autoSaveDrafts}
                onChange={e => updatePref('autoSaveDrafts', e.target.checked)}
              />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {prefs.autoSaveDrafts ? t('settings.enabled') : t('settings.disabled')}
              </span>
            </label>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
              {t('settings.autoSaveDraftsDescription')}
            </small>
          </div>
        </div>

        {/* ── Notifications Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Bell size={18} style={{ color: '#ef4444' }} />
            <h4>{t('settings.notifications')}</h4>
          </div>
          <div className="form-group">
            <label>{t('settings.desktopPushNotifications')}</label>
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
                  ? t('settings.enabled')
                  : pushPerm === 'denied'
                    ? t('settings.blockedByBrowser')
                    : t('settings.disabled')}
              </span>
            </label>
            {pushPerm === 'denied' && (
              <small style={{ color: 'var(--brand-danger)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
                {t('settings.notificationsBlockedMessage')}
              </small>
            )}
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: 4 }}>
              {t('settings.notificationsDescription')}
            </small>
          </div>
          <div className="settings-notif-preview">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('settings.notificationPriorityLevels')}
            </div>
            <div className="settings-notif-levels">
              <span className="badge badge-danger">{t('settings.criticalPriority')}</span>
              <span className="badge badge-warning">{t('settings.highPriority')}</span>
              <span className="badge" style={{ background: '#6366f118', color: '#6366f1', border: '1px solid #6366f140' }}>
                {t('settings.normalPriority')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Save bar ── */}
      <div className="settings-save-bar">
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {t('settings.saveBarDescription')}
        </span>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> {t('settings.savePreferences')}
        </button>
      </div>
    </div>
  );
}
