/* ============================================
   CRIMEGPT 2.0 — FIREBASE DATABASE SERVICE
   ============================================ */

import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  type DatabaseReference,
} from 'firebase/database';
import { firebaseDb } from './firebase';
import type { UserRole } from '../types';
import type { PermKey } from '../store';

/* ─── HELPER: Get reference ─── */
function dbRef(path: string): DatabaseReference {
  return ref(firebaseDb, path);
}

/* ─── HELPER: Read once ─── */
async function readOnce<T>(path: string): Promise<T | null> {
  const snapshot = await get(dbRef(path));
  return snapshot.exists() ? snapshot.val() as T : null;
}

/* ─── HELPER: Write data ─── */
async function write(path: string, data: any): Promise<void> {
  await set(dbRef(path), data);
}

/* ─── HELPER: Update data ─── */
async function patch(path: string, data: Record<string, any>): Promise<void> {
  await update(dbRef(path), data);
}

export { patch as update };

/* ─── HELPER: Multi-path update ─── */
export async function updateMultiple(updates: Record<string, any>): Promise<void> {
  await update(ref(firebaseDb), updates);
}

/* ─── HELPER: Delete ─── */
async function deleteData(path: string): Promise<void> {
  await remove(dbRef(path));
}

/* ─── HELPER: Real-time listener ─── */
export function onDataChange<T>(path: string, callback: (data: T | null) => void): () => void {
  const unsub = onValue(dbRef(path), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() as T : null);
  });
  return unsub;
}

/* ════════════════════════════════════════════
   SEEDING
   ════════════════════════════════════════════ */

export async function isSeeded(): Promise<boolean> {
  const users = await readOnce('/users');
  return users !== null;
}

export async function seedAll(seedData: {
  users: any[];
  roles: any;
  legalSections: any[];
  judgments: any[];
  cases: any[];
  evidence: any[];
  documents: any[];
  diaryEntries: Record<string, any[]>;
  auditLogs: any[];
  notifications: any[];
  settings: any;
}): Promise<void> {
  const updates: Record<string, any> = {};

  // Users
  for (const user of seedData.users) {
    updates[`/users/${user.id}`] = user;
  }

  // Roles
  updates['/roles'] = seedData.roles;

  // Legal Sections (as array → object map by id)
  for (const section of seedData.legalSections) {
    updates[`/legalSections/${section.id}`] = section;
  }

  // Judgments
  for (const judgment of seedData.judgments) {
    updates[`/judgments/${judgment.id}`] = judgment;
  }

  // Cases
  for (const c of seedData.cases) {
    updates[`/cases/${c.id}`] = c;
  }

  // Evidence
  for (const ev of seedData.evidence) {
    updates[`/evidence/${ev.id}`] = ev;
  }

  // Documents
  for (const doc of seedData.documents) {
    updates[`/documents/${doc.id}`] = doc;
  }

  // Diary entries (nested by case)
  for (const [caseId, entries] of Object.entries(seedData.diaryEntries)) {
    for (const entry of entries) {
      updates[`/diaryEntries/${caseId}/${entry.id}`] = entry;
    }
  }

  // Audit Logs
  for (const log of seedData.auditLogs) {
    updates[`/auditLogs/${log.id}`] = log;
  }

  // Notifications
  for (const notif of seedData.notifications) {
    updates[`/notifications/${notif.id}`] = notif;
  }

  // Settings
  updates['/settings'] = seedData.settings;

  // Single atomic write
  await update(ref(firebaseDb), updates);
}

/* ════════════════════════════════════════════
   USERS
   ════════════════════════════════════════════ */

export async function getAllUsers(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/users')) || {};
}

export async function getUser(id: string): Promise<any | null> {
  return readOnce(`/users/${id}`);
}

export async function createUser(user: any): Promise<void> {
  await write(`/users/${user.id}`, user);
}

export async function updateUser(id: string, updates: Record<string, any>): Promise<void> {
  await patch(`/users/${id}`, updates);
}

export async function deleteUser(id: string): Promise<void> {
  await deleteData(`/users/${id}`);
}

export async function getUserByEmail(email: string): Promise<any | null> {
  const users = await getAllUsers();
  return Object.values(users).find((u: any) => u.email === email) || null;
}

/* ════════════════════════════════════════════
   ROLES & PERMISSIONS
   ════════════════════════════════════════════ */

export async function getRoles(): Promise<Record<string, any> | null> {
  return readOnce<Record<string, any>>('/roles');
}

export async function updateRolePermissions(role: UserRole, permissions: Record<PermKey, boolean>): Promise<void> {
  await write(`/roles/${role}/permissions`, permissions);
}

export async function setAllRoles(roles: Record<string, any>): Promise<void> {
  await write('/roles', roles);
}

/* ════════════════════════════════════════════
   CASES
   ════════════════════════════════════════════ */

export async function getAllCases(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/cases')) || {};
}

export async function getCase(id: string): Promise<any | null> {
  return readOnce(`/cases/${id}`);
}

export async function createCase(caseData: any): Promise<void> {
  await write(`/cases/${caseData.id}`, caseData);
}

export async function updateCase(id: string, updates: Record<string, any>): Promise<void> {
  await patch(`/cases/${id}`, updates);
}

export async function deleteCase(id: string): Promise<void> {
  await deleteData(`/cases/${id}`);
}

/* ════════════════════════════════════════════
   EVIDENCE
   ════════════════════════════════════════════ */

export async function getAllEvidence(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/evidence')) || {};
}

export async function getEvidence(id: string): Promise<any | null> {
  return readOnce(`/evidence/${id}`);
}

export async function createEvidence(evidence: any): Promise<void> {
  await write(`/evidence/${evidence.id}`, evidence);
}

export async function updateEvidence(id: string, updates: Record<string, any>): Promise<void> {
  await patch(`/evidence/${id}`, updates);
}

export async function deleteEvidence(id: string): Promise<void> {
  await deleteData(`/evidence/${id}`);
}

export async function addChainOfCustodyEntry(evidenceId: string, entry: any): Promise<void> {
  const ev = await readOnce<any>(`/evidence/${evidenceId}`);
  if (!ev) return;
  const chain = ev.chainOfCustody || [];
  chain.push(entry);
  await patch(`/evidence/${evidenceId}`, { chainOfCustody: chain });
}

/* ════════════════════════════════════════════
   DOCUMENTS
   ════════════════════════════════════════════ */

export async function getAllDocuments(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/documents')) || {};
}

export async function getDocument(id: string): Promise<any | null> {
  return readOnce(`/documents/${id}`);
}

export async function createDocument(doc: any): Promise<void> {
  await write(`/documents/${doc.id}`, doc);
}

export async function updateDocument(id: string, updates: Record<string, any>): Promise<void> {
  await patch(`/documents/${id}`, updates);
}

/* ════════════════════════════════════════════
   DIARY ENTRIES
   ════════════════════════════════════════════ */

export async function getAllDiaryEntries(): Promise<Record<string, Record<string, any>>> {
  return (await readOnce<Record<string, Record<string, any>>>('/diaryEntries')) || {};
}

export async function getDiaryEntries(caseId: string): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>(`/diaryEntries/${caseId}`)) || {};
}

export async function addDiaryEntry(caseId: string, entry: any): Promise<void> {
  await write(`/diaryEntries/${caseId}/${entry.id}`, entry);
}

/* ════════════════════════════════════════════
   AUDIT LOGS
   ════════════════════════════════════════════ */

export async function getAllAuditLogs(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/auditLogs')) || {};
}

export async function addAuditLog(log: any): Promise<void> {
  await write(`/auditLogs/${log.id}`, log);
}

/* ════════════════════════════════════════════
   NOTIFICATIONS
   ════════════════════════════════════════════ */

export async function getNotifications(userId: string): Promise<any[]> {
  const all = await readOnce<Record<string, any>>('/notifications');
  if (!all) return [];
  return Object.values(all).filter((n: any) => n.userId === userId);
}

export async function addNotification(notif: any): Promise<void> {
  await write(`/notifications/${notif.id}`, notif);
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await patch(`/notifications/${notifId}`, { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const all = await readOnce<Record<string, any>>('/notifications');
  if (!all) return;
  const updates: Record<string, any> = {};
  for (const [id, n] of Object.entries(all)) {
    if ((n as any).userId === userId && !(n as any).read) {
      updates[`/notifications/${id}/read`] = true;
    }
  }
  await update(ref(firebaseDb), updates);
}

/* ════════════════════════════════════════════
   LEGAL SECTIONS
   ════════════════════════════════════════════ */

export async function getAllLegalSections(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/legalSections')) || {};
}

/* ════════════════════════════════════════════
   JUDGMENTS
   ════════════════════════════════════════════ */

export async function getAllJudgments(): Promise<Record<string, any>> {
  return (await readOnce<Record<string, any>>('/judgments')) || {};
}

/* ════════════════════════════════════════════
   SETTINGS
   ════════════════════════════════════════════ */

export async function getSettings(): Promise<any | null> {
  return readOnce('/settings');
}

export async function updateSettings(updates: Record<string, any>): Promise<void> {
  await patch('/settings', updates);
}
