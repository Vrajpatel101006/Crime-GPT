/* ============================================
   CRIMEGPT 2.0 — TRANSLATION BUNDLE INDEX
   ============================================
   Exports all language bundles and provides
   utility functions for language management.
   Works 100% offline via IndexedDB cache.
   ============================================ */

import { EN_TRANSLATIONS } from './en';
import { HI_TRANSLATIONS } from './hi';
import { GU_TRANSLATIONS } from './gu';

export type SupportedLanguage = 'en' | 'hi' | 'gu';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  locale: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-IN', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', locale: 'hi-IN', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', locale: 'gu-IN', flag: '🇮🇳' },
];

/**
 * Get translation bundle for a specific language.
 * Falls back to English if language not found.
 */
export function getTranslationBundle(language: SupportedLanguage): Record<string, string> {
  switch (language) {
    case 'hi':
      return HI_TRANSLATIONS;
    case 'gu':
      return GU_TRANSLATIONS;
    case 'en':
    default:
      return EN_TRANSLATIONS;
  }
}

/**
 * Get language info by language code
 */
export function getLanguageInfo(code: SupportedLanguage): LanguageInfo | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

/**
 * Get the browser's preferred language
 * Returns 'en' if no supported language is detected
 */
export function getBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return 'en';
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (!browserLang) return 'en';

  // Extract language code (e.g., 'en-US' → 'en')
  const langCode = browserLang.split('-')[0].toLowerCase();
  
  if (isSupportedLanguage(langCode)) {
    return langCode;
  }
  
  return 'en';
}

// Re-export translation bundles
export { EN_TRANSLATIONS, HI_TRANSLATIONS, GU_TRANSLATIONS };
