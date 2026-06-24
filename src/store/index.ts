/* ============================================
   CRIMEGPT 2.0 — FIREBASE-BACKED STORE
   ============================================
   All data persists to Firebase Realtime DB.
   Local state = fast cache, Firebase = source of truth.
   Real-time listeners sync across devices.
   ============================================ */

import { type User, type CaseRecord, type Evidence, type AuditLog, type Notification, type Toast, type GeneratedDocument, type UserRole, type DiaryEntry, type PoliceRank, type ClearanceLevel, type AccessRequest, type WorkflowEvent } from '../types';
import { firebaseLogin, firebaseLogout, firebaseCreateUser, ensureDemoAuthUsers, verifyDemoCredentials, getEmailFromRole } from '../services/auth';
import * as db from '../services/db';
import {
  SEED_USERS, SEED_ROLES, SEED_SETTINGS,
} from '../data/seed';
import { isAIConfigured, analyzeComplaint, type AIAnalysisResult } from '../services/ai';
import * as wf from '../services/workflow';
import * as push from '../services/push';
import * as encryption from '../services/crypto';
import { reinitializeLanguage } from '../hooks/useTranslation';
/* ── MODEL LAYER (delegated to src/models/) ── */
import {
  type HydrationError,
  getHydrationErrors as _getHydrationErrors,
  validateBatch, SCHEMAS,
} from '../models/validation';
import {
  type SystemSettings, type UserPreferences,
  hydrateSettings as _hydrateSettings,
  getSettings as _getSettings, updateSettingsRaw,
  subscribeSettings as _subscribeSettings,
  getUserPrefsForUser, updateUserPrefsForUser,
  subscribeUserPreferences as _subscribeUserPreferences,
} from '../models/settingsModel';
import {
  hydrateLegalSections as _hydrateLegalSections,
  getLegalSections as _getLegalSections,
  hydrateJudgments as _hydrateJudgments,
  getJudgments as _getJudgments,
  simulateLegalAnalysis as _simulateLegalAnalysis,
} from '../models/legalModel';
export type { SystemSettings, UserPreferences } from '../models/settingsModel';

export type { Toast } from '../types';
export type { WorkflowEvent, NotificationPriority, NotificationAction, NotificationCategory, WorkflowEventType } from '../types';

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

export async function initializeStore(): Promise<void> {
  console.log('[CrimeGPT] initializeStore() called');
  try {
    // Ensure Firebase Auth demo users exist (for login)
    console.log('[CrimeGPT] Step 1: Ensuring demo auth users...');
    await ensureDemoAuthUsers();
    console.log('[CrimeGPT] Step 1 complete');

    // PHASE 1: Read only public data needed before login
    console.log('[CrimeGPT] Step 2: Reading public data (users, roles, settings, legal intel)...');
    const [users, roles, legalSections, judgments, settings] = await Promise.all([
      db.getAllUsers(),
      db.getRoles(),
      db.getAllLegalSections(),
      db.getAllJudgments(),
      db.getSettings(),
    ]);
    console.log('[CrimeGPT] Step 2 complete');

    // DEBUG: Log raw Firebase data (phase 1)
    console.log('[CrimeGPT DEBUG] Raw Firebase data (phase 1 - public):', {
      users: Object.keys(users).length,
      roles: roles ? Object.keys(roles).length : 0,
      legalSections: Object.keys(legalSections).length,
      judgments: Object.keys(judgments).length,
      settings: settings ? 'exists' : 'null',
    });

    // Hydrate public data
    console.log('[CrimeGPT] Step 3: Hydrating public store...');
    hydrateUsers(users);
    hydrateUserStates();
    hydrateRoles(roles);
    hydrateLegalSections(legalSections);
    hydrateJudgments(judgments);
    hydrateSettings(settings);
    console.log('[CrimeGPT] Step 3 complete');

    // DEBUG: Log hydrated data (phase 1)
    console.log('[CrimeGPT DEBUG] Hydrated store data (phase 1 - public):', {
      users: Object.keys(USERS).length,
    });

    // If Firebase returned empty data, show empty state (don't load seed)
    // EXCEPTION: Users must always exist for auth to work
    if (Object.keys(users).length === 0) {
      console.warn('[CrimeGPT] Firebase returned empty data.');
      console.warn('[CrimeGPT] Run migration script: npx tsx scripts/seed-firebase.ts');
      // Load users from seed so auth can work (cases will be empty)
      hydrateUsers(Object.fromEntries(SEED_USERS.map(u => [u.id, u])));
      hydrateRoles(SEED_ROLES);
      hydrateSettings(SEED_SETTINGS);
    }

    setupRealtimeListeners();
  } catch (err) {
    console.error('[CrimeGPT] Firebase init failed.', err);
    console.error('[CrimeGPT] Error stack:', err instanceof Error ? err.stack : 'No stack');
    // Load minimal data from seed so app can function
    hydrateUsers(Object.fromEntries(SEED_USERS.map(u => [u.id, u])));
    hydrateRoles(SEED_ROLES);
    hydrateSettings(SEED_SETTINGS);
    // Cases, evidence, documents will be empty
  }

  push.syncPermissionState();
  _isInitialized = true;
  // Clear any existing timers first (safe on first run; essential on HMR reload)
  stopEscalationTimer();
  stopDeadlineChecker();
  stopGapChecker();
  // Start all background tasks
  startEscalationTimer();
  startDeadlineChecker();
  startGapChecker();
  _initListeners.forEach(l => l());
}

/* ════════════════════════════════════════════
   PHASE 2: Load user-specific data after login
   ════════════════════════════════════════════ */
export async function loadUserDataAfterLogin(role: UserRole): Promise<void> {
  try {
    console.log('[CrimeGPT] Phase 2: Loading cases, evidence, documents...');
    const [cases, evidence, documents, allDiaryEntries] = await Promise.all([
      db.getAllCases(),
      db.getAllEvidence(),
      db.getAllDocuments(),
      db.getAllDiaryEntries(),
    ]);

    // Merge diary entries into cases
    mergeDiaryEntriesIntoCases(cases, allDiaryEntries);

    // Hydrate user-specific data
    hydrateCases(cases);
    hydrateEvidence(evidence);
    hydrateDocuments(documents);

    console.log('[CrimeGPT DEBUG] Hydrated store data (phase 2 - user-specific):', {
      cases: _cases.length,
      evidence: _evidence.length,
      documents: _documents.length,
    });

    // Admin-only: Load audit logs
    if (role === 'admin') {
      console.log('[CrimeGPT] Phase 2 (admin): Loading audit logs...');
      const auditLogs = await db.getAllAuditLogs();
      hydrateAuditLogs(auditLogs);
      console.log('[CrimeGPT DEBUG] Audit logs loaded:', _auditLogs.length);
    }

    console.log('[CrimeGPT] Phase 2 complete');
  } catch (err) {
    console.error('[CrimeGPT] Phase 2 data loading failed:', err);
    // App will show empty state for user data
  }
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
    // Re-merge diary entries into cases whenever /diaryEntries changes
    db.onDataChange<Record<string, Record<string, unknown>>>('/diaryEntries', async (data) => {
      if (!data) return;
      try {
        const freshCases = await db.getAllCases();
        mergeDiaryEntriesIntoCases(freshCases, data);
        hydrateCases(freshCases);
      } catch { /* ignore — next /cases listener will catch it */ }
    }),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateUsers(data: Record<string, any>): void {
  const valid = validateBatch('user', data, SCHEMAS.user);
  USERS = {};
  for (const u of valid) {
    USERS[u.id as string] = {
      id: u.id,
      name: u.fullName || u.name,
      role: u.role,
      rank: u.rank || undefined,
      clearanceLevel: u.clearanceLevel || undefined,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db.onDataChange('/userStates', (data: any) => {
    if (!data) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateRoles(data: any): void {
  if (!data) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
   6-LAYER SECURITY ENGINE
   Gujarat Police Hierarchy + BNSS 2023
   ════════════════════════════════════════════
   Layer 1: Case Ownership (BNSS Sec 175, 192)
   Layer 2: Station Isolation (BNSS Sec 179, 185)
   Layer 3: Hierarchical Access (DGP→PC)
   Layer 4: Data Classification (Sec 192(5))
   Layer 5: Clearance Levels (SP assignment)
   Layer 6: Access Requests (Zero FIR protocol)
   ════════════════════════════════════════════ */

/* ─── Access Request Store (Layer 6) ─── */
let _accessRequests: AccessRequest[] = [];
let _accessRequestListeners: Array<() => void> = [];

const RANK_HIERARCHY: Record<PoliceRank, number> = {
  'PC': 1, 'HC': 2, 'ASI': 3, 'SI': 4, 'Inspector': 5,
  'DySP': 6, 'Addl.SP': 7, 'SP': 8, 'DIG': 9, 'IG': 10,
  'Addl.DGP': 11, 'DGP': 12,
};

const ROLE_DEFAULT_RANK: Record<UserRole, PoliceRank> = {
  io: 'Inspector', sho: 'Inspector', legal: 'DySP', admin: 'SP',
};

const ROLE_CLEARANCE: Record<UserRole, ClearanceLevel> = {
  io: 2, sho: 3, legal: 4, admin: 5,
};

export function getRankLevel(rank: PoliceRank): number {
  return RANK_HIERARCHY[rank] || 0;
}

export function getUserRank(user: User): PoliceRank {
  return user.rank || ROLE_DEFAULT_RANK[user.role] || 'PC';
}

export function getUserClearance(user: User): ClearanceLevel {
  return user.clearanceLevel || ROLE_CLEARANCE[user.role] || 1;
}

export function getRoleDefaultRank(role: UserRole): PoliceRank {
  return ROLE_DEFAULT_RANK[role] || 'PC';
}

export function rankName(rank: PoliceRank): string {
  const names: Record<PoliceRank, string> = {
    'PC': 'Police Constable', 'HC': 'Head Constable', 'ASI': 'Asst. Sub-Inspector',
    'SI': 'Sub-Inspector', 'Inspector': 'Inspector', 'DySP': 'Dy. Superintendent',
    'Addl.SP': 'Addl. Superintendent', 'SP': 'Superintendent', 'DIG': 'Dy. Inspector General',
    'IG': 'Inspector General', 'Addl.DGP': 'Addl. Director General', 'DGP': 'Director General',
  };
  return names[rank] || rank;
}

/**
 * LAYER 1-6: Core access check — determines if a user can view/access a case
 * Returns { allowed, reason } for audit transparency
 */
export function canAccessCase(user: User, caseRecord: CaseRecord): { allowed: boolean; reason: string } {
  const userStation = user.station;
  const caseStation = caseRecord.assignedStation || caseRecord.policeStation;
  const userRank = getUserRank(user);
  const userClearance = getUserClearance(user);
  const rankLevel = getRankLevel(userRank);

  // LAYER 5: Clearance check — user clearance must meet case requirement
  if (userClearance < caseRecord.clearanceRequired) {
    return { allowed: false, reason: `Insufficient clearance (need Level ${caseRecord.clearanceRequired}, have Level ${userClearance})` };
  }

  // LAYER 4: Classification check — SECRET requires SP+ rank regardless of station
  if (caseRecord.classification === 'secret' && rankLevel < getRankLevel('SP')) {
    return { allowed: false, reason: 'SECRET classification requires SP rank or above' };
  }

  // LAYER 1: Case Ownership — assigned officer always has access
  if (caseRecord.assignedOfficer === user.id) {
    return { allowed: true, reason: 'Case owner' };
  }

  // LAYER 3: Hierarchical — SP+ (rank ≥ 8) can see ALL cases in their jurisdiction
  if (rankLevel >= getRankLevel('SP')) {
    return { allowed: true, reason: `Hierarchical access (${rankName(userRank)})` };
  }

  // LAYER 3: SHO supervises IO — if user is SHO role, can see cases assigned to IOs at same station
  if (user.role === 'sho' && caseStation === userStation) {
    return { allowed: true, reason: 'SHO station supervision' };
  }

  // LAYER 2: Station Isolation — same station, CONFIDENTIAL or PUBLIC
  if (caseStation === userStation && caseRecord.classification !== 'secret') {
    return { allowed: true, reason: 'Same station access' };
  }

  // LAYER 2: Cross-station — only PUBLIC classification passes freely
  if (caseStation !== userStation && caseRecord.classification === 'public') {
    return { allowed: true, reason: 'Public classification — cross-station allowed' };
  }

  // LAYER 6: Check if user has an approved access request for this case
  const approvedRequest = _accessRequests.find(
    r => r.caseId === caseRecord.id && r.requestedBy === user.id && r.status === 'approved'
  );
  if (approvedRequest) {
    // Check expiry
    if (approvedRequest.expiresAt && new Date(approvedRequest.expiresAt) < new Date()) {
      return { allowed: false, reason: 'Access request expired' };
    }
    return { allowed: true, reason: 'Approved access request' };
  }

  return { allowed: false, reason: `Station isolation — case belongs to ${caseStation}` };
}

/**
 * LAYER 2: Get all cases the current user is authorized to see
 */
export function getAccessibleCases(user?: User): CaseRecord[] {
  const u = user || getCurrentUser();
  return _cases.filter(c => canAccessCase(u, c).allowed);
}

/**
 * LAYER 6: Check if cross-station access request is needed
 */
export function needsAccessRequest(user: User, caseRecord: CaseRecord): boolean {
  const userStation = user.station;
  const caseStation = caseRecord.assignedStation || caseRecord.policeStation;
  return userStation !== caseStation && caseRecord.classification !== 'public';
}

/* ════════════════════════════════════════════
   ACCESS REQUEST WORKFLOW (Layer 6)
   Cross-station access via Zero FIR protocol
   ════════════════════════════════════════════ */

export function getAccessRequests(): AccessRequest[] {
  return [..._accessRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAccessRequestsForCase(caseId: string): AccessRequest[] {
  return _accessRequests.filter(r => r.caseId === caseId);
}

export function getPendingAccessRequests(): AccessRequest[] {
  return _accessRequests.filter(r => r.status === 'pending');
}

export function createAccessRequest(caseId: string, reason: string): AccessRequest {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const request: AccessRequest = {
    id: `ar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    caseId,
    requestedBy: user.id,
    requestedByRank: userRank,
    requestedByStation: user.station,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  _accessRequests.push(request);
  db.update(`/accessRequests/${request.id}`, request);
  addAuditLog('ACCESS_REQUEST', caseId, `${user.name} (${rankName(userRank)}, ${user.station}) requested access — ${reason}`, user.id);
  _accessRequestListeners.forEach(l => l());
  return request;
}

export function approveAccessRequest(requestId: string): void {
  const approver = getCurrentUser();
  _accessRequests = _accessRequests.map(r =>
    r.id === requestId ? { ...r, status: 'approved' as const, approvedBy: approver.id, approvedAt: new Date().toISOString() } : r
  );
  const request = _accessRequests.find(r => r.id === requestId);
  if (request) {
    db.update(`/accessRequests/${requestId}`, { status: 'approved', approvedBy: approver.id, approvedAt: new Date().toISOString() });
    addAuditLog('ACCESS_APPROVED', request.caseId, `${approver.name} approved cross-station access for ${request.requestedBy}`, approver.id);
  }
  _accessRequestListeners.forEach(l => l());
}

export function rejectAccessRequest(requestId: string, reason?: string): void {
  const rejector = getCurrentUser();
  _accessRequests = _accessRequests.map(r =>
    r.id === requestId ? { ...r, status: 'rejected' as const } : r
  );
  const request = _accessRequests.find(r => r.id === requestId);
  if (request) {
    db.update(`/accessRequests/${requestId}`, { status: 'rejected' });
    addAuditLog('ACCESS_REJECTED', request.caseId, `${rejector.name} rejected cross-station access — ${reason || 'No reason'}`, rejector.id);
  }
  _accessRequestListeners.forEach(l => l());
}

export function subscribeAccessRequests(listener: () => void): () => void {
  _accessRequestListeners.push(listener);
  return () => { _accessRequestListeners = _accessRequestListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   SYSTEM SETTINGS (wrappers over settingsModel)
   ════════════════════════════════════════════ */
export function getSettings(): SystemSettings { return _getSettings(); }

export function updateSettings(updates: Partial<SystemSettings>): void {
  updateSettingsRaw(updates);
  addAuditLog('UPDATE_SETTINGS', 'system', 'System settings updated', 'admin1');
}

export function subscribeSettings(listener: () => void): () => void {
  return _subscribeSettings(listener);
}

export function hydrateSettings(data: unknown): void { _hydrateSettings(data); }

/* ════════════════════════════════════════════
   USER PREFERENCES (wrappers over settingsModel)
   ════════════════════════════════════════════ */
export function getUserPreferences(userId?: string): UserPreferences {
  const id = userId || getCurrentUserId();
  return getUserPrefsForUser(id);
}

export function updateUserPreferences(updates: Partial<UserPreferences>, userId?: string): void {
  const id = userId || getCurrentUserId();
  updateUserPrefsForUser(id, updates);
}

export function subscribeUserPreferences(listener: () => void): () => void {
  return _subscribeUserPreferences(listener);
}

export function getHydrationErrors(): HydrationError[] { return _getHydrationErrors(); }

/* ════════════════════════════════════════════
   LEGAL SECTIONS & JUDGMENTS (wrappers over legalModel)
   ════════════════════════════════════════════ */
export function getLegalSections() { return _getLegalSections(); }
export function getJudgments() { return _getJudgments(); }
export function hydrateLegalSections(data: unknown) { _hydrateLegalSections(data as Record<string, unknown>); }
export function hydrateJudgments(data: unknown) { _hydrateJudgments(data as Record<string, unknown>); }
export async function simulateLegalAnalysis(narrative: string, crimeCategory?: string) { return _simulateLegalAnalysis(narrative, crimeCategory); }


/* ════════════════════════════════════════════
   CASES
   ════════════════════════════════════════════ */
let _cases: CaseRecord[] = [];

/**
 * Merge diary entries from /diaryEntries/ path into case objects.
 * Firebase stores diary entries in two places:
 * 1. /cases/${caseId}/diaryEntries (embedded array)
 * 2. /diaryEntries/${caseId}/${entryId} (separate path)
 * This function merges both so no entries are lost on hydration.
 */
function mergeDiaryEntriesIntoCases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cases: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allDiaryEntries: Record<string, Record<string, any>>
): void {
  if (!allDiaryEntries) return;
  for (const [caseId, entriesMap] of Object.entries(allDiaryEntries)) {
    if (cases[caseId] && entriesMap) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const embedded: any[] = cases[caseId].diaryEntries || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const external: any[] = Object.values(entriesMap);
      // Deduplicate by entry ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seen = new Set(embedded.map((e: any) => e.id));
      const merged = [...embedded, ...external.filter(e => !seen.has(e.id))];
      cases[caseId].diaryEntries = merged;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateCases(data: Record<string, any>): void {
  const valid = validateBatch('case', data, SCHEMAS.case);
  _cases = valid
    .filter((c: any) => !c.deleted)  // Filter out soft-deleted cases
    .map((c: any) => ({
      id: c.id,
      firNumber: c.firNumber,
      caseNumber: c.caseNumber,
      policeStation: c.policeStation,
      assignedOfficer: c.assignedOfficer,
      assignedStation: c.assignedStation || c.policeStation,
      classification: c.classification,
      clearanceRequired: c.clearanceRequired,
      status: c.status,
      crimeType: c.crimeType,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      victim: c.victim,
      accused: c.accused,
      incident: c.incident,
      evidenceIds: c.evidenceIds,
      legalSectionIds: c.legalSectionIds,
      documentIds: c.documentIds,
      diaryEntries: c.diaryEntries,
      readinessScore: c.readinessScore,
      reviewStatus: c.reviewStatus,
      reviewComments: c.reviewComments,
      _encrypted: c._encrypted || [],
    }));

  // Decrypt cases in background if encryption key is available
  if (encryption.isEncryptionKeyAvailable()) {
    decryptAllCases();
  } else {
    _caseListeners.forEach(l => l());
  }
}

let _caseListeners: Array<() => void> = [];

export function getCases(): CaseRecord[] { return [..._cases]; }

export function getCase(id: string): CaseRecord | undefined {
  return _cases.find(c => c.id === id);
}

/* ─── ENCRYPTION HELPERS ─── */

/**
 * One-time migration: Encrypts existing plaintext cases in Firebase.
 * Called once per user login if migration hasn't been completed.
 */
async function migratePlaintextCasesToEncrypted(): Promise<void> {
  if (!encryption.isEncryptionKeyAvailable()) return;

  // Check if migration already completed (stored in localStorage)
  const migrationKey = 'crimegpt_encryption_migration_v1';
  if (localStorage.getItem(migrationKey)) {
    console.log('[CrimeGPT] Encryption migration already completed.');
    return;
  }

  console.log('[CrimeGPT] Starting encryption migration for existing cases...');
  const updates: Record<string, unknown> = {};
  let migratedCount = 0;

  for (const c of _cases) {
    // Skip if already encrypted
    if (c._encrypted && c._encrypted.length > 0) continue;

    try {
      const encrypted = await encryptCaseForStorage(c);
      if (encrypted._encrypted && encrypted._encrypted.length > 0) {
        updates[`/cases/${c.id}`] = encrypted;
        migratedCount++;
      }
    } catch (err) {
      console.warn(`[CrimeGPT] Failed to encrypt case ${c.id}:`, err);
    }
  }

  // Batch update Firebase
  if (migratedCount > 0) {
    await db.updateMultiple(updates);
    localStorage.setItem(migrationKey, 'true');
    console.log(`[CrimeGPT] Migration complete: ${migratedCount} cases encrypted.`);
  } else {
    console.log('[CrimeGPT] No plaintext cases found to migrate.');
  }
}

/**
 * Encrypts sensitive PII fields in a case before storage.
 * Call this from UI before addCase().
 */
export async function encryptCaseForStorage(c: CaseRecord): Promise<CaseRecord> {
  if (!encryption.isEncryptionKeyAvailable()) {
    // No encryption key — store as-is (fallback for migration)
    return { ...c, _encrypted: [] };
  }

  const { encrypted, encryptedPaths } = await encryption.encryptSensitiveFields(c as unknown as Record<string, unknown>);
  return { ...encrypted, _encrypted: encryptedPaths } as unknown as CaseRecord;
}

/**
 * Decrypts sensitive PII fields in cases after loading from Firebase.
 * Call this after login or when new cases are loaded.
 */
export async function decryptAllCases(): Promise<void> {
  if (!encryption.isEncryptionKeyAvailable()) return;

  const decryptedCases: CaseRecord[] = [];
  for (const c of _cases) {
    if (c._encrypted && c._encrypted.length > 0) {
      const decrypted = await encryption.decryptSensitiveFields(c as unknown as Record<string, unknown>, c._encrypted);
      decryptedCases.push(decrypted as unknown as CaseRecord);
    } else {
      // Not encrypted — keep as-is
      decryptedCases.push(c);
    }
  }
  _cases = decryptedCases;
  _caseListeners.forEach(l => l());
}

/* ─── ENCRYPTION STATUS ─── */

export function isEncryptionActive(): boolean {
  return encryption.isEncryptionKeyAvailable();
}

export function getEncryptionAlgorithm(): string {
  return 'AES-256-GCM';
}

export function getKeyDerivationMethod(): string {
  return 'PBKDF2 (100,000 iterations)';
}

export function addCase(c: CaseRecord): void {
  // Ensure security defaults
  const secureCase: CaseRecord = {
    ...c,
    assignedStation: c.assignedStation || c.policeStation,
    classification: c.classification || 'confidential',
    clearanceRequired: c.clearanceRequired || 1,
  };
  _cases = [secureCase, ..._cases];
  db.createCase(secureCase);
  addAuditLog('CREATE_CASE', secureCase.id, `Created case ${secureCase.firNumber} for ${secureCase.crimeType} [${secureCase.classification.toUpperCase()}]`);
  _caseListeners.forEach(l => l());
  // Workflow: notify SHO/admin of new case
  const _cu = getCurrentUser();
  dispatchWorkflowEvent(wf.buildCaseCreatedEvent(_cu, secureCase));
  // Workflow: fire review_requested when case is submitted for review
  if (secureCase.reviewStatus === 'pending_sho' || secureCase.reviewStatus === 'pending_legal') {
    const reviewType = secureCase.reviewStatus === 'pending_sho' ? 'sho' : 'legal';
    dispatchWorkflowEvent(wf.buildReviewRequestedEvent(_cu, secureCase.id, secureCase.firNumber, reviewType));
  }
}

export function updateCase(id: string, updates: Partial<CaseRecord>): void {
  _cases = _cases.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c);
  db.updateCase(id, { ...updates, updatedAt: new Date().toISOString() });
  _caseListeners.forEach(l => l());
}

export function deleteCase(id: string): void {
  const user = getCurrentUser();
  const caseRecord = _cases.find(c => c.id === id);
  if (!caseRecord) return;
  
  // Remove from local state
  _cases = _cases.filter(c => c.id !== id);
  
  // Soft delete in Firebase (marks as deleted, doesn't remove)
  db.softDeleteCase(id, user.id);
  
  addAuditLog('DELETE_CASE', id, `Soft deleted case ${caseRecord.firNumber}`);
  _caseListeners.forEach(l => l());
}

// Admin permanent delete
export async function permanentlyDeleteCase(id: string): Promise<void> {
  const caseRecord = _cases.find(c => c.id === id);
  
  _cases = _cases.filter(c => c.id !== id);
  await db.permanentlyDeleteCase(id);
  
  addAuditLog('PERMANENT_DELETE_CASE', id, `Permanently deleted case ${caseRecord?.firNumber}`);
  _caseListeners.forEach(l => l());
}

// Admin restore case
export async function restoreCase(id: string): Promise<void> {
  const caseData = await db.getCase(id);
  if (!caseData) return;
  
  await db.restoreCase(id);
  
  const restoredCase = {
    ...caseData,
    deleted: false,
    deletedAt: undefined,
    deletedBy: undefined,
    diaryEntries: caseData.diaryEntries || [],
  } as CaseRecord;
  
  _cases.push(restoredCase);
  addAuditLog('RESTORE_CASE', id, `Restored case ${caseData.firNumber}`);
  _caseListeners.forEach(l => l());
}

// Get deleted cases for admin
export async function getDeletedCases(): Promise<CaseRecord[]> {
  const allCases = await db.getAllCases();
  return Object.values(allCases)
    .filter((c: any) => c.deleted === true)
    .map(c => ({ ...c, diaryEntries: c.diaryEntries || [] })) as CaseRecord[];
}

export function addDiaryEntry(caseId: string, entry: DiaryEntry): void {
  _cases = _cases.map(c => c.id === caseId ? { ...c, diaryEntries: [...c.diaryEntries, entry] } : c);

  // Atomic write to BOTH paths so real-time listener on /cases picks up the new entry
  const updatedCase = _cases.find(c => c.id === caseId);
  db.updateMultiple({
    [`/diaryEntries/${caseId}/${entry.id}`]: entry,
    [`/cases/${caseId}/diaryEntries`]: updatedCase?.diaryEntries || [entry],
  });

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateEvidence(data: Record<string, any>): void {
  const valid = validateBatch('evidence', data, SCHEMAS.evidence);
  _evidence = valid.map((e: any) => ({
    id: e.id,
    caseId: e.caseId,
    fileName: e.fileName,
    fileType: e.fileType,
    fileSize: e.fileSize,
    uploadedAt: e.uploadedAt,
    uploadedBy: e.uploadedBy,
    sha256Hash: e.sha256Hash,
    tags: e.tags,
    mimeType: e.mimeType,
    filePath: e.filePath,
    fileData: e.fileData,
    extractedEntities: e.extractedEntities,
    chainOfCustody: e.chainOfCustody,
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
  // Workflow: notify IO/SHO of new evidence
  const _eu = getCurrentUser();
  const _ec = _cases.find(c => c.id === e.caseId);
  dispatchWorkflowEvent(wf.buildEvidenceUploadedEvent(_eu, e.caseId, _ec?.firNumber || e.caseId, e.fileName));
}

export function deleteEvidence(id: string): void {
  _evidence = _evidence.filter(e => e.id !== id);
  db.deleteEvidence(id);
  _evidenceListeners.forEach(l => l());
}

export function updateEvidence(id: string, updates: Partial<Evidence>): void {
  _evidence = _evidence.map(e => e.id === id ? { ...e, ...updates } : e);
  db.updateEvidence(id, updates);
  _evidenceListeners.forEach(l => l());
}

export function addCustodyEntry(evidenceId: string, entry: { action: 'uploaded' | 'viewed' | 'downloaded' | 'approved' | 'shared'; userId: string; userName: string; timestamp: string }): void {
  const ev = _evidence.find(e => e.id === evidenceId);
  if (!ev) return;
  const updatedChain = [...ev.chainOfCustody, entry];
  updateEvidence(evidenceId, { chainOfCustody: updatedChain });
}

export function subscribeEvidence(listener: () => void): () => void {
  _evidenceListeners.push(listener);
  return () => { _evidenceListeners = _evidenceListeners.filter(l => l !== listener); };
}

/* ════════════════════════════════════════════
   DOCUMENTS
   ════════════════════════════════════════════ */
let _documents: GeneratedDocument[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateDocuments(data: Record<string, any>): void {
  const valid = validateBatch('document', data, SCHEMAS.document);
  _documents = valid.map((d: any) => ({
    id: d.id,
    caseId: d.caseId,
    type: d.type,
    title: d.title,
    content: d.content,
    generatedAt: d.generatedAt,
    generatedBy: d.generatedBy,
    status: d.status,
    validationErrors: d.validationErrors,
    version: d.version,
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
  // Workflow: notify of document generation
  const _du = getCurrentUser();
  const _dc = _cases.find(c => c.id === d.caseId);
  dispatchWorkflowEvent(wf.buildWorkflowEvent({ eventType: 'document_generated', triggeredBy: _du.id, triggeredByName: _du.name, triggeredByRole: _du.role, caseId: d.caseId, firNumber: _dc?.firNumber || d.caseId, title: "Document Generated — " + (_dc?.firNumber || d.caseId), message: _du.name + " generated \"" + d.title + "\" for case " + (_dc?.firNumber || d.caseId) + ".", actions: [{ label: "View Document", type: "navigate", payload: "/documents" }] }));
}

/* ════════════════════════════════════════════
   AUDIT LOGS
   ════════════════════════════════════════════ */
let _auditLogs: AuditLog[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hydrateAuditLogs(data: Record<string, any>): void {
  const valid = validateBatch('auditLog', data, SCHEMAS.auditLog);
  _auditLogs = valid.map((l: any) => ({
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
  
  // Send browser notifications only for undelivered notifications
  const undelivered = _notifications.filter(n => !n.delivered && n.deliveryAttempts !== undefined && n.deliveryAttempts < 3);
  
  for (const notif of undelivered) {
    const success = await sendBrowserNotificationForStored(notif);
    
    if (success) {
      // Mark as delivered in Firebase
      await db.markNotificationDelivered(notif.id);
      notif.delivered = true;
      notif.deliveredAt = new Date().toISOString();
    } else {
      // Increment delivery attempts
      notif.deliveryAttempts = (notif.deliveryAttempts || 0) + 1;
      console.warn(`[CrimeGPT] Failed to deliver notification ${notif.id}, attempt ${notif.deliveryAttempts}`);
    }
  }
  
  _notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  _notifListeners.forEach(l => l());
}

// Helper function to send browser notification for stored notification
async function sendBrowserNotificationForStored(notif: Notification): Promise<boolean> {
  if (!push.isPushEnabled()) return false;
  
  return await push.sendBrowserNotification({
    title: notif.title,
    safeMessage: notif.message,
    priority: notif.priority || 'normal',
    caseId: notif.caseId,
    firNumber: notif.firNumber,
    tag: `crimegpt-${notif.id}`,
    onClickUrl: notif.link || '/',
  });
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
  const notif: Notification = { 
    ...n, 
    id: `n-${Date.now()}`,
    delivered: false,
    deliveredAt: undefined,
    deliveryAttempts: 0,
  };
  _notifications = [notif, ..._notifications];
  db.addNotification(notif);
  _notifListeners.forEach(l => l());
  
  // Try to send browser notification immediately (if user is online)
  if (push.shouldSendOSNotification()) {
    sendBrowserNotificationForStored(notif).then(success => {
      if (success) {
        db.markNotificationDelivered(notif.id);
        notif.delivered = true;
        notif.deliveredAt = new Date().toISOString();
      }
    });
  }
}

export function subscribeNotifications(listener: () => void): () => void {
  _notifListeners.push(listener);
  return () => { _notifListeners = _notifListeners.filter(l => l !== listener); };
}
/* ════════════════════════════════════════════
   WORKFLOW ENGINE — CrimeGPT Alert Center
   ════════════════════════════════════════════ */
let _workflowEvents: WorkflowEvent[] = [];
let _wfEventListeners: Array<() => void> = [];
let _escalationTimerId: ReturnType<typeof setInterval> | null = null;

export function getWorkflowEvents(): WorkflowEvent[] {
  return [..._workflowEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function getWorkflowEventsForCase(caseId: string): WorkflowEvent[] {
  return _workflowEvents.filter(e => e.caseId === caseId);
}
export function getUnresolvedWorkflowEvents(): WorkflowEvent[] {
  return _workflowEvents.filter(e => !e.resolved);
}
export function subscribeWorkflowEvents(listener: () => void): () => void {
  _wfEventListeners.push(listener);
  return () => { _wfEventListeners = _wfEventListeners.filter(l => l !== listener); };
}

export function dispatchWorkflowEvent(event: WorkflowEvent): void {
  _workflowEvents = [event, ..._workflowEvents];
  db.update("/workflowEvents/" + event.id, event);
  const ctx: wf.RecipientContext = { allUsers: USERS, currentUser: getCurrentUser(), caseRecord: event.caseId ? _cases.find(c => c.id === event.caseId) : undefined };
  const recipientIds = wf.resolveRecipients(event, ctx);
  const notifications = wf.generateNotificationsFromEvent(event, recipientIds);
  event.linkedNotificationIds = notifications.map(n => n.id);
  for (const notif of notifications) { 
    // Initialize delivery tracking
    notif.delivered = false;
    notif.deliveredAt = undefined;
    notif.deliveryAttempts = 0;
    
    _notifications = [notif, ..._notifications]; 
    db.addNotification(notif); 
    
    // Try immediate delivery if user is online
    if (push.shouldSendOSNotification()) {
      sendBrowserNotificationForStored(notif).then(success => {
        if (success) {
          db.markNotificationDelivered(notif.id);
          notif.delivered = true;
          notif.deliveredAt = new Date().toISOString();
        }
      });
    }
  }
  if (event.caseId) {
    const de: DiaryEntry = { id: "de-wf-" + Date.now(), caseId: event.caseId, timestamp: event.createdAt, action: "Workflow: " + event.eventType.replace(/_/g, ' '), description: event.message, performedBy: event.triggeredByName, category: 'other' };
    _cases = _cases.map(c => c.id === event.caseId ? { ...c, diaryEntries: [...c.diaryEntries, de] } : c);
    db.updateMultiple({ ["/diaryEntries/" + event.caseId + "/" + de.id]: de });
  }
  addAuditLog("WF_" + event.eventType.toUpperCase(), event.caseId || 'system', event.triggeredByName + ": " + event.title, event.triggeredBy);
  if (push.shouldSendOSNotification()) {
    push.sendBrowserNotification({ title: event.title, safeMessage: event.safeMessage, priority: event.priority, caseId: event.caseId, firNumber: event.firNumber, tag: event.id, onClickUrl: event.caseId ? '/cases' : '/' });
  }
  push.playAlertSound(event.priority);
  _notifListeners.forEach(l => l());
  _wfEventListeners.forEach(l => l());
  _caseListeners.forEach(l => l());
}

export function resolveWorkflowEvent(eventId: string, resolvedBy?: string): void {
  _workflowEvents = _workflowEvents.map(e => e.id === eventId ? { ...e, resolved: true, resolvedAt: new Date().toISOString(), resolvedBy } : e);
  const ev = _workflowEvents.find(e => e.id === eventId);
  if (ev) db.update("/workflowEvents/" + eventId, { resolved: true, resolvedAt: new Date().toISOString(), resolvedBy });
  _wfEventListeners.forEach(l => l());
}

export function resolveNotificationActions(actionType: string, payload?: string): void {
  const user = getCurrentUser();
  if (actionType === 'approve' && payload) {
    const c = _cases.find(x => x.id === payload);
    if (c) {
      const ns = c.reviewStatus === 'pending_sho' ? 'pending_legal' : 'approved';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateCase(payload, { reviewStatus: ns as any, status: ns === 'approved' ? 'approved' : c.status, reviewComments: [...(c.reviewComments || []), { id: generateUniqueId(), userId: user.id, userName: user.name, userRole: user.role, comment: 'Approved via Alert Center', timestamp: new Date().toISOString(), action: 'approve' as const }] });
      dispatchWorkflowEvent(wf.buildReviewCompletedEvent(user, payload, c.firNumber, 'approved', 'Approved via Alert Center'));
      showToast('Case approved successfully.', 'success');
    }
  } else if ((actionType === 'reject' || actionType === 'request_changes') && payload) {
    const c = _cases.find(x => x.id === payload);
    if (c) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateCase(payload, { reviewStatus: 'pending_sho' as any, reviewComments: [...(c.reviewComments || []), { id: generateUniqueId(), userId: user.id, userName: user.name, userRole: user.role, comment: actionType === 'reject' ? 'Rejected' : 'Changes requested', timestamp: new Date().toISOString(), action: 'return' as const }] });
      dispatchWorkflowEvent(wf.buildReviewCompletedEvent(user, payload, c.firNumber, 'returned', actionType === 'reject' ? 'Rejected' : 'Changes requested'));
      showToast(actionType === 'reject' ? 'Case rejected.' : 'Changes requested.', 'warning');
    }
  }
}

function startEscalationTimer(): void {
  if (_escalationTimerId) clearInterval(_escalationTimerId);
  _escalationTimerId = setInterval(() => {
    const pending = getUnresolvedWorkflowEvents();
    const all = getWorkflowEvents();
    const escalations = wf.checkEscalations(pending, all);
    for (const esc of escalations) { dispatchWorkflowEvent(esc); showToast("Escalation: " + esc.title, 'error'); }
  }, 5 * 60 * 1000);
}
export function stopEscalationTimer(): void { if (_escalationTimerId) { clearInterval(_escalationTimerId); _escalationTimerId = null; } }

export async function requestPushPermission(): Promise<boolean> { return push.requestPushPermission(); }
export function isPushEnabled(): boolean { return push.isPushEnabled(); }
export function getPushPermission(): string { return push.getNotificationPermission(); }

export function flushOfflineWorkflowQueue(): void {
  const events = wf.flushOfflineQueue();
  for (const ev of events) dispatchWorkflowEvent(ev);
  if (events.length > 0) showToast(events.length + " queued notification(s) delivered.", 'info');
}

/* ════════════════════════════════════════════
   WORKFLOW EVENT CONVENIENCE WRAPPERS
   Pages call these instead of importing wf directly.
   ════════════════════════════════════════════ */

export function fireCaseAssignedEvent(user: User, caseRecord: CaseRecord, assignedOfficerName: string): void {
  dispatchWorkflowEvent(wf.buildCaseAssignedEvent(user, caseRecord, assignedOfficerName));
}

export function fireReviewRequestedEvent(user: User, caseId: string, firNumber: string, reviewType: 'sho' | 'legal'): void {
  dispatchWorkflowEvent(wf.buildReviewRequestedEvent(user, caseId, firNumber, reviewType));
}

export function fireDocumentSubmittedEvent(user: User, caseId: string, firNumber: string, docTitle: string): void {
  dispatchWorkflowEvent(wf.buildDocumentSubmittedEvent(user, caseId, firNumber, docTitle));
}

export function fireSecurityAlert(title: string, message: string): void {
  dispatchWorkflowEvent(wf.buildSecurityAlertEvent(title, message));
}

export function fireGapAlertEvent(user: User, caseId: string, firNumber: string, gapDescription: string): void {
  dispatchWorkflowEvent(wf.buildGapAlertEvent(user, caseId, firNumber, gapDescription));
}

export function fireDeadlineReminder(caseId: string, firNumber: string, deadlineType: string, daysRemaining: number): void {
  dispatchWorkflowEvent(wf.buildDeadlineReminderEvent(caseId, firNumber, deadlineType, daysRemaining));
}

/* ════════════════════════════════════════════
   BACKGROUND: DEADLINE REMINDER CHECKER
   Scans active cases daily for approaching
   statutory deadlines (90-day chargesheet,
   24h remand, etc.)
   ════════════════════════════════════════════ */

let _deadlineTimerId: ReturnType<typeof setInterval> | null = null;
const _firedDeadlineKeys = new Set<string>(); // prevent duplicate fires

function checkDeadlines(): void {
  const activeCases = _cases.filter(c => c.status === 'active' || c.status === 'under_review' || c.status === 'draft');
  const now = Date.now();
  for (const c of activeCases) {
    if (!c.createdAt || !c.firNumber) continue;
    const createdMs = new Date(c.createdAt).getTime();
    const daysSinceCreation = Math.floor((now - createdMs) / (1000 * 60 * 60 * 24));

    // 90-day chargesheet deadline (Section 193 BNSS)
    const chargesheetDaysLeft = 90 - daysSinceCreation;
    if (chargesheetDaysLeft >= 0 && chargesheetDaysLeft <= 7) {
      const key = `${c.id}-chargesheet-${chargesheetDaysLeft <= 1 ? 'critical' : chargesheetDaysLeft <= 3 ? 'urgent' : 'soon'}`;
      if (!_firedDeadlineKeys.has(key)) {
        _firedDeadlineKeys.add(key);
        dispatchWorkflowEvent(wf.buildDeadlineReminderEvent(c.id, c.firNumber, 'Chargesheet filing (Section 193 BNSS)', chargesheetDaysLeft));
      }
    }

    // 60-day Purvani (preliminary report) deadline
    const purvaniDaysLeft = 60 - daysSinceCreation;
    if (purvaniDaysLeft >= 0 && purvaniDaysLeft <= 5) {
      const key = `${c.id}-purvani-${purvaniDaysLeft <= 1 ? 'critical' : 'soon'}`;
      if (!_firedDeadlineKeys.has(key)) {
        _firedDeadlineKeys.add(key);
        dispatchWorkflowEvent(wf.buildDeadlineReminderEvent(c.id, c.firNumber, 'Purvani report (Section 176 BNSS)', purvaniDaysLeft));
      }
    }
  }
}

export function startDeadlineChecker(): void {
  if (_deadlineTimerId) clearInterval(_deadlineTimerId);
  checkDeadlines(); // run immediately on startup
  _deadlineTimerId = setInterval(checkDeadlines, 60 * 60 * 1000); // then every hour
}

export function stopDeadlineChecker(): void {
  if (_deadlineTimerId) { clearInterval(_deadlineTimerId); _deadlineTimerId = null; }
}

/* ════════════════════════════════════════════
   BACKGROUND: INVESTIGATION GAP CHECKER
   Runs periodically to detect cases with
   missing evidence, no diary updates, or
   low readiness scores.
   ════════════════════════════════════════════ */

let _gapTimerId: ReturnType<typeof setInterval> | null = null;
const _firedGapKeys = new Set<string>();

function checkInvestigationGaps(): void {
  const activeCases = _cases.filter(c => c.status === 'active' || c.status === 'draft');
  const now = Date.now();
  for (const c of activeCases) {
    if (!c.firNumber) continue;
    const caseEvidence = _evidence.filter(e => e.caseId === c.id);
    const lastDiary = c.diaryEntries?.length > 0
      ? new Date(c.diaryEntries[c.diaryEntries.length - 1].timestamp).getTime()
      : new Date(c.createdAt).getTime();
    const daysSinceLastUpdate = Math.floor((now - lastDiary) / (1000 * 60 * 60 * 24));

    // Gap: No evidence uploaded and case is > 3 days old
    if (caseEvidence.length === 0 && daysSinceLastUpdate >= 3) {
      const key = `${c.id}-no-evidence`;
      if (!_firedGapKeys.has(key)) {
        _firedGapKeys.add(key);
        dispatchWorkflowEvent(wf.buildGapAlertEvent(
          { id: 'system', name: 'CrimeGPT AI', role: 'admin' } as User,
          c.id, c.firNumber, 'No evidence has been uploaded for this case despite being open for 3+ days'
        ));
      }
    }

    // Gap: Readiness score below 40% and case is > 7 days old
    if ((c.readinessScore || 0) < 40 && daysSinceLastUpdate >= 7) {
      const key = `${c.id}-low-readiness`;
      if (!_firedGapKeys.has(key)) {
        _firedGapKeys.add(key);
        dispatchWorkflowEvent(wf.buildGapAlertEvent(
          { id: 'system', name: 'CrimeGPT AI', role: 'admin' } as User,
          c.id, c.firNumber, `Investigation readiness score is only ${c.readinessScore || 0}% after 7+ days — review required`
        ));
      }
    }
  }
}

export function startGapChecker(): void {
  if (_gapTimerId) clearInterval(_gapTimerId);
  checkInvestigationGaps(); // run on startup
  _gapTimerId = setInterval(checkInvestigationGaps, 2 * 60 * 60 * 1000); // every 2 hours
}

export function stopGapChecker(): void {
  if (_gapTimerId) { clearInterval(_gapTimerId); _gapTimerId = null; }
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
   AI ENGINE — Groq LLM + Fallback Simulators
   ════════════════════════════════════════════ */

export async function getIsAIConfigured(): Promise<boolean> { return isAIConfigured(); }

/* ─── Enhanced return type for entity extraction ─── */
export interface EnhancedEntityResult {
  crimeType: string;
  entities: Record<string, string>;
  analysis?: AIAnalysisResult;
  aiPowered: boolean;
}

/* ─── Main entity extraction (tries AI, falls back to simulator) ─── */
export async function simulateEntityExtraction(text: string, crimeCategory?: string): Promise<EnhancedEntityResult> {
  if (await isAIConfigured()) {
    try {
      const ai = await analyzeComplaint(text);

      // Build entities map from AI result
      const entities: Record<string, string> = {};
      for (const e of ai.entities) {
        const key = e.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        entities[key] = e.value;
      }
      // Also add structured fields
      if (ai.victim.mobile) entities['Victim Phone'] = ai.victim.mobile;
      if (ai.accused.mobile && ai.accused.mobile !== '') entities['Accused Phone'] = ai.accused.mobile;
      if (ai.incident.location) entities['Location'] = ai.incident.location;
      if (ai.incident.date) entities['Date'] = ai.incident.date;

      // Use caller-provided category as override when AI returns generic result
      const resolvedCrimeType = crimeCategory && ai.crimeType === 'General Offence'
        ? crimeCategory
        : ai.crimeType;

      return { crimeType: resolvedCrimeType, entities, analysis: ai, aiPowered: true };
    } catch (err) {
      console.warn('AI extraction failed, using fallback:', err);
    }
  }
  // Fallback to simulator
  const result = _simulateEntityExtractionFallback(text, crimeCategory);
  return { ...result, aiPowered: false };
}


/* ─── FALLBACK: Original pattern-based entity extraction ─── */
function _simulateEntityExtractionFallback(text: string, crimeCategory?: string): { crimeType: string; entities: Record<string, string> } {
  const lower = text.toLowerCase();
  let crimeType = crimeCategory || 'General Offence';
  if (!crimeCategory) {
    if (lower.includes('scam') || lower.includes('fraud') || lower.includes('cheat')) crimeType = 'Cyber Fraud';
    else if (lower.includes('theft') || lower.includes('steal') || lower.includes('stolen')) crimeType = 'Theft';
    else if (lower.includes('identity') || lower.includes('fake profile') || lower.includes('impersonat')) crimeType = 'Identity Theft';
    else if (lower.includes('forg') || lower.includes('fake document')) crimeType = 'Document Forgery';
    else if (lower.includes('assault') || lower.includes('beat') || lower.includes('hurt') || lower.includes('attack')) crimeType = 'Assault';
  }

  const entities: Record<string, string> = {};
  const phoneMatch = text.match(/(\+?\d[\d\s-]{9,})/);
  if (phoneMatch) entities['Phone'] = phoneMatch[1].trim();
  const amountMatch = text.match(/₹[\d,. lakhlakhcrore]+|Rs\.?\s*[\d,. lakhlakhcrore]+|\d+ lakh|\d+ crore/i);
  if (amountMatch) entities['Amount'] = amountMatch[0];
  const upiMatch = text.match(/[\w.]+@[\w]+/);
  if (upiMatch) entities['UPI ID'] = upiMatch[0];

  return { crimeType, entities };
}

/* ════════════════════════════════════════════
   UTILITY FUNCTIONS
   ════════════════════════════════════════════ */
export function generateUniqueId(): string {
  // Use crypto.randomUUID() for cryptographically secure, non-predictable IDs
  // Complies with audit log integrity requirements
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers (rare): use timestamp + high-entropy random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 9)}`;
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

    // Derive encryption key from password (PBKDF2, AES-256-GCM)
    await encryption.deriveEncryptionKeyWithSalt(password);

    // Migrate existing plaintext cases to encrypted format (one-time migration)
    await migratePlaintextCasesToEncrypted();

    // Decrypt any existing encrypted cases
    await decryptAllCases();

    // PHASE 2: Load user-specific data after login (cases, evidence, documents, etc.)
    console.log('[CrimeGPT] Login successful - loading user-specific data (Phase 2)...');
    await loadUserDataAfterLogin(role);

    // Persist session for auto-login on refresh
    persistSession();

    // Load notifications for this user
    loadNotifications(userId);
    
    // Clean up old delivered notifications (runs in background)
    db.deleteDeliveredNotifications(userId).catch(err => {
      console.warn('[CrimeGPT] Notification cleanup failed:', err);
    });

    // Re-initialize language from user preferences
    reinitializeLanguage();

    return { success: true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    _authLoading = false;
    _authLoadingListeners.forEach(l => l(false));
    return { success: false, error: err?.message || 'Login failed.' };
  }
}

export async function logout(): Promise<void> {
  const user = getCurrentUser();
  addAuditLog('LOGOUT', _currentRole, `${user?.name || 'User'} logged out`);
  // Clear encryption key from memory
  encryption.clearEncryptionKey();
  clearSession();
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
  clearSession();
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
  USERS[id] = { id, name: fullName, role, rank: getRoleDefaultRank(role), clearanceLevel: ROLE_CLEARANCE[role], badge: badgeNumber, station: stationName, email };
  _userStates[id] = { lastLogin: null, suspendedUntil: null, suspensionReason: '', active: true };

  addAuditLog('CREATE_USER', id, `Created user ${fullName} (${role})`, 'admin1');
  return { success: true };
}

/* ════════════════════════════════════════════
   SESSION PERSISTENCE (auto-login on refresh)
   ════════════════════════════════════════════ */

const SESSION_STORAGE_KEY = 'crimegpt_session';

interface StoredSession {
  role: UserRole;
  userId: string;
  loginTime: number;
  lastActivity: number;
}

export function getSessionTimeoutMs(): number {
  return (_getSettings().sessionTimeout || 30) * 60 * 1000;
}

export function persistSession(): void {
  const now = Date.now();
  const session: StoredSession = {
    role: _currentRole,
    userId: _currentUserId,
    loginTime: now,
    lastActivity: now,
  };
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)); } catch { /* storage full or blocked */ }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_STORAGE_KEY); } catch { /* noop */ }
}

export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch { return null; }
}

/**
 * Updates the lastActivity timestamp in localStorage.
 * Called on every user interaction while authenticated.
 */
export function touchSession(): void {
  const stored = getStoredSession();
  if (stored) {
    stored.lastActivity = Date.now();
    try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored)); } catch { /* noop */ }
  }
}

/**
 * Attempts to restore an authenticated session from localStorage.
 * Returns true if session is valid and was restored, false otherwise.
 * Called once on app init (page refresh).
 */
export function restoreSession(): boolean {
  const stored = getStoredSession();
  if (!stored) return false;

  // Check session hasn't expired
  const elapsed = Date.now() - stored.lastActivity;
  if (elapsed > getSessionTimeoutMs()) {
    clearSession();
    return false;
  }

  // Check user still exists and is not suspended
  const user = USERS[stored.userId];
  if (!user) { clearSession(); return false; }

  const uState = _userStates[stored.userId];
  if (uState?.suspendedUntil && new Date(uState.suspendedUntil) > new Date()) {
    clearSession();
    return false;
  }
  if (uState && !uState.active && !uState.suspendedUntil) {
    clearSession();
    return false;
  }

  // Restore in-memory auth state (Firebase Auth is handled separately)
  _isAuthenticated = true;
  _currentRole = stored.role;
  _currentUserId = stored.userId;
  _authListeners.forEach(l => l(true));
  _roleListeners.forEach(l => l(stored.role));

  // Derive encryption key from stored password hash (requires user to re-login for full decryption)
  // For session restore, we decrypt with the demo password (since all demo users share it)
  encryption.deriveEncryptionKeyWithSalt('admin@123').then(() => {
    // Run migration on restore too
    return migratePlaintextCasesToEncrypted();
  }).then(() => {
    return decryptAllCases();
  }).catch(() => {
    // Silently fail - user will see encrypted data until they re-login
    console.warn('[CrimeGPT] Could not derive encryption key for session restore');
  });

  // Refresh lastActivity to now (user just opened the app)
  touchSession();

  return true;
}
/* ─── NETWORK STATE (local) ─── */
let _isOnline = navigator.onLine;
let _onlineListeners: Array<(online: boolean) => void> = [];

export function getIsOnline(): boolean { return _isOnline; }
export function toggleOnline(): void {
  _isOnline = !_isOnline;
  _onlineListeners.forEach(l => l(_isOnline));
  if (_isOnline) { flushOfflineWorkflowQueue(); }
}
export function subscribeOnline(listener: (online: boolean) => void): () => void {
  _onlineListeners.push(listener);
  return () => { _onlineListeners = _onlineListeners.filter(l => l !== listener); };
}

// Listen for browser online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { _isOnline = true; _onlineListeners.forEach(l => l(true)); flushOfflineWorkflowQueue(); });
  window.addEventListener('offline', () => { _isOnline = false; _onlineListeners.forEach(l => l(false)); });
}
