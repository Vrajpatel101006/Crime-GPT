/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
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

  /* ── Digital Stamp Upload ── */
  const [newStampFile, setNewStampFile] = useState<File | null>(null);
  const [newStampName, setNewStampName] = useState('');
  const [newStampHasDate, setNewStampHasDate] = useState(false);
  const [newStampDataUrl, setNewStampDataUrl] = useState<string | null>(null);

  const [dateX, setDateX] = useState(50);
  const [dateY, setDateY] = useState(50);
  const [fontSize, setFontSize] = useState(10);
  const [fontFamily, setFontFamily] = useState('monospace');
  
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handlePointerMove(e);
  };
  const handlePointerUp = () => setIsDragging(false);
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && e.type !== 'pointerdown') return;
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDateX(Math.round(x));
    setDateY(Math.round(y));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setNewStampFile(file || null);
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setNewStampDataUrl(event.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setNewStampDataUrl(null);
    }
  };

  const handleAddStamp = useCallback(() => {
    if (!newStampDataUrl || !newStampName.trim()) return;
    const newStamp = {
      id: Math.random().toString(36).substr(2, 9),
      name: newStampName,
      url: newStampDataUrl,
      hasDate: newStampHasDate,
      dateConfig: newStampHasDate ? {
        x: dateX, y: dateY, fontSize, fontFamily
      } : undefined
    };
    updatePref('stamps', [...(prefs.stamps || []), newStamp]);
    setNewStampFile(null);
    setNewStampDataUrl(null);
    setNewStampName('');
    setNewStampHasDate(false);
    setDateX(50);
    setDateY(50);
    setFontSize(10);
    setFontFamily('monospace');
    showToast('Stamp added successfully (Click Save to apply)', 'success');
  }, [newStampDataUrl, newStampName, newStampHasDate, dateX, dateY, fontSize, fontFamily, prefs.stamps, updatePref]);

  const removeStamp = (id: string) => {
    updatePref('stamps', (prefs.stamps || []).filter(s => s.id !== id));
  };

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

        {/* ── Digital Stamps Card ── */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <FileText size={18} style={{ color: '#8b5cf6' }} />
            <h4>Digital Stamp Configuration</h4>
          </div>
          <p className="text-muted" style={{ fontSize: '0.82rem', margin: '0 0 12px' }}>
            Upload multiple stamps (e.g. Station Round Seal, Signature). These can be applied dynamically to documents.
          </p>
          
          <div style={{ background: 'var(--surface-1)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
            <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Add New Stamp</h5>
            <div style={{ display: 'grid', gap: 12 }}>
              <input 
                type="text" 
                placeholder="Stamp Name (e.g. Round Seal)" 
                value={newStampName}
                onChange={e => setNewStampName(e.target.value)}
                className="form-input"
              />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="form-input"
              />
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={newStampHasDate}
                  onChange={e => setNewStampHasDate(e.target.checked)}
                />
                <span className="toggle-slider" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Auto-overlay current date on this stamp
                </span>
              </label>

              {newStampHasDate && newStampDataUrl && (
                <div style={{ marginTop: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsConfigModalOpen(true)}>
                    Configure Date Placement
                  </button>
                </div>
              )}

              <button 
                className="btn btn-primary btn-sm" 
                disabled={!newStampDataUrl || !newStampName.trim()} 
                onClick={handleAddStamp}
              >
                Add Stamp
              </button>
            </div>
          </div>

          {(prefs.stamps || []).length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>Your Stamps</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {(prefs.stamps || []).map(stamp => (
                  <div key={stamp.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>{stamp.name}</div>
                    
                    <div style={{ position: 'relative', display: 'inline-block', padding: 8, background: '#f8fafc', borderRadius: 4, marginBottom: 8 }}>
                      <img src={stamp.url} style={{ maxHeight: 60, maxWidth: '100%', opacity: 0.8, mixBlendMode: 'multiply' }} alt={stamp.name} />
                      {stamp.hasDate && (
                        <div style={{ position: 'absolute', top: stamp.dateConfig ? `${stamp.dateConfig.y}%` : '50%', left: stamp.dateConfig ? `${stamp.dateConfig.x}%` : '50%', transform: 'translate(-50%, -50%)', color: '#000', fontWeight: 'bold', fontFamily: stamp.dateConfig?.fontFamily || 'monospace', fontSize: stamp.dateConfig ? `${stamp.dateConfig.fontSize}px` : '10px', opacity: 0.8, mixBlendMode: 'multiply', whiteSpace: 'nowrap' }}>
                          {new Date().toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </div>

                    <div>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeStamp(stamp.id)} style={{ color: 'var(--brand-danger)', width: '100%' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* ── Date Config Modal ── */}
      {isConfigModalOpen && newStampDataUrl && (
        <div className="modal-overlay" onPointerUp={handlePointerUp} onPointerMove={handlePointerMove}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '90vw' }}>
            <div className="modal-header">
              <h3>Configure Date Placement</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsConfigModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                  Drag the date directly on the image to position it perfectly within your stamp.
                </p>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Font Size ({fontSize}px)</label>
                  <input type="range" min="6" max="36" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Font Style</label>
                  <select className="form-select" value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={{ padding: '8px', fontSize: '0.9rem' }}>
                    <option value="monospace">Monospace</option>
                    <option value="sans-serif">Sans-Serif</option>
                    <option value="serif">Serif</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                    <option value="'Georgia', serif">Georgia</option>
                    <option value="'Arial', Helvetica, sans-serif">Arial</option>
                    <option value="'Verdana', Geneva, sans-serif">Verdana</option>
                    <option value="'Brush Script MT', cursive">Handwritten (Brush Script)</option>
                    <option value="'Comic Sans MS', cursive, sans-serif">Handwritten (Comic Sans)</option>
                  </select>
                </div>
                <div style={{ marginTop: 'auto', background: 'var(--surface-1)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Position:</div>
                  <div style={{ fontWeight: 600 }}>X: {dateX}% &nbsp;|&nbsp; Y: {dateY}%</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '16px', minHeight: '300px', overflow: 'hidden' }}>
                <div 
                  ref={previewRef}
                  onPointerDown={handlePointerDown}
                  style={{ position: 'relative', display: 'inline-block', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', touchAction: 'none' }}
                >
                  <img src={newStampDataUrl} style={{ maxHeight: '400px', maxWidth: '100%', opacity: 0.8, mixBlendMode: 'multiply', pointerEvents: 'none' }} alt="Preview" draggable={false} />
                  <div style={{ position: 'absolute', top: `${dateY}%`, left: `${dateX}%`, transform: 'translate(-50%, -50%)', color: '#000', fontWeight: 'bold', fontFamily: fontFamily, fontSize: `${fontSize}px`, opacity: 0.8, mixBlendMode: 'multiply', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {new Date().toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setIsConfigModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
