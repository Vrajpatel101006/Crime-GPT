/* ============================================
   CRIMEGPT 2.0 — TYPE DEFINITIONS
   ============================================ */

export type UserRole = 'io' | 'sho' | 'legal' | 'admin';

export type PoliceRank = 
  | 'DGP' | 'Addl.DGP' | 'IG' | 'DIG' | 'SP' | 'Addl.SP' 
  | 'DySP' | 'Inspector' | 'SI' | 'ASI' | 'HC' | 'PC';

export type ClearanceLevel = 1 | 2 | 3 | 4 | 5;

export type CaseClassification = 'public' | 'confidential' | 'secret';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  rank?: PoliceRank;
  clearanceLevel?: ClearanceLevel;
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
  assignedStation: string;
  classification: CaseClassification;
  clearanceRequired: ClearanceLevel;
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
  fileData?: string;
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
  act: 'BNS' | 'BNSS' | 'BSA' | 'IT Act' | 'DPDP Act' | 'POCSO' | 'NDPS';
  sectionNumber: string;
  title: string;
  description: string;
  keywords: string[];
  crimeTypes: string[];
  evidence_required: string[];
  relatedSections: string[];
  punishment?: string;
  legacyReference?: string;
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
  | 'purvani_chargesheet'
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
  priority?: NotificationPriority;
  workflowEventId?: string;
  caseId?: string;
  firNumber?: string;
  actions?: NotificationAction[];
  escalatedFrom?: string;
  category?: NotificationCategory;
  targetRoles?: UserRole[];
  resolved?: boolean;
  resolvedAt?: string;
}

export type NotificationPriority = 'critical' | 'high' | 'normal';

export type NotificationCategory =
  | 'workflow'
  | 'approval'
  | 'escalation'
  | 'evidence'
  | 'document'
  | 'review'
  | 'security'
  | 'deadline'
  | 'gap_alert'
  | 'system';

export interface NotificationAction {
  label: string;
  type: 'approve' | 'reject' | 'request_changes' | 'view' | 'acknowledge' | 'navigate';
  payload?: string;
}

export type WorkflowEventType =
  | 'case_created'
  | 'case_assigned'
  | 'case_status_changed'
  | 'evidence_uploaded'
  | 'evidence_updated'
  | 'document_generated'
  | 'document_submitted'
  | 'document_approved'
  | 'document_rejected'
  | 'review_requested'
  | 'review_completed'
  | 'review_returned'
  | 'escalation'
  | 'gap_alert'
  | 'deadline_reminder'
  | 'security_alert'
  | 'access_request'
  | 'access_approved'
  | 'access_rejected'
  | 'user_suspended'
  | 'system_alert';

export interface EscalationRule {
  afterHours: number;
  escalateTo: UserRole[];
  message: string;
  priority: NotificationPriority;
}

export interface WorkflowEvent {
  id: string;
  eventType: WorkflowEventType;
  caseId?: string;
  firNumber?: string;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByRole: UserRole;
  targetRoles: UserRole[];
  targetUserIds?: string[];
  priority: NotificationPriority;
  title: string;
  message: string;
  safeMessage: string;
  category: NotificationCategory;
  actions?: NotificationAction[];
  escalationRules?: EscalationRule[];
  createdAt: string;
  expiresAt?: string;
  resolved?: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  linkedNotificationIds?: string[];
  metadata?: Record<string, string>;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface AccessRequest {
  id: string;
  caseId: string;
  requestedBy: string;
  requestedByRank: PoliceRank;
  requestedByStation: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface SecurityAuditLog {
  id: string;
  userId: string;
  action: 'access_granted' | 'access_denied' | 'access_requested' | 'classification_changed' | 'clearance_override';
  targetCaseId: string;
  details: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}
