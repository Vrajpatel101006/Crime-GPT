/* ============================================
   CRIMEGPT 2.0 — SHARED VALIDATION UTILITIES
   ============================================
   Runtime data validation helpers used by all
   model files. Extracted from store to break
   circular dependency chains.
   ============================================ */

/* ─── Types ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HydrationError = { entity: string; id: string; reason: string; timestamp: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FieldValidator = { required: string[]; defaults: Record<string, any> };

/* ─── Error accumulator ─── */
const _hydrationErrors: HydrationError[] = [];

export function logHydrationSkip(entity: string, id: string, reason: string): void {
  const entry: HydrationError = { entity, id: id || '<unknown>', reason, timestamp: new Date().toISOString() };
  _hydrationErrors.push(entry);
  console.warn(`[CrimeGPT] Skipped invalid ${entity} record (${entry.id}): ${reason}`);
}

export function getHydrationErrors(): HydrationError[] { return [..._hydrationErrors]; }

/* ─── Record validators ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateRecord(entity: string, raw: any, schema: FieldValidator): any | null {
  if (!raw || typeof raw !== 'object') {
    logHydrationSkip(entity, '<non-object>', 'Record is null or not an object');
    return null;
  }
  for (const field of schema.required) {
    if (raw[field] === undefined || raw[field] === null) {
      logHydrationSkip(entity, String(raw.id ?? ''), `Missing required field: ${field}`);
      return null;
    }
  }
  const out = { ...raw };
  for (const [key, fallback] of Object.entries(schema.defaults)) {
    if (out[key] === undefined || out[key] === null) {
      out[key] = Array.isArray(fallback) ? [...fallback] : (typeof fallback === 'object' ? { ...fallback } : fallback);
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateBatch(entity: string, data: Record<string, any>, schema: FieldValidator): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valid: any[] = [];
  for (const raw of Object.values(data)) {
    const v = validateRecord(entity, raw, schema);
    if (v !== null) valid.push(v);
  }
  return valid;
}

/* ─── Entity schemas ─── */
export const SCHEMAS: Record<string, FieldValidator> = {
  user:            { required: ['id'], defaults: { role: 'io', badge: '', station: '', email: '', name: '', rank: undefined, clearanceLevel: undefined } },
  legalSection:    { required: ['id', 'act', 'sectionNumber'], defaults: { title: '', description: '', keywords: [], crimeTypes: [], evidence_required: [], relatedSections: [], punishment: '', legacyReference: '' } },
  judgment:        { required: ['id', 'title'], defaults: { court: '', year: 0, summary: '', relevantSections: [], citation: '' } },
  case:            { required: ['id', 'firNumber', 'status'], defaults: { caseNumber: '', policeStation: '', assignedOfficer: '', assignedStation: '', classification: 'confidential', clearanceRequired: 1, crimeType: '', createdAt: '', updatedAt: '', victim: {}, accused: {}, incident: {}, evidenceIds: [], legalSectionIds: [], documentIds: [], diaryEntries: [], readinessScore: 0, reviewStatus: 'pending_io', reviewComments: [] } },
  evidence:        { required: ['id', 'caseId', 'fileName'], defaults: { fileType: '', fileSize: 0, uploadedAt: '', uploadedBy: '', sha256Hash: '', tags: [], mimeType: '', filePath: '', fileData: undefined, extractedEntities: [], chainOfCustody: [] } },
  document:        { required: ['id', 'caseId', 'type', 'title'], defaults: { content: '', generatedAt: '', generatedBy: '', status: 'draft', validationErrors: [], version: 1 } },
  auditLog:        { required: ['id', 'action', 'timestamp'], defaults: { userId: 'system', userName: 'System', userRole: 'io', target: '', details: '' } },
};

/* ─── Settings allowlist ─── */
export const SETTINGS_ALLOWLIST: ReadonlySet<string> = new Set([
  'autoSaveInterval', 'sessionTimeout', 'maxFileSize',
  'encryptionEnabled', 'offlineMode', 'autoBackup',
  'emailNotifications', 'smsAlerts', 'darkMode',
  'language', 'policeStation', 'district', 'state', 'firPrefix',
]);
