# CrimeGPT 2.0 — Current Implementation Flow

**Problem Statement ID:** KANADSHIELD26_P2_06  
**Domain:** Legal Intelligence & Automation  
**Target:** Gujarat Police Cyber Crime Division  

---

## System Architecture

```
Browser (React 19 SPA)
  ├── App.tsx — Route guard, role switcher, auth state, realtime listeners
  ├── Store (store/index.ts) — Central state, Firebase sync, AI engine
  ├── Services
  │   ├── ai.ts — Groq LLM (Llama 3.3 70B) integration
  │   ├── auth.ts — Firebase Auth wrapper
  │   ├── db.ts — Firebase Realtime DB CRUD
  │   └── firebase.ts — Firebase SDK init
  ├── Data (seed.ts) — 105 legal sections, 33 judgments, demo cases
  └── Pages — Dashboard, Cases, Evidence, LegalIntel, CaseDiary, Documents, Review, AuditLogs, Admin
```

**State management:** No Redux/Zustand. Module-level variables in `store/index.ts` act as the cache. Firebase Realtime DB listeners push updates → `hydrateX()` functions rebuild the cache → listener callbacks trigger re-renders in subscribed components.

---

## 1. Authentication & Initialization Flow

```
App loads
  → initializeStore() called
    → ensureDemoAuthUsers() — creates demo Firebase Auth accounts if missing
    → db.isSeeded() check
      → If not seeded: writes all seed data to Firebase, logs "[CrimeGPT] Seed complete"
    → Reads all data from Firebase in parallel (users, roles, cases, evidence, documents, legalSections, judgments, auditLogs, settings, diaryEntries)
    → mergeDiaryEntriesIntoCases() — merges /diaryEntries/ path into case objects
    → Hydrates all local caches (hydrateUsers, hydrateRoles, hydrateCases, etc.)
    → Auto-seed check: any sections/judgments in SEED but not in Firebase → batch-write them
    → setupRealtimeListeners() — 8 onDataChange listeners for live sync
    → _isInitialized = true
  → If not authenticated: render <Login />
  → If authenticated: render <AppShell /> with routes
```

**Login flow:**
```
User enters email + password + selects role
  → login() in store
    → Normalize email, check if email matches selected role's expected email
    → firebaseLogin(email, password)
      → If Firebase Auth fails → fallback to verifyDemoCredentials() (offline demo mode)
    → Check _userStates[userId].suspendedUntil → block if suspended
    → Check _userStates[userId].active → block if deactivated
    → Update lastLogin timestamp in Firebase
    → _isAuthenticated = true, _currentRole = role
    → Navigate to Dashboard
```

---

## 2. Case Creation Flow (Cases.tsx — 4-step wizard)

### Step 1: Narrative Input
```
Officer pastes/types complaint narrative (e.g., crypto fraud complaint)
  → "Analyze with AI" button clicked
    → simulateEntityExtraction(narrative) called in store
      → If Groq AI configured:
        → analyzeComplaint(narrative) → Groq LLM call with ANALYSIS_SYSTEM_PROMPT
        → Returns: crimeType, victim, accused, incident, entities[], witnesses, evidence[], summary, severity
        → Builds Record<string, string> entities map from ai.entities + structured fields
      → If AI fails or not configured:
        → _simulateEntityExtractionFallback(text) — regex-based extraction
    → State updated: narrative, entities, crimeType, aiPowered flag
    → Step advances to Step 2
```

### Step 2: AI Analysis Review
```
AI results displayed:
  → Crime Classification card (crimeType from AI)
  → Extracted Entities badges (phone, amount, name, date, UPI, bank account, etc.)
  → simulateLegalAnalysis(narrative) called
    → If Groq AI configured:
      → suggestLegalSections(narrative, sections) in ai.ts
        1. Semantic pre-filtering:
           - Narrative lowercased, words extracted, stems computed
           - CONCEPT_THESAURUS (35 concepts: fraud, hacking, theft, etc.) matched against narrative
           - semanticScore() per section: concept matches (+10), synonym cross-matches (+7), stemmed matches (+6), fuzzy typos (+4), direct phrases (+5/+8), title words (+2)
        2. Top 20 scored sections selected
        3. General fallback sections added: bns-318, bns-336, bns-351, bns-61, it-66, it-66d
        4. Compact catalog built: "[ID:bns-318] BNS-318: Cheating | Keywords: fraud, deception..."
        5. Groq LLM call with LEGAL_SYSTEM_PROMPT + catalog + narrative
        6. LLM returns max 6 suggestions with sectionId, confidence, reasoning, matchedKeywords
        7. Each suggestion verified against full section database
      → findJudgments(crimeType, sectionIds) — Groq call for landmark case law
    → If AI fails:
      → _simulateLegalAnalysisFallback(narrative) — keyword matching with random confidence jitter
    → State updated: suggestions[], judgments[]
  → Officer reviews suggestions, clicks "Proceed to Step 3"
```

### Step 3: Case Details Form
```
Auto-populated fields from AI analysis:
  → Victim: name, fatherName, age, gender, address, mobile, email
  → Accused: name, fatherName, age, gender, address, mobile, description
  → Incident: date, time, location, description
  → FIR number (auto-generated from settings.firPrefix + counter)
  → Case number (auto-generated)
  → Police station (from current user's station)
  → Assigned officer (current user)
  → Legal sections (from AI suggestions → legalSectionIds)
  → Classification (officer selects: public/confidential/secret)
  → Officer edits/validates all fields → clicks "Create Case"
    → addCase(caseRecord) in store
      → Apply security defaults: assignedStation, classification, clearanceRequired
      → db.createCase(secureCase) — writes to Firebase
      → addAuditLog('CREATE_CASE', ...) — tamper-proof log entry
```

### Step 4: Confirmation
```
Case created confirmation screen
  → Case summary displayed
  → Links to: View Case, Generate Documents, Upload Evidence
```

---

## 3. Legal Intelligence Flow (LegalIntel.tsx — 3 tabs)

### Tab 1: AI Analysis
```
Officer pastes narrative → "Analyze with AI"
  → simulateLegalAnalysis(narrative) — same flow as Step 2 above
  → Results rendered as suggestion cards:
    → Act badge (BNS/BNSS/BSA/IT Act) + section number
    → Section title
    → AI reasoning (why this section applies)
    → Matched keyword badges
    → Punishment text (if defined)
    → Legacy reference: "📜 Replaces: IPC 415, 420" (if defined)
    → Confidence percentage + confidence bar
  → Landmark judgments rendered below suggestions
    → Case title, court, year, citation
    → Summary + relevance explanation
```

### Tab 2: Legal Sections Browser
```
All 105 sections displayed (searchable)
  → Filter by: section number, title, act, keyword
  → SectionCard (expandable):
    → Badge (act + section number), title
    → Description, keywords, crime types, evidence required
    → Punishment, legacy reference (IPC/CrPC/IEA cross-ref)
    → Related sections links
```

### Tab 3: Judgments
```
33 landmark judgments displayed
  → Each shows: title, court, year, citation, summary
  → Relevant section badges (linked to section browser)
```

---

## 4. Document Generation Flow (Documents.tsx)

```
Officer selects case from dropdown
  → Case data loaded (victim, accused, incident, legalSections, evidence)
  → Document type selector (10 types):
    fir, remand_request, chargesheet, purvani_chargesheet, seizure_receipt,
    medical_letter, court_custody, panchanama, face_id_form, lers_request

  → Officer clicks "Generate"
    → generateDocument(type, caseData) called
    → Template function builds HTML document content using case fields
    → Content includes: FIR number, station name, date, victim/accused details,
      incident narrative, legal sections (with titles), evidence list, officer details
    → GeneratedDocument record created:
      { id, caseId, type, title, content (HTML), generatedAt, generatedBy, status: 'draft', validationErrors: [], version: 1 }
    → addDocument(doc) → db.createDocument(doc) → Firebase
    → Document preview rendered in right panel

  → Officer edits content in WYSIWYG editor (contentEditable div)
  → "Validate" button → checks for required fields, missing dates, section count
  → "Approve" → status: 'approved'
  → "Export" → opens print dialog / downloads as HTML file
```

**Document format compliance:**
- All documents follow Indian criminal procedure format (BNSS 2023 structure)
- FIR follows BNSS Sec 173 format
- Chargesheet follows BNSS Sec 193 format
- Purvani Chargesheet follows BNSS Sec 176 (preliminary report)
- Remand Request references BNSS Sec 187

---

## 5. Evidence Management Flow (Evidence.tsx)

```
Officer selects case → "Upload Evidence"
  → File input (any format: images, PDFs, videos, documents)
  → On file select:
    1. Read file as ArrayBuffer
    2. Compute SHA-256 hash via crypto.subtle.digest('SHA-256', buffer)
    3. Convert to hex string
    4. Build Evidence record:
       { id, caseId, fileName, fileType, fileSize, uploadedAt, uploadedBy,
         sha256Hash, tags: [], mimeType, extractedEntities: [], chainOfCustody: [] }
    5. addEvidence(evidence) → db.createEvidence(evidence) → Firebase
    6. addAuditLog('UPLOAD_EVIDENCE', ...)

  → Evidence list displayed with:
    → File name, type badge, size, upload date
    → Hash display (monospace, copyable)
    → "Verified" badge (hash matches stored hash)

  → Chain of custody:
    → Every view/download/approve action adds CustodyEntry to chainOfCustody array
    → { action, userId, userName, timestamp }
    → Displayed as timeline below evidence card
```

---

## 6. Case Diary Flow (CaseDiary.tsx)

```
Officer selects case from dropdown
  → Case diary entries displayed as chronological timeline
  → Categories: complaint, evidence, witness, arrest, legal, document, review, other

  → "Add Entry" form:
    → Category dropdown
    → Action description (e.g., "Witness statement recorded")
    → Detailed description
    → Performed by (current officer name)
    → Submit → addDiaryEntry(caseId, entry)
      → Pushes to _cases[caseId].diaryEntries
      → Writes to BOTH Firebase paths:
        /diaryEntries/${caseId}/${entryId}  (separate path for realtime listener)
        /cases/${caseId}/diaryEntries        (embedded in case object)
      → addAuditLog('DIARY_ENTRY', caseId, entry.action)

  → Readiness Score calculation:
    → Based on: has victim details (+15), has accused (+15), has incident date (+10),
      has location (+10), has legal sections (+15), has evidence (+15),
      has diary entries (+10), has documents (+10)
    → Score 0-100% displayed as progress bar
```

---

## 7. Review & Approval Flow (Review.tsx)

```
SHO/Legal/Admin accesses Review page
  → Filtered cases by reviewStatus: pending_sho (for SHO), pending_legal (for Legal)

  → Officer selects case → full case details displayed:
    → FIR info, victim/accused, incident, evidence list, legal sections, diary entries, documents

  → Review actions:
    → "Approve" → updateCase(id, { reviewStatus: 'approved' })
      → If SHO approves → moves to pending_legal (for Legal Advisor)
      → If Legal approves → case status: 'approved'
      → addAuditLog('APPROVE_CASE', ...)

    → "Return" → adds ReviewComment with action: 'return'
      → updateCase(id, { reviewStatus: 'returned', reviewComments: [...] })
      → Case goes back to IO for corrections
      → addAuditLog('RETURN_CASE', ...)

    → "Comment" → adds ReviewComment with action: 'comment'
      → Does not change status
```

---

## 8. Security Architecture (6 Layers)

```
Layer 1: Case Ownership (BNSS Sec 175, 192)
  → canAccessCase() checks: is user the assignedOfficer? → always allow

Layer 2: Station Isolation (BNSS Sec 179, 185)
  → Is case at user's station? → allow if classification ≠ secret
  → Cross-station? → allow only if classification = public

Layer 3: Hierarchical Access
  → SP rank or above (rankLevel ≥ 8) → can see ALL cases regardless of station
  → SHO role → can see all IO cases at same station

Layer 4: Data Classification
  → PUBLIC: freely shareable across stations
  → CONFIDENTIAL: station-level access only
  → SECRET: SP+ rank required regardless of station

Layer 5: Clearance Levels (1-5)
  → Case has clearanceRequired field
  → User has clearanceLevel from role (IO=2, SHO=3, Legal=4, Admin=5)
  → userClearance < caseClearanceRequired → deny with reason

Layer 6: Cross-Station Access Requests (Zero FIR)
  → Officer at different station needs access → createAccessRequest(caseId, reason)
  → SHO/Admin at case's station can approve/reject
  → Approved request grants access for 7 days (expiresAt)
  → All requests logged to audit trail
```

---

## 9. AI Service Architecture (ai.ts)

```
All AI calls go through callGroq() wrapper:
  → POST to https://api.groq.com/openai/v1/chat/completions
  → Model: llama-3.3-70b-versatile
  → response_format: { type: 'json_object' } — forces structured JSON output
  → Returns parsed JSON object

Three AI functions:

1. analyzeComplaint(narrative)
   → System prompt: ANALYSIS_SYSTEM_PROMPT (180 lines)
   → Rules: extract ALL entities, distinguish victim/accused, date formatting (YYYY-MM-DD),
     amount extraction (primary loss Rule 5e), entity type classification (5a-5d),
     crime classification, witnesses, evidence, summary, severity
   → Returns: AIAnalysisResult (full structured object)

2. suggestLegalSections(narrative, sections)
   → Step 1: Local semantic pre-filtering (no AI call)
     - Concept thesaurus matching (35 concepts)
     - Stemmed word matching (Porter-style stemmer)
     - Levenshtein fuzzy matching (typos)
     - Direct phrase/crimeType matching
   → Step 2: Groq LLM with LEGAL_SYSTEM_PROMPT
     - Input: narrative + top-20 pre-filtered section catalog
     - Output: max 6 suggestions with sectionId, confidence (0.0-1.0), reasoning, matchedKeywords
   → Step 3: Verification — each suggestion's sectionId verified against database
   → Returns: AILegalSuggestion[] sorted by confidence

3. findJudgments(crimeType, sectionIds)
   → System prompt: JUDGMENT_SYSTEM_PROMPT
   → LLM suggests real Indian Supreme Court/High Court judgments
   → Returns: AIJudgmentResult[] (max 4, with title, court, year, citation, summary, relevance)
```

---

## 10. Data Models Summary

| Entity | Key Fields | Count |
|--------|-----------|-------|
| CaseRecord | firNumber, victim, accused, incident, legalSectionIds, diaryEntries, readinessScore, classification, clearanceRequired | Demo: 4 cases |
| Evidence | fileName, sha256Hash, chainOfCustody, extractedEntities | Demo: 6 files |
| LegalSection | act, sectionNumber, keywords, crimeTypes, punishment, legacyReference | 105 sections |
| Judgment | title, court, year, citation, relevantSections | 33 judgments |
| GeneratedDocument | type, content (HTML), status, validationErrors, version | Demo: 5 docs |
| AuditLog | userId, action, target, details, timestamp | Auto-generated |
| User | name, role, rank, clearanceLevel, station, email | Demo: 4 users |
| AccessRequest | caseId, requestedBy, status, expiresAt | On-demand |
| DiaryEntry | caseId, action, category, performedBy, timestamp | Per case |

---

## 11. Firebase Realtime DB Structure

```
/
  users/{userId}           → User object
  userStates/{userId}      → { lastLogin, suspendedUntil, suspensionReason, active }
  roles/{roleName}         → { permissions: Record<PermKey, boolean> }
  cases/{caseId}           → Full CaseRecord with embedded diaryEntries
  diaryEntries/{caseId}/{entryId} → Separate diary entry (for realtime listener sync)
  evidence/{evidenceId}    → Evidence object with sha256Hash, chainOfCustody
  documents/{documentId}   → GeneratedDocument with HTML content
  legalSections/{sectionId} → LegalSection with legacyReference
  judgments/{judgmentId}   → Judgment with citation and relevantSections
  auditLogs/{logId}        → AuditLog entry
  accessRequests/{requestId} → Cross-station access request
  settings                 → SystemSettings (firPrefix, station, district, etc.)
```

---

*Generated: 2026 | CrimeGPT 2.0 — KANADSHIELD26_P2_06*
