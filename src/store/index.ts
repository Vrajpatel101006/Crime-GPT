/* ============================================
   CRIMEGPT 2.0 — FIREBASE-BACKED STORE
   ============================================
   All data persists to Firebase Realtime DB.
   Local state = fast cache, Firebase = source of truth.
   Real-time listeners sync across devices.
   ============================================ */

import { type User, type CaseRecord, type Evidence, type LegalSection, type Judgment, type AuditLog, type Notification, type Toast, type LegalSuggestion, type GeneratedDocument, type UserRole, type DiaryEntry } from '../types';
import { firebaseLogin, firebaseLogout, firebaseCreateUser, ensureDemoAuthUsers, verifyDemoCredentials, getEmailFromRole } from '../services/auth';
import * as db from '../services/db';
import {
  SEED_LEGAL_SECTIONS, SEED_JUDGMENTS, SEED_USERS, SEED_ROLES,
  SEED_SETTINGS, SEED_CASES, SEED_EVIDENCE, SEED_DOCUMENTS,
  SEED_DIARY_ENTRIES, SEED_AUDIT_LOGS, SEED_NOTIFICATIONS,
} from '../data/seed';

export type { Toast } from '../types';

/* ─── INITIALIZATION STATE ─── */
let _isInitialized = false;
let _initListeners: Array<() => void> = [];

export function getIsInitialized(): boolean { return _isInitialized; }
export function subscribeInitialized(listener: () => void): () => void {
  _initListeners.push(listener);
  return () => { _initListeners = _initListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   MAIN INIT — Called once from App.tsx
   ════════════════════════════════════════════ */
function hydrateFromLocalSeed(): void {
  hydrateUsers(Object.fromEntries(SEED_USERS.map(u => [u.id, u])));
  hydrateUserStates();
  hydrateRoles(SEED_ROLES);
  hydrateLegalSections(Object.fromEntries(SEED_LEGAL_SECTIONS.map(s => [s.id, s])));
  hydrateJudgments(Object.fromEntries(SEED_JUDGMENTS.map(j => [j.id, j])));
  const casesWithDiary = SEED_CASES.map(c => ({
    ...c,
    diaryEntries: SEED_DIARY_ENTRIES[c.id] || [],
  }));
  hydrateCases(Object.fromEntries(casesWithDiary.map(c => [c.id, c])));
  hydrateEvidence(Object.fromEntries(SEED_EVIDENCE.map(e => [e.id, e])));
  hydrateDocuments(Object.fromEntries(SEED_DOCUMENTS.map(d => [d.id, d])));
  hydrateAuditLogs(Object.fromEntries(SEED_AUDIT_LOGS.map(l => [l.id, l])));
  hydrateSettings(SEED_SETTINGS);
  _notifications = [...SEED_NOTIFICATIONS];
}

export async function initializeStore(): Promise<void> {
  try {
    await ensureDemoAuthUsers();

    const seeded = await db.isSeeded();
    if (!seeded) {
      console.log('[CrimeGPT] First load — seeding Firebase...');
      await db.seedAll({
        users: SEED_USERS,
        roles: SEED_ROLES,
        legalSections: SEED_LEGAL_SECTIONS,
        judgments: SEED_JUDGMENTS,
        cases: SEED_CASES,
        evidence: SEED_EVIDENCE,
        documents: SEED_DOCUMENTS,
        diaryEntries: SEED_DIARY_ENTRIES,
        auditLogs: SEED_AUDIT_LOGS,
        notifications: SEED_NOTIFICATIONS,
        settings: SEED_SETTINGS,
      });
      console.log('[CrimeGPT] Seed complete.');
    }

    const [users, roles, legalSections, judgments, cases, evidence, documents, auditLogs, settings] = await Promise.all([
      db.getAllUsers(),
      db.getRoles(),
      db.getAllLegalSections(),
      db.getAllJudgments(),
      db.getAllCases(),
      db.getAllEvidence(),
      db.getAllDocuments(),
      db.getAllAuditLogs(),
      db.getSettings(),
    ]);

    hydrateUsers(users);
    hydrateUserStates();
    hydrateRoles(roles);
    hydrateLegalSections(legalSections);
    hydrateJudgments(judgments);
    hydrateCases(cases);
    hydrateEvidence(evidence);
    hydrateDocuments(documents);
    hydrateAuditLogs(auditLogs);
    hydrateSettings(settings);

    if (Object.keys(users).length === 0) {
      console.warn('[CrimeGPT] Firebase returned empty data — using local seed.');
      hydrateFromLocalSeed();
    }

    setupRealtimeListeners();
  } catch (err) {
    console.warn('[CrimeGPT] Firebase init failed — using local seed data.', err);
    hydrateFromLocalSeed();
  }

  _isInitialized = true;
  _initListeners.forEach(l => l());
}

/* ════════════════════════════════════════════
   REAL-TIME LISTENERS (Firebase → local cache)
   ════════════════════════════════════════════ */
let _unsubscribers: Array<() => void> = [];

function setupRealtimeListeners(): void {
  _unsubscribers.push(
    db.onDataChange('/users', (data) => { if (data) hydrateUsers(data); }),
    db.onDataChange('/roles', (data) => { if (data) hydrateRoles(data); }),
    db.onDataChange('/cases', (data) => { if (data) hydrateCases(data); }),
    db.onDataChange('/evidence', (data) => { if (data) hydrateEvidence(data); }),
    db.onDataChange('/documents', (data) => { if (data) hydrateDocuments(data); }),
    db.onDataChange('/auditLogs', (data) => { if (data) hydrateAuditLogs(data); }),
    db.onDataChange('/settings', (data) => { if (data) hydrateSettings(data); }),
    db.onDataChange('/legalSections', (data) => { if (data) hydrateLegalSections(data); }),
    db.onDataChange('/judgments', (data) => { if (data) hydrateJudgments(data); }),
  );
}

export function teardownRealtimeListeners(): void {
  _unsubscribers.forEach(u => u());
  _unsubscribers = [];
}

/* ════════════════════════════════════════════
   USERS (local cache)
   ════════════════════════════════════════════ */
let USERS: Record<string, User> = {};

function hydrateUsers(data: Record<string, any>): void {
  USERS = {};
  for (const [id, u] of Object.entries(data)) {
    USERS[id] = {
      id,
      name: u.fullName || u.name,
      role: u.role,
      badge: u.badgeNumber || u.badge,
      station: u.stationName || u.station,
      email: u.email,
    };
  }
}

export function getUserById(id: string): User | undefined {
  return USERS[id];
}

export function getAllUsers(): Record<string, User> {
  return { ...USERS };
}

/* ════════════════════════════════════════════
   USER STATES (lastLogin, suspension)
   ════════════════════════════════════════════ */
interface UserState {
  lastLogin: string | null;
  suspendedUntil: string | null;
  suspensionReason: string;
  active: boolean;
}

let _userStates: Record<string, UserState> = {};

function hydrateUserStates(): void {
  _userStates = {};
  for (const id of Object.keys(USERS)) {
    _userStates[id] = {
      lastLogin: null,
      suspendedUntil: null,
      suspensionReason: '',
      active: true,
    };
  }
  // Load from Firebase user states node
  db.onDataChange('/userStates', (data: any) => {
    if (!data) return;
    for (const [id, s] of Object.entries(data as Record<string, any>)) {
      _userStates[id] = {
        lastLogin: s.lastLogin || null,
        suspendedUntil: s.suspendedUntil || null,
        suspensionReason: s.suspensionReason || '',
        active: s.active !== false,
      };
    }
    _userStateListeners.forEach(l => l());
  });
}

let _userStateListeners: Array<() => void> = [];

export function getUserState(userId: string): UserState {
  return _userStates[userId] || { lastLogin: null, suspendedUntil: null, suspensionReason: '', active: true };
}

export function getAllUserStates(): Record<string, UserState> {
  return { ..._userStates };
}

export function suspendUser(userId: string, until: string, reason: string): void {
  if (!_userStates[userId]) _userStates[userId] = { lastLogin: null, suspendedUntil: null, suspensionReason: '', active: true };
  _userStates[userId].suspendedUntil = until;
  _userStates[userId].suspensionReason = reason;
  _userStates[userId].active = false;
  db.update(`/userStates/${userId}`, { suspendedUntil: until, suspensionReason: reason, active: false });
  addAuditLog('SUSPEND_USER', userId, `Suspended ${USERS[userId]?.name || userId} until ${new Date(until).toLocaleDateString('en-IN')} — ${reason}`, 'admin1');
  _userStateListeners.forEach(l => l());
}

export function unsuspendUser(userId: string): void {
  if (_userStates[userId]) {
    _userStates[userId].suspendedUntil = null;
    _userStates[userId].suspensionReason = '';
    _userStates[userId].active = true;
    db.update(`/userStates/${userId}`, { suspendedUntil: null, suspensionReason: '', active: true });
    addAuditLog('UNSUSPEND_USER', userId, `Suspension lifted for ${USERS[userId]?.name || userId}`, 'admin1');
    _userStateListeners.forEach(l => l());
  }
}

export function toggleUserActive(userId: string): void {
  if (!_userStates[userId]) return;
  _userStates[userId].active = !_userStates[userId].active;
  db.update(`/userStates/${userId}`, { active: _userStates[userId].active });
  _userStateListeners.forEach(l => l());
}

export function subscribeUserState(listener: () => void): () => void {
  _userStateListeners.push(listener);
  return () => { _userStateListeners = _userStateListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   ROLES & PERMISSIONS
   ════════════════════════════════════════════ */
export type PermKey =
  | 'create_case' | 'edit_case' | 'delete_case'
  | 'upload_evidence' | 'delete_evidence'
  | 'generate_doc' | 'approve_case' | 'assign_officer'
  | 'view_audit' | 'manage_users' | 'export_data' | 'legal_review';

let _permissions: Record<UserRole, Record<PermKey, boolean>> = {
  io:    { create_case: true, edit_case: true, delete_case: false, upload_evidence: true, delete_evidence: false, generate_doc: true, approve_case: false, assign_officer: false, view_audit: true, manage_users: false, export_data: true, legal_review: false },
  sho:   { create_case: true, edit_case: true, delete_case: true,  upload_evidence: true, delete_evidence: true,  generate_doc: true, approve_case: true,  assign_officer: true,  view_audit: true, manage_users: false, export_data: true, legal_review: false },
  legal: { create_case: false, edit_case: false, delete_case: false, upload_evidence: false, delete_evidence: false, generate_doc: true, approve_case: true, assign_officer: false, view_audit: true, manage_users: false, export_data: true, legal_review: true },
  admin: { create_case: true, edit_case: true, delete_case: true,  upload_evidence: true, delete_evidence: true,  generate_doc: true, approve_case: true,  assign_officer: true,  view_audit: true, manage_users: true, export_data: true, legal_review: true },
};
let _permListeners: Array<() => void> = [];

function hydrateRoles(data: any): void {
  if (!data) return;
  for (const [role, roleData] of Object.entries(data as Record<string, any>)) {
    if (roleData.permissions) {
      _permissions[role as UserRole] = roleData.permissions;
    }
  }
  _permListeners.forEach(l => l());
}

export function getPermissions(): Record<UserRole, Record<PermKey, boolean>> {
  return JSON.parse(JSON.stringify(_permissions));
}

export function hasPermission(role: UserRole, perm: PermKey): boolean {
  return _permissions[role]?.[perm] ?? false;
}

export function setPermissions(perms: Record<UserRole, Record<PermKey, boolean>>): void {
  _permissions = JSON.parse(JSON.stringify(perms));
  // Sync to Firebase
  for (const [role, rolePerms] of Object.entries(perms)) {
    db.updateRolePermissions(role as UserRole, rolePerms);
  }
  _permListeners.forEach(l => l());
}

export function subscribePermissions(listener: () => void): () => void {
  _permListeners.push(listener);
  return () => { _permListeners = _permListeners.filter(l => l !== listener); };
}

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
  autoSaveInterval: 5, sessionTimeout: 30, maxFileSize: 50,
  encryptionEnabled: true, offlineMode: true, autoBackup: true,
  emailNotifications: true, smsAlerts: false, darkMode: false,
  language: 'English', policeStation: 'Cybercrime PS, Ahmedabad',
  district: 'Ahmedabad', state: 'Gujarat', firPrefix: 'FIR/CC/AHD',
};
let _settingsListeners: Array<() => void> = [];

function hydrateSettings(data: any): void {
  if (!data) return;
  _settings = { ..._settings, ...data };
  _settingsListeners.forEach(l => l());
}

export function getSettings(): SystemSettings { return { ..._settings }; }

export function updateSettings(updates: Partial<SystemSettings>): void {
  _settings = { ..._settings, ...updates };
  db.updateSettings(updates);
  _settingsListeners.forEach(l => l());
  addAuditLog('UPDATE_SETTINGS', 'system', `System settings updated`, 'admin1');
}

export function subscribeSettings(listener: () => void): () => void {
  _settingsListeners.push(listener);
  return () => { _settingsListeners = _settingsListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   LEGAL SECTIONS
   ════════════════════════════════════════════ */
let LEGAL_SECTIONS: LegalSection[] = [];

function hydrateLegalSections(data: Record<string, any>): void {
  LEGAL_SECTIONS = Object.values(data).map((s: any) => ({
    id: s.id,
    act: s.act,
    sectionNumber: s.sectionNumber,
    title: s.title,
    description: s.description,
    keywords: s.keywords || [],
    crimeTypes: s.crimeTypes || [],
    evidence_required: s.evidence_required || [],
    relatedSections: s.relatedSections || [],
    punishment: s.punishment,
  }));
}

export function getLegalSections(): LegalSection[] {
  return [...LEGAL_SECTIONS];
}

/* ════════════════════════════════════════════
   JUDGMENTS
   ════════════════════════════════════════════ */
let JUDGMENTS: Judgment[] = [];

function hydrateJudgments(data: Record<string, any>): void {
  JUDGMENTS = Object.values(data).map((j: any) => ({
    id: j.id,
    title: j.title,
    court: j.court,
    year: j.year,
    summary: j.summary,
    relevantSections: j.relevantSections || [],
    citation: j.citation,
  }));
}

export function getJudgments(): Judgment[] {
  return [...JUDGMENTS];
}

/* ════════════════════════════════════════════
   CASES
   ════════════════════════════════════════════ */
let _cases: CaseRecord[] = [];

function hydrateCases(data: Record<string, any>): void {
  _cases = Object.values(data).map((c: any) => ({
    id: c.id,
    firNumber: c.firNumber,
    caseNumber: c.caseNumber,
    policeStation: c.policeStation,
    assignedOfficer: c.assignedOfficer,
    status: c.status,
    crimeType: c.crimeType,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    victim: c.victim,
    accused: c.accused,
    incident: c.incident,
    evidenceIds: c.evidenceIds || [],
    legalSectionIds: c.legalSectionIds || [],
    documentIds: c.documentIds || [],
    diaryEntries: c.diaryEntries || [],
    readinessScore: c.readinessScore || 0,
    reviewStatus: c.reviewStatus || 'pending_io',
    reviewComments: c.reviewComments || [],
  }));
  _caseListeners.forEach(l => l());
}

let _caseListeners: Array<() => void> = [];

export function getCases(): CaseRecord[] { return [..._cases]; }

export function getCase(id: string): CaseRecord | undefined {
  return _cases.find(c => c.id === id);
}

export function addCase(c: CaseRecord): void {
  _cases = [c, ..._cases];
  db.createCase(c);
  addAuditLog('CREATE_CASE', c.id, `Created case ${c.firNumber} for ${c.crimeType}`);
  _caseListeners.forEach(l => l());
}

export function updateCase(id: string, updates: Partial<CaseRecord>): void {
  _cases = _cases.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
  db.updateCase(id, { ...updates, updatedAt: new Date().toISOString() });
  _caseListeners.forEach(l => l());
}

export function deleteCase(id: string): void {
  _cases = _cases.filter(c => c.id !== id);
  db.deleteCase(id);
  _caseListeners.forEach(l => l());
}

export function addDiaryEntry(caseId: string, entry: DiaryEntry): void {
  _cases = _cases.map(c => c.id === caseId ? { ...c, diaryEntries: [...c.diaryEntries, entry] } : c);
  db.addDiaryEntry(caseId, entry);
  addAuditLog('DIARY_ENTRY', caseId, entry.action);
  _caseListeners.forEach(l => l());
}

export function subscribeCases(listener: () => void): () => void {
  _caseListeners.push(listener);
  return () => { _caseListeners = _caseListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   EVIDENCE
   ════════════════════════════════════════════ */
let _evidence: Evidence[] = [];

function hydrateEvidence(data: Record<string, any>): void {
  _evidence = Object.values(data).map((e: any) => ({
    id: e.id,
    caseId: e.caseId,
    fileName: e.fileName,
    fileType: e.fileType,
    fileSize: e.fileSize,
    uploadedAt: e.uploadedAt,
    uploadedBy: e.uploadedBy,
    sha256Hash: e.sha256Hash,
    tags: e.tags || [],
    mimeType: e.mimeType,
    filePath: e.filePath,
    extractedEntities: e.extractedEntities || [],
    chainOfCustody: e.chainOfCustody || [],
  }));
  _evidenceListeners.forEach(l => l());
}

let _evidenceListeners: Array<() => void> = [];

export function getEvidence(): Evidence[] { return [..._evidence]; }

export function getEvidenceForCase(caseId: string): Evidence[] {
  return _evidence.filter(e => e.caseId === caseId);
}

export function addEvidence(e: Evidence): void {
  _evidence = [e, ..._evidence];
  db.createEvidence(e);
  addAuditLog('UPLOAD_EVIDENCE', e.id, `Uploaded ${e.fileName} for ${e.caseId}`);
  _evidenceListeners.forEach(l => l());
}

export function deleteEvidence(id: string): void {
  _evidence = _evidence.filter(e => e.id !== id);
  db.deleteEvidence(id);
  _evidenceListeners.forEach(l => l());
}

export function subscribeEvidence(listener: () => void): () => void {
  _evidenceListeners.push(listener);
  return () => { _evidenceListeners = _evidenceListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   DOCUMENTS
   ════════════════════════════════════════════ */
let _documents: GeneratedDocument[] = [];

function hydrateDocuments(data: Record<string, any>): void {
  _documents = Object.values(data).map((d: any) => ({
    id: d.id,
    caseId: d.caseId,
    type: d.type,
    title: d.title,
    content: d.content || '',
    generatedAt: d.generatedAt,
    generatedBy: d.generatedBy,
    status: d.status,
    validationErrors: d.validationErrors || [],
    version: d.version || 1,
  }));
}

export function getDocuments(): GeneratedDocument[] { return [..._documents]; }

export function getDocumentsForCase(caseId: string): GeneratedDocument[] {
  return _documents.filter(d => d.caseId === caseId);
}

export function addDocument(d: GeneratedDocument): void {
  _documents = [d, ..._documents];
  db.createDocument(d);
  addAuditLog('GENERATE_DOC', d.id, `Generated ${d.title} for ${d.caseId}`);
}

/* ════════════════════════════════════════════
   AUDIT LOGS
   ════════════════════════════════════════════ */
let _auditLogs: AuditLog[] = [];

function hydrateAuditLogs(data: Record<string, any>): void {
  _auditLogs = Object.values(data).map((l: any) => ({
    id: l.id,
    userId: l.userId,
    userName: l.userName,
    userRole: l.userRole,
    action: l.action,
    target: l.target,
    details: l.details,
    timestamp: l.timestamp,
  }));
}

export function getAuditLogs(): AuditLog[] {
  return [..._auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addAuditLog(action: string, target: string, details: string, userId = 'io1'): void {
  const user = USERS[userId];
  const log: AuditLog = {
    id: `al-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userName: user?.name || 'Unknown',
    userRole: user?.role || 'io',
    action,
    target,
    details,
    timestamp: new Date().toISOString(),
  };
  _auditLogs.push(log);
  db.addAuditLog(log);
}

/* ════════════════════════════════════════════
   NOTIFICATIONS
   ════════════════════════════════════════════ */
let _notifications: Notification[] = [];
let _notifListeners: Array<() => void> = [];

export async function loadNotifications(userId: string): Promise<void> {
  _notifications = await db.getNotifications(userId);
  _notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  _notifListeners.forEach(l => l());
}

export function getNotifications(): Notification[] {
  return [..._notifications];
}

export function markNotificationRead(id: string): void {
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
  db.markNotificationRead(id);
  _notifListeners.forEach(l => l());
}

export function addNotification(n: Omit<Notification, 'id'>): void {
  const notif: Notification = { ...n, id: `n-${Date.now()}` };
  _notifications = [notif, ..._notifications];
  db.addNotification(notif);
  _notifListeners.forEach(l => l());
}

export function subscribeNotifications(listener: () => void): () => void {
  _notifListeners.push(listener);
  return () => { _notifListeners = _notifListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   TOAST MANAGEMENT (local only)
   ════════════════════════════════════════════ */
let _toastQueue: Toast[] = [];
let _toastListeners: Array<(toasts: Toast[]) => void> = [];

export function showToast(message: string, type: Toast['type'] = 'info', duration = 4000): void {
  const toast: Toast = { id: `t-${Date.now()}`, message, type, duration };
  _toastQueue = [..._toastQueue, toast];
  _toastListeners.forEach(l => l([..._toastQueue]));
  setTimeout(() => {
    _toastQueue = _toastQueue.filter(t => t.id !== toast.id);
    _toastListeners.forEach(l => l([..._toastQueue]));
  }, duration);
}

export function subscribeToasts(listener: (toasts: Toast[]) => void): () => void {
  _toastListeners.push(listener);
  return () => { _toastListeners = _toastListeners.filter(l => l !== listener); };
}

export function getToasts(): Toast[] {
  return [..._toastQueue];
}

/* ════════════════════════════════════════════
   AI SIMULATION
   ════════════════════════════════════════════ */
export function simulateLegalAnalysis(narrative: string): Promise<{ suggestions: LegalSuggestion[]; judgments: Judgment[] }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerNarrative = narrative.toLowerCase();
      const matched: LegalSuggestion[] = [];

      for (const section of LEGAL_SECTIONS) {
        const matchedKeywords = section.keywords.filter(kw => lowerNarrative.includes(kw));
        if (matchedKeywords.length > 0 || section.crimeTypes.some(ct => lowerNarrative.includes(ct.toLowerCase()))) {
          const confidence = Math.min(0.98, 0.6 + matchedKeywords.length * 0.1 + Math.random() * 0.1);
          matched.push({
            section,
            confidence,
            reasoning: `The complaint narrative contains keywords related to ${section.title}: ${matchedKeywords.join(', ') || section.crimeTypes[0] || 'related crime patterns'}. This section covers ${section.description.substring(0, 120)}...`,
            matchedKeywords,
          });
        }
      }

      if (matched.length === 0) {
        matched.push({
          section: LEGAL_SECTIONS[0] || {} as LegalSection,
          confidence: 0.55,
          reasoning: 'General fraud indicators detected in the complaint narrative.',
          matchedKeywords: ['fraud'],
        });
      }

      matched.sort((a, b) => b.confidence - a.confidence);

      const relevantJudgments = JUDGMENTS.filter(j =>
        matched.some(m => j.relevantSections.includes(m.section.id))
      );

      resolve({ suggestions: matched.slice(0, 5), judgments: relevantJudgments });
    }, 1500 + Math.random() * 1000);
  });
}

export function simulateEntityExtraction(text: string): Promise<{ crimeType: string; entities: Record<string, string> }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      let crimeType = 'General Offence';
      if (lower.includes('scam') || lower.includes('fraud') || lower.includes('cheat')) crimeType = 'Cyber Fraud';
      else if (lower.includes('theft') || lower.includes('steal') || lower.includes('stolen')) crimeType = 'Theft';
      else if (lower.includes('identity') || lower.includes('fake profile') || lower.includes('impersonat')) crimeType = 'Identity Theft';
      else if (lower.includes('forg') || lower.includes('fake document')) crimeType = 'Document Forgery';
      else if (lower.includes('assault') || lower.includes('beat') || lower.includes('hurt') || lower.includes('attack')) crimeType = 'Assault';

      const entities: Record<string, string> = {};
      const phoneMatch = text.match(/(\+?\d[\d\s-]{9,})/);
      if (phoneMatch) entities['Phone'] = phoneMatch[1].trim();
      const amountMatch = text.match(/₹[\d,. lakhlakhcrore]+|Rs\.?\s*[\d,. lakhlakhcrore]+|\d+ lakh|\d+ crore/i);
      if (amountMatch) entities['Amount'] = amountMatch[0];
      const upiMatch = text.match(/[\w.]+@[\w]+/);
      if (upiMatch) entities['UPI ID'] = upiMatch[0];

      resolve({ crimeType, entities });
    }, 800 + Math.random() * 500);
  });
}

/* ════════════════════════════════════════════
   UTILITY FUNCTIONS
   ════════════════════════════════════════════ */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* ════════════════════════════════════════════
   CURRENT USER & AUTH STATE
   ════════════════════════════════════════════ */
let _currentRole: UserRole = 'io';
let _currentUserId: string = 'io1';
let _roleListeners: Array<(role: UserRole) => void> = [];
let _isAuthenticated = false;
let _authListeners: Array<(auth: boolean) => void> = [];
let _authLoading = false;
let _authLoadingListeners: Array<(loading: boolean) => void> = [];

export function getCurrentRole(): UserRole { return _currentRole; }
export function getCurrentUser(): User { return USERS[_currentUserId] || USERS[`${_currentRole}1`] || Object.values(USERS)[0] || { id: 'io1', name: 'Unknown', role: 'io', badge: '', station: '', email: '' }; }
export function getCurrentUserId(): string { return _currentUserId; }

export function setCurrentRole(role: UserRole): void {
  _currentRole = role;
  _currentUserId = `${role}1`;
  _roleListeners.forEach(l => l(role));
  addAuditLog('ROLE_SWITCH', role, `Switched to ${role.toUpperCase()} role`);
}

export function subscribeRole(listener: (role: UserRole) => void): () => void {
  _roleListeners.push(listener);
  return () => { _roleListeners = _roleListeners.filter(l => l !== listener); };
}

export function getIsAuthenticated(): boolean { return _isAuthenticated; }

export function getAuthLoading(): boolean { return _authLoading; }

export function subscribeAuthLoading(listener: (loading: boolean) => void): () => void {
  _authLoadingListeners.push(listener);
  return () => { _authLoadingListeners = _authLoadingListeners.filter(l => l !== listener); };
}

/* ─── LOGIN (Firebase Auth) ─── */
export async function login(email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string; suspendedUntil?: string; suspensionReason?: string }> {
  _authLoading = true;
  _authLoadingListeners.forEach(l => l(true));

  try {
    const normalizedEmail = email.trim();

    if (getEmailFromRole(role).toLowerCase() !== normalizedEmail.toLowerCase()) {
      _authLoading = false;
      _authLoadingListeners.forEach(l => l(false));
      return {
        success: false,
        error: `Email does not match the selected role. Use ${getEmailFromRole(role)} for ${role.toUpperCase()}.`,
      };
    }

    const result = await firebaseLogin(normalizedEmail, password);
    if (!result.success) {
      if (!verifyDemoCredentials(normalizedEmail, password, role)) {
        _authLoading = false;
        _authLoadingListeners.forEach(l => l(false));
        return { success: false, error: result.error || 'Login failed.' };
      }
      console.log('[CrimeGPT] Firebase auth unavailable — using demo credentials.');
    }

    // Find user in our database
    const userId = `${role}1`;
    const uState = _userStates[userId];

    // Check suspension
    if (uState?.suspendedUntil) {
      const until = new Date(uState.suspendedUntil);
      if (until > new Date()) {
        await firebaseLogout(); // Sign out since suspended
        _authLoading = false;
        _authLoadingListeners.forEach(l => l(false));
        return {
          success: false,
          error: `Your account is suspended until ${until.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.${uState.suspensionReason ? ` Reason: ${uState.suspensionReason}` : ''} Contact your administrator.`,
          suspendedUntil: uState.suspendedUntil,
          suspensionReason: uState.suspensionReason,
        };
      } else {
        unsuspendUser(userId);
      }
    }

    // Check if user is deactivated
    if (uState && !uState.active && !uState.suspendedUntil) {
      await firebaseLogout();
      _authLoading = false;
      _authLoadingListeners.forEach(l => l(false));
      return { success: false, error: 'Your account has been deactivated. Contact your administrator.' };
    }

    // Update lastLogin
    const now = new Date().toISOString();
    if (!_userStates[userId]) _userStates[userId] = { lastLogin: null, suspendedUntil: null, suspensionReason: '', active: true };
    _userStates[userId].lastLogin = now;
    db.update(`/userStates/${userId}`, { lastLogin: now });
    _userStateListeners.forEach(l => l());

    // Set authenticated state
    _isAuthenticated = true;
    _currentRole = role;
    _currentUserId = userId;
    _authLoading = false;
    _authLoadingListeners.forEach(l => l(false));
    _authListeners.forEach(l => l(true));
    _roleListeners.forEach(l => l(role));

    // Load notifications for this user
    loadNotifications(userId);

    addAuditLog('LOGIN', role, `${USERS[userId]?.name || 'User'} logged in`, userId);
    return { success: true };
  } catch (err: any) {
    _authLoading = false;
    _authLoadingListeners.forEach(l => l(false));
    return { success: false, error: err?.message || 'Login failed.' };
  }
}

export async function logout(): Promise<void> {
  const user = getCurrentUser();
  addAuditLog('LOGOUT', _currentRole, `${user?.name || 'User'} logged out`);
  await firebaseLogout();
  _isAuthenticated = false;
  _authListeners.forEach(l => l(false));
}

export function subscribeAuth(listener: (auth: boolean) => void): () => void {
  _authListeners.push(listener);
  return () => { _authListeners = _authListeners.filter(l => l !== listener); };
}

/* ─── ROLE SWITCH RE-AUTH ─── */
let _pendingRoleSwitch: UserRole | null = null;

export function requestRoleSwitch(newRole: UserRole): void {
  const user = getCurrentUser();
  addAuditLog('LOGOUT', _currentRole, `${user?.name || 'User'} logged out (role switch to ${newRole.toUpperCase()})`);
  _isAuthenticated = false;
  _pendingRoleSwitch = newRole;
  _authListeners.forEach(l => l(false));
}

export function getPendingRoleSwitch(): UserRole | null {
  return _pendingRoleSwitch;
}

export function clearPendingRoleSwitch(): void {
  _pendingRoleSwitch = null;
}

/* ─── ADMIN: CREATE NEW USER ─── */
export async function createNewUser(
  fullName: string, email: string, password: string, role: UserRole,
  badgeNumber: string, stationName: string, mobile: string
): Promise<{ success: boolean; error?: string }> {
  // Create in Firebase Auth
  const authResult = await firebaseCreateUser(email, password);
  if (!authResult.success) return { success: false, error: authResult.error };

  // Create in database
  const id = generateUniqueId();
  const userData = {
    id, fullName, email, role, badgeNumber, stationName, mobile, status: 'active',
    suspendedUntil: null, suspensionReason: '', lastLogin: null,
  };
  await db.createUser(userData);

  // Update local cache
  USERS[id] = { id, name: fullName, role, badge: badgeNumber, station: stationName, email };
  _userStates[id] = { lastLogin: null, suspendedUntil: null, suspensionReason: '', active: true };

  addAuditLog('CREATE_USER', id, `Created user ${fullName} (${role})`, 'admin1');
  return { success: true };
}

/* ─── NETWORK STATE (local) ─── */
let _isOnline = navigator.onLine;
let _onlineListeners: Array<(online: boolean) => void> = [];

export function getIsOnline(): boolean { return _isOnline; }
export function toggleOnline(): void {
  _isOnline = !_isOnline;
  _onlineListeners.forEach(l => l(_isOnline));
}
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  _onlineListeners.push(listener);
  return () => { _onlineListeners = _onlineListeners.filter(l => l !== listener); };
}

// Listen for browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { _isOnline = true; _onlineListeners.forEach(l => l(true)); });
  window.addEventListener('offline', () => { _isOnline = false; _onlineListeners.forEach(l => l(false)); });
}
