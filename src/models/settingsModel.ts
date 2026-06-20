/* ============================================
   CRIMEGPT 2.0 — SETTINGS MODEL
   ============================================
   System-wide settings + per-user preferences.
   Pure state operations — no cross-model imports.
   ============================================ */

import * as db from '../services/db';
import { SETTINGS_ALLOWLIST, logHydrationSkip } from './validation';

/* ════════════════════════════════════════════
   SYSTEM SETTINGS
   ════════════════════════════════════════════ */
export interface SystemSettings {
  autoSaveInterval: number;
  sessionTimeout: number;
  maxFileSize: number;
  encryptionEnabled: boolean;
  offlineMode: boolean;
  autoBackup: boolean;
  emailNotifications: boolean;
  smsAlerts: boolean;
  darkMode: boolean;
  language: string;
  policeStation: string;
  district: string;
  state: string;
  firPrefix: string;
}

let _settings: SystemSettings = {
  autoSaveInterval: 5, sessionTimeout: 30, maxFileSize: 100,
  encryptionEnabled: true, offlineMode: true, autoBackup: true,
  emailNotifications: true, smsAlerts: false, darkMode: false,
  language: 'English', policeStation: 'Cybercrime PS, Ahmedabad',
  district: 'Ahmedabad', state: 'Gujarat', firPrefix: 'FIR/CC/AHD',
};
let _settingsListeners: Array<() => void> = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hydrateSettings(data: any): void {
  if (!data || typeof data !== 'object') return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (SETTINGS_ALLOWLIST.has(key)) { safe[key] = val; }
    else { logHydrationSkip('settings', key, `Rejected unknown setting key: ${key}`); }
  }
  _settings = { ..._settings, ...safe };
  _settingsListeners.forEach(l => l());
}

export function getSettings(): SystemSettings { return { ..._settings }; }

export function updateSettingsRaw(updates: Partial<SystemSettings>): void {
  _settings = { ..._settings, ...updates };
  db.updateSettings(updates);
  _settingsListeners.forEach(l => l());
}

export function subscribeSettings(listener: () => void): () => void {
  _settingsListeners.push(listener);
  return () => { _settingsListeners = _settingsListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   USER PREFERENCES (per-user)
   ════════════════════════════════════════════ */
export interface UserPreferences {
  uiLanguage: 'en' | 'hi' | 'gu';
  documentLanguage: 'en' | 'hi' | 'gu';
  paperSize: 'A4' | 'Legal' | 'Letter';
  documentFormat: 'standard' | 'detailed';
  desktopNotifications: boolean;
  autoSaveDrafts: boolean;
}

const DEFAULT_USER_PREFS: UserPreferences = {
  uiLanguage: 'en', documentLanguage: 'en',
  paperSize: 'A4', documentFormat: 'standard',
  desktopNotifications: true, autoSaveDrafts: true,
};

let _userPreferences: Record<string, UserPreferences> = {};
let _userPrefsListeners: Array<() => void> = [];

export function getUserPrefsForUser(userId: string): UserPreferences {
  return { ...DEFAULT_USER_PREFS, ..._userPreferences[userId] };
}

export function updateUserPrefsForUser(userId: string, updates: Partial<UserPreferences>): void {
  _userPreferences[userId] = { ...getUserPrefsForUser(userId), ...updates };
  db.updateUserPreferences(userId, updates);
  _userPrefsListeners.forEach(l => l());
}

export function subscribeUserPreferences(listener: () => void): () => void {
  _userPrefsListeners.push(listener);
  return () => { _userPrefsListeners = _userPrefsListeners.filter(l => l !== listener); };
}
