# CrimeGPT 2.0

**AI-Powered Crime Documentation & Legal Intelligence Platform**
*Gujarat Police Cyber Crime Division*

**Problem Statement ID:** KANADSHIELD26_P2_06
**Domain:** Legal Intelligence & Automation

---

CrimeGPT 2.0 is an AI-powered investigation, documentation, and legal intelligence platform built for Indian law enforcement. It eliminates redundant data entry across legal documents, auto-generates court-ready documents from a unified case data pool, and provides real-time legal section mapping using the **Bharatiya Nyaya Sanhita (BNS) 2023**, **Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023**, and **Bharatiya Sakshya Adhiniyam (BSA) 2023** — with **IPC, CrPC, and Indian Evidence Act legacy cross-references** on every applicable section.

---

## Features

### 1. Unified Case Data Pool
Single entry of victim details, accused information, incident facts, seized items, and witness statements — reused automatically across all generated documents. All entries are editable and traceable with a full audit trail.

### 2. Document Generation Engine (10 Document Types)
Auto-generates court-ready documents from case data with format compliance to Indian criminal procedure standards:

| Document | Description |
|----------|-------------|
| FIR | First Information Report |
| Chargesheet | Final report under BNSS Sec 193 |
| Purvani Chargesheet | Preliminary report under BNSS Sec 176 |
| Remand Request | Accused custody application |
| Seizure Receipt | Property/evidence seizure record |
| Medical Treatment Letter | Medical examination requisition |
| Court Custody Application | Judicial custody request |
| Panchanama | Scene inspection record |
| Face ID Form | Identification parade form |
| LERS Request | Law Enforcement Request to Meta/platforms |

### 3. Case Diary Automation
Timeline-based digital case diary maintained from FIR registration through arrest. Every investigative step — complaint receipt, evidence upload, witness examination, arrest, legal review — is logged with timestamp, performing officer, and category. Auto-generates case readiness scores.

### 4. Legal Section Intelligence
AI-powered module (Groq Llama 3.3 70B) that analyzes complaint narratives and recommends applicable legal sections with confidence scores:

- **105 sections** across 7 Acts: BNS (56), BNSS (14), BSA (11), IT Act (16), DPDP Act (7), POCSO (4), NDPS (3)
- **Legacy cross-references:** Every applicable BNS/BNSS/BSA section displays its predecessor IPC/CrPC/IEA section (e.g., BNS 318 → IPC 415, 420)
- **Landmark judgments:** AI retrieves relevant Supreme Court and High Court precedents with citation and relevance summary
- **Semantic matching:** Concept thesaurus, stemmed word matching, Levenshtein fuzzy matching, and LLM-based section ranking

### 5. Evidence Management
- SHA-256 hash verification on upload for tamper-proof integrity
- Full chain-of-custody tracking (uploaded, viewed, downloaded, approved, shared)
- Evidence tagging and entity extraction from uploaded files

### 6. 6-Layer Security Architecture
Based on Gujarat Police hierarchy and BNSS 2023 provisions:

| Layer | Feature | BNSS Basis |
|-------|---------|------------|
| 1 | Case Ownership | Sec 175, 192 |
| 2 | Station Isolation | Sec 179, 185 |
| 3 | Hierarchical Access (DGP → PC) | Gujarat Police Manual |
| 4 | Data Classification (Public/Confidential/Secret) | Sec 192(5) |
| 5 | Clearance Levels (SP assignment) | Station-level control |
| 6 | Cross-Station Access Requests (Zero FIR) | BNSS protocol |

### 7. Role-Based Access Control

| Role | Access |
|------|--------|
| Investigation Officer (IO) | Create cases, upload evidence, generate documents, maintain diary |
| Station House Officer (SHO) | Approve cases, supervise IOs, station-wide oversight |
| Legal Advisor | Legal review queue, section validation, chargesheet approval |
| Administrator (SP+) | Full system access, user management, audit logs, all stations |

### 8. Additional Features
- **Offline-first support** — works in low-network police station environments
- **Audit logs** — tamper-proof action trail across all users and cases
- **Investigation readiness scoring** — automated case completeness percentage
- **Matrix rain login screen** — cybersecurity-themed authentication UI
- **Real-time Firebase sync** — multi-device case collaboration

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Custom CSS (Government design system) |
| Backend/DB | Firebase Realtime Database + Auth |
| AI/LLM | Groq (Llama 3.3 70B Versatile) |
| Deployment | Vercel |
| Legal Data | BNS 2023, BNSS 2023, BSA 2023, IT Act 2000, DPDP Act 2023, POCSO 2012, NDPS 1985 |

---

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Firebase project with Realtime Database enabled
- Groq API key ([https://console.groq.com](https://console.groq.com))

### Installation

```bash
git clone https://github.com/progammer24052025-png/Crime-GPT.git
cd Crime-GPT
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Groq AI (optional — falls back to keyword simulator without it)
VITE_GROQ_API_KEY=your_groq_api_key
```

### Run

```bash
npm run dev
# Visit http://localhost:5173
```

### Demo Credentials
The app auto-seeds demo users on first load. Use the role switcher in the top bar to switch between IO, SHO, Legal, and Admin roles.

---

## Project Structure

```
src/
  pages/         # Dashboard, Cases, Evidence, LegalIntel, CaseDiary, Documents, Review, AuditLogs, Admin
  services/      # ai.ts (Groq LLM), auth.ts (Firebase Auth), db.ts (Realtime DB), firebase.ts
  store/         # Central state management, Firebase sync, fallback simulators
  data/          # seed.ts (105 legal sections, judgments, demo cases, users)
  types/         # TypeScript interfaces for all domain objects
  components/    # MatrixRain canvas animation
```

---

## Future Scope

The following enhancements are planned but not yet implemented:

1. **True Vector Search** — ChromaDB embeddings for semantic legal section similarity (currently uses keyword + concept thesaurus + LLM ranking)
2. **Expanded Entity Extraction Types** — Type-safe support for aadhaar, PAN, URL, organization, document, vulnerability, and data volume entities (currently functional at runtime but not in the TypeScript type union)
3. **React Error Boundaries** — Graceful crash recovery per-route instead of full-page white screen
4. **Automated Test Suite** — Unit tests for AI service, integration tests for store, component tests for all pages
5. **bns-144 Seed Correction** — Section number verification and correction against official BNS 2023 text
6. **SecurityAuditLog Implementation** — Dedicated security event log for access grants, denials, and classification changes (type defined, not yet wired)
7. **CCTNS / BharatPol Mock API Integration** — Linkage to national crime database for cross-reference
8. **Multilingual Full Support** — Gujarati and Hindi narrative processing (currently English-first with extraction support for all languages)
9. **MinIO Object Storage Integration** — S3-compatible self-hosted storage with Object Locking (WORM) for court-admissible evidence immutability and legal hold compliance. Requires a Node.js backend API server for presigned URL generation and Docker deployment. Not suitable for current serverless architecture without adding a backend tier.
10. **Cloudflare R2 Object Storage** — S3-compatible cloud storage with no egress fees and generous free tier (10 GB storage, 10M reads/month). Closer fit for serverless Vercel architecture than MinIO, with presigned URLs achievable via Cloudflare Workers (free tier). Target for production-grade evidence file storage.

---

## License

Proprietary — intended for authorized law enforcement personnel only.
**Problem Statement:** KANADSHIELD26_P2_06 | GSFC University / KANAD Shield 2026
