/* ============================================
   CRIMEGPT 2.0 — FIREBASE AUTH SERVICE
   ============================================ */

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import type { UserRole } from '../types';

/* ─── EMAIL TO USER ID MAPPING ─── */
const EMAIL_TO_USER: Record<string, string> = {
  'rajesh.patel@gujpol.gov.in': 'io1',
  'vikram.singh@gujpol.gov.in': 'sho1',
  'priya.sharma@gujpol.gov.in': 'legal1',
  'suresh.kumar@gujpol.gov.in': 'admin1',
};

const ROLE_TO_EMAIL: Record<UserRole, string> = {
  io: 'rajesh.patel@gujpol.gov.in',
  sho: 'vikram.singh@gujpol.gov.in',
  legal: 'priya.sharma@gujpol.gov.in',
  admin: 'suresh.kumar@gujpol.gov.in',
};

export const DEMO_PASSWORDS: Record<UserRole, string> = {
  io: 'police123',
  sho: 'sho123',
  legal: 'legal123',
  admin: 'admin123',
};

export const DEMO_CREDENTIALS = [
  { role: 'io' as UserRole, label: 'Investigation Officer', name: 'Insp. Rajesh Patel', email: ROLE_TO_EMAIL.io, password: DEMO_PASSWORDS.io, badge: 'GP-4521' },
  { role: 'sho' as UserRole, label: 'Station House Officer', name: 'SHO Vikram Singh', email: ROLE_TO_EMAIL.sho, password: DEMO_PASSWORDS.sho, badge: 'GP-1001' },
  { role: 'legal' as UserRole, label: 'Legal Advisor', name: 'Adv. Priya Sharma', email: ROLE_TO_EMAIL.legal, password: DEMO_PASSWORDS.legal, badge: 'LA-0201' },
  { role: 'admin' as UserRole, label: 'Administrator', name: 'Admin Suresh Kumar', email: ROLE_TO_EMAIL.admin, password: DEMO_PASSWORDS.admin, badge: 'AD-0001' },
];

export function verifyDemoCredentials(email: string, password: string, role: UserRole): boolean {
  const normalized = email.trim().toLowerCase();
  return getEmailFromRole(role).toLowerCase() === normalized && password === DEMO_PASSWORDS[role];
}

/* ─── ENSURE DEMO USERS EXIST IN FIREBASE AUTH ─── */
// export async function ensureDemoAuthUsers(): Promise<void> {
//   // Check if demo users have already been created (one-time setup)
//   if (localStorage.getItem('crimegpt_demo_users_created')) {
//     return; // Already created on a previous run
//   }

  console.log('[CrimeGPT] First-time setup: Creating demo auth users...');
  
  for (const role of Object.keys(ROLE_TO_EMAIL) as UserRole[]) {
    const email = getEmailFromRole(role);
    const password = DEMO_PASSWORDS[role];
    try {
      const result = await firebaseCreateUser(email, password);
      if (result.success) {
        await firebaseLogout();
      }
      // Silently ignore "email-already-in-use" errors - users already exist
    } catch {
      // Ignore errors - users will be created on demand or already exist
    }
  }

  // Mark demo users as created (won't run again)
  localStorage.setItem('crimegpt_demo_users_created', 'true');
  console.log('[CrimeGPT] Demo users setup complete');


/* ─── LOGIN ─── */
export async function firebaseLogin(email: string, password: string): Promise<{ success: boolean; uid?: string; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return { success: true, uid: cred.user.uid };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return { success: false, error: 'Invalid email or password.' };
    }
    if (code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many failed attempts. Please try again later.' };
    }
    return { success: false, error: err?.message || 'Login failed. Please try again.' };
  }
}

/* ─── LOGOUT ─── */
export async function firebaseLogout(): Promise<void> {
  await signOut(firebaseAuth);
}

/* ─── AUTH STATE LISTENER ─── */
export function onFirebaseAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  const unsub = onAuthStateChanged(firebaseAuth, callback);
  return unsub;
}

/* ─── CREATE USER IN FIREBASE AUTH ─── */
export async function firebaseCreateUser(email: string, password: string): Promise<{ success: boolean; uid?: string; error?: string; code?: string }> {
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    return { success: true, uid: cred.user.uid };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create user.', code: err?.code };
  }
}

/* ─── GET CURRENT FIREBASE USER ─── */
export function getCurrentFirebaseUser(): FirebaseUser | null {
  return firebaseAuth.currentUser;
}

/* ─── HELPERS ─── */
export function getUserIdFromEmail(email: string): string | null {
  return EMAIL_TO_USER[email] || null;
}

export function getEmailFromRole(role: UserRole): string {
  return ROLE_TO_EMAIL[role];
}
