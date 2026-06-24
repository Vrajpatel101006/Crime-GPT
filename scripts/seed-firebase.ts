/* ============================================
   CRIMEGPT 2.0 — FIREBASE MIGRATION SCRIPT
   ============================================
   One-time seeding of system-level data.
   Run this ONCE before deploying the app.
   
   Usage: npx tsx scripts/seed-firebase.ts
   ============================================ */

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import { 
  SEED_LEGAL_SECTIONS, SEED_JUDGMENTS, SEED_ROLES, 
  SEED_USERS, SEED_SETTINGS 
} from '../src/data/seed';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
  console.error('[Migration] Error: Missing Firebase configuration.');
  console.error('[Migration] Please ensure .env file contains all VITE_FIREBASE_* variables.');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function seed(): Promise<void> {
  console.log('[Migration] Starting Firebase seeding...');
  console.log('[Migration] Connected to:', firebaseConfig.databaseURL);
  
  try {
    // Seed legal sections
    const sectionsMap = Object.fromEntries(SEED_LEGAL_SECTIONS.map(s => [s.id, s]));
    await set(ref(db, '/legalSections'), sectionsMap);
    console.log(`[Migration] ✓ Seeded ${SEED_LEGAL_SECTIONS.length} legal sections`);
    
    // Seed judgments
    const judgmentsMap = Object.fromEntries(SEED_JUDGMENTS.map(j => [j.id, j]));
    await set(ref(db, '/judgments'), judgmentsMap);
    console.log(`[Migration] ✓ Seeded ${SEED_JUDGMENTS.length} judgments`);
    
    // Seed roles
    await set(ref(db, '/roles'), SEED_ROLES);
    console.log('[Migration] ✓ Seeded 4 roles (io/sho/legal/admin)');
    
    // Seed settings
    await set(ref(db, '/settings'), SEED_SETTINGS);
    console.log('[Migration] ✓ Seeded system settings');
    
    // Seed users (as data, NOT Firebase Auth users)
    const usersMap = Object.fromEntries(SEED_USERS.map(u => [u.id, u]));
    await set(ref(db, '/users'), usersMap);
    console.log(`[Migration] ✓ Seeded ${SEED_USERS.length} users`);
    
    // Initialize empty structures for user-generated data
    await set(ref(db, '/cases'), {});
    await set(ref(db, '/evidence'), {});
    await set(ref(db, '/documents'), {});
    await set(ref(db, '/diaryEntries'), {});
    await set(ref(db, '/auditLogs'), {});
    await set(ref(db, '/notifications'), {});
    await set(ref(db, '/workflowEvents'), {});
    await set(ref(db, '/userStates'), {});
    console.log('[Migration] ✓ Initialized empty data structures for user-generated data');
    
    console.log('');
    console.log('[Migration] ✅ All data seeded successfully!');
    console.log('[Migration] Summary:');
    console.log(`  - Legal Sections: ${SEED_LEGAL_SECTIONS.length}`);
    console.log(`  - Judgments: ${SEED_JUDGMENTS.length}`);
    console.log(`  - Roles: 4`);
    console.log(`  - Settings: 14`);
    console.log(`  - Users: ${SEED_USERS.length}`);
    console.log(`  - Empty structures: 8 (cases, evidence, documents, etc.)`);
    console.log('');
    console.log('[Migration] You can now start the app. No runtime seeding will occur.');
    
  } catch (error) {
    console.error('[Migration] ❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Execute seeding
seed();
