/* ============================================
   CRIMEGPT 2.0 — TYPE DEFINITIONS
   ============================================ */

export type UserRole = 'io' | 'sho' | 'legal' | 'admin';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  badge: string;
  station: string;
  email: string;
  avatar?: string;
}

export type CaseStatus = 'draft' | 'active' | 'under_review' | 'approved' | 'closed' | 'returned';

export interface CaseRecord {
  id: string;
  firNumber: string;
  caseNumber: string;
  policeStation: string;
  assignedOfficer: string;
  status: CaseStatus;
  crimeType: string;
  createdAt: string;
  updatedAt: string;

  victim: PersonDetails;
  accused: PersonDetails;
  incident: IncidentDetails;

  evidenceIds: string[];
  legalSectionIds: string[];
  documentIds: string[];
  diaryEntries: DiaryEntry[];
  readinessScore: number;

  reviewStatus?: 'pending_sho' | 'pending_legal' | 'approved' | 'returned';
  reviewComments?: ReviewComment[];
}

export interface PersonDetails {
  name: string;
  fatherName?: string;
  age?: number;
  gender?: string;
  address: string;
  mobile: string;
  email?: string;
}

export interface IncidentDetails {
  date: string;
  time: string;
  location: string;
  narrative: string;
  crimeType: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  sha256Hash: string;
  tags: string[];
  extractedEntities: ExtractedEntity[];
  chainOfCustody: CustodyEntry[];
  mimeType: string;
  thumbnailUrl?: string;
}

export interface ExtractedEntity {
  type: 'phone' | 'upi' | 'bank_account' | 'email' | 'vehicle' | 'name' | 'date' | 'amount';
  value: string;
  confidence: number;
}

export interface CustodyEntry {
  action: 'uploaded' | 'viewed' | 'downloaded' | 'approved' | 'shared';
  userId: string;
  userName: string;
  timestamp: string;
}

export interface LegalSection {
  id: string;
  act: 'BNS' | 'BNSS' | 'BSA';
  sectionNumber: string;
  title: string;
  description: string;
  keywords: string[];
  crimeTypes: string[];
  evidence_required: string[];
  relatedSections: string[];
  punishment?: string;
}

export interface LegalSuggestion {
  section: LegalSection;
  confidence: number;
  reasoning: string;
  matchedKeywords: string[];
}

export interface Judgment {
  id: string;
  title: string;
  court: string;
  year: number;
  summary: string;
  relevantSections: string[];
  citation: string;
}

export interface DiaryEntry {
  id: string;
  caseId: string;
  timestamp: string;
  action: string;
  description: string;
  performedBy: string;
  category: 'complaint' | 'evidence' | 'witness' | 'arrest' | 'legal' | 'document' | 'review' | 'other';
}

export type DocumentType =
  | 'fir'
  | 'remand_request'
  | 'chargesheet'
  | 'seizure_receipt'
  | 'medical_letter'
  | 'court_custody'
  | 'panchanama'
  | 'face_id_form'
  | 'lers_request';

export interface GeneratedDocument {
  id: string;
  caseId: string;
  type: DocumentType;
  title: string;
  content: string;
  generatedAt: string;
  generatedBy: string;
  status: 'draft' | 'validated' | 'approved' | 'exported';
  validationErrors: string[];
  version: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface ReviewComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  comment: string;
  timestamp: string;
  action: 'approve' | 'return' | 'comment';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
