/* ============================================
   CRIMEGPT 2.0 — MODEL LAYER INDEX
   ============================================
   Re-exports all model public APIs.
   Store (store/index.ts) delegates to these.
   ============================================ */

export {
  type HydrationError,
  type FieldValidator,
  logHydrationSkip,
  getHydrationErrors,
  validateRecord,
  validateBatch,
  SCHEMAS,
  SETTINGS_ALLOWLIST,
} from './validation';

export {
  type SystemSettings,
  type UserPreferences,
  hydrateSettings,
  getSettings,
  updateSettingsRaw,
  subscribeSettings,
  getUserPrefsForUser,
  updateUserPrefsForUser,
  subscribeUserPreferences,
} from './settingsModel';

export {
  hydrateLegalSections,
  getLegalSections,
  hydrateJudgments,
  getJudgments,
  simulateLegalAnalysis,
} from './legalModel';
