/* ============================================
   CRIMEGPT 2.0 — useTranslation HOOK
   ============================================
   React hook for accessing translations and
   changing UI language. Works 100% offline.
   Persists language preference to localStorage
   (and IndexedDB when available).
   ============================================ */

import { useState, useEffect, useCallback } from 'react';
import {
  getTranslationBundle,
  getBrowserLanguage,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../i18n';
import { getUserPreferences, getCurrentUserId, updateUserPreferences } from '../store';

const LANGUAGE_STORAGE_KEY = 'crimegpt_language';

/**
 * Get stored language preference or detect from browser.
 * Priority: user preference > localStorage > browser language > English
 */
function getStoredLanguage(): SupportedLanguage {
  // 1. User preference (per-user, set in Settings page)
  try {
    const prefs = getUserPreferences();
    if (prefs.uiLanguage && isSupportedLanguage(prefs.uiLanguage)) {
      return prefs.uiLanguage;
    }
  } catch {
    // store may not be initialized yet
  }
  // 2. localStorage fallback
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be blocked
  }
  // 3. Browser detection
  return getBrowserLanguage();
}

/**
 * Store language preference
 */
function storeLanguage(language: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // localStorage might be blocked
  }
}

// Global language state (shared across all hook instances)
let currentLanguage: SupportedLanguage = getStoredLanguage();
let listeners: Array<(lang: SupportedLanguage) => void> = [];

function notifyListeners() {
  listeners.forEach(listener => listener(currentLanguage));
}

/**
 * React hook for accessing translations
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, language, changeLanguage, languages } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h1>{t('dashboard.title')}</h1>
 *       <select value={language} onChange={e => changeLanguage(e.target.value as SupportedLanguage)}>
 *         {languages.map(lang => (
 *           <option key={lang.code} value={lang.code}>{lang.nativeName}</option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage);

  useEffect(() => {
    const listener = (newLang: SupportedLanguage) => {
      setLanguage(newLang);
    };
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  /**
   * Translation function
   * 
   * @param key - Translation key (e.g., 'dashboard.title')
   * @param params - Optional parameters to replace in translation (e.g., {name: 'John'})
   * @returns Translated string
   */
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const bundle = getTranslationBundle(language);
    let translation = bundle[key] || key;

    // Replace parameters: "Hello {name}" → "Hello John"
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return translation;
  }, [language]);

  /**
   * Change the current language
   * Works offline — no API calls required
   * Saves to both localStorage and Firebase user preferences
   */
  const changeLanguage = useCallback(async (newLanguage: SupportedLanguage) => {
    if (!isSupportedLanguage(newLanguage)) {
      console.warn(`[useTranslation] Unsupported language: ${newLanguage}`);
      return;
    }

    if (newLanguage === currentLanguage) return;

    currentLanguage = newLanguage;
    storeLanguage(newLanguage);
    
    // Save to Firebase user preferences (per-user, persistent across devices)
    try {
      const userId = getCurrentUserId();
      if (userId) {
        updateUserPreferences({ uiLanguage: newLanguage }, userId);
      }
    } catch (err) {
      console.warn('[useTranslation] Failed to save language to Firebase:', err);
    }
    
    notifyListeners();
    setLanguage(newLanguage);
  }, []);

  /**
   * Check if a language is the current active language
   */
  const isActiveLanguage = useCallback((langCode: string) => {
    return langCode === language;
  }, [language]);

  return {
    t,
    language,
    changeLanguage,
    isActiveLanguage,
    languages: SUPPORTED_LANGUAGES,
    currentLanguageInfo: SUPPORTED_LANGUAGES.find(l => l.code === language),
  };
}

/**
 * Re-initialize language from user preferences (call after login)
 */
export function reinitializeLanguage(): void {
  try {
    const prefs = getUserPreferences();
    if (prefs.uiLanguage && isSupportedLanguage(prefs.uiLanguage)) {
      if (prefs.uiLanguage !== currentLanguage) {
        currentLanguage = prefs.uiLanguage;
        storeLanguage(currentLanguage);
        notifyListeners();
        console.log(`[useTranslation] Language re-initialized to: ${currentLanguage}`);
      }
    }
  } catch (err) {
    console.warn('[useTranslation] Failed to reinitialize language:', err);
  }
}

/**
 * Get current language (for use outside React components)
 */
export function getCurrentLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Set current language (for use outside React components)
 */
export function setCurrentLanguage(language: SupportedLanguage): void {
  if (!isSupportedLanguage(language)) return;
  currentLanguage = language;
  storeLanguage(language);
  notifyListeners();
}

/**
 * Translate a key (for use outside React components)
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  const bundle = getTranslationBundle(currentLanguage);
  let translation = bundle[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
    });
  }

  return translation;
}
