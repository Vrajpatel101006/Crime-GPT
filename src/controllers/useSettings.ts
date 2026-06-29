/* ============================================
   CRIMEGPT 2.0 — SETTINGS CONTROLLER
   ============================================
   Business logic hook for system settings and
   user preferences. Mediates between the
   settingsModel and React views.
   ============================================ */

import { useState, useEffect, useCallback } from 'react';
import {
  type SystemSettings,
  type UserPreferences,
  getSettings,
  updateSettingsRaw,
  subscribeSettings,
  getUserPrefsForUser,
  updateUserPrefsForUser,
  subscribeUserPreferences,
} from '../models/settingsModel';
import { getCurrentUserId } from '../store';
import { showToast } from '../store';

/* ─── System settings hook (admin use) ─── */
export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(getSettings());

  useEffect(() => {
    return subscribeSettings(() => setSettings(getSettings()));
  }, []);

  const updateSetting = useCallback(<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(() => {
    updateSettingsRaw(settings);
    // Audit log is added by store's updateSettings wrapper
    showToast('System settings saved — changes apply to all users immediately.', 'success');
  }, [settings]);

  return { settings, updateSetting, saveSettings };
}

/* ─── User preferences hook ─── */
export function useUserPreferences() {
  const userId = getCurrentUserId();
  const [prefs, setPrefs] = useState<UserPreferences>(getUserPrefsForUser(userId));

  useEffect(() => {
    return subscribeUserPreferences(() => setPrefs(getUserPrefsForUser(userId)));
  }, [userId]);

  const updatePref = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }, []);

  const savePrefs = useCallback(() => {
    updateUserPrefsForUser(userId, prefs);
    showToast('Preferences saved — changes apply immediately.', 'success');
  }, [userId, prefs]);

  return { prefs, updatePref, savePrefs };
}
