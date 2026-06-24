/* ============================================
   CRIMEGPT 2.0 — WORKFLOW ENGINE
   ============================================
   Smart routing, escalation, and notification
   dispatch for the investigation lifecycle.
   Branded as: CrimeGPT Alert Center
   ============================================ */

import type {
  UserRole, Notification, NotificationPriority, NotificationCategory,
  NotificationAction, WorkflowEvent, WorkflowEventType, EscalationRule, CaseRecord, User,
} from '../types';

/* ─── EVENT ID GENERATOR ─── */
function genEventId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}
function genNotifId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

/* ════════════════════════════════════════════
   ROLE ROUTING RULES
   Maps each event type to the roles that
   should receive the notification.
   ════════════════════════════════════════════ */

const ROLE_ROUTING: Record<WorkflowEventType, UserRole[]> = {
  case_created:        ['sho', 'admin'],
  case_assigned:       ['io', 'sho'],
  case_status_changed: ['io', 'sho', 'legal', 'admin'],
  evidence_uploaded:   ['io', 'sho'],
  evidence_updated:    ['io', 'sho'],
  document_generated:  ['io', 'sho'],
  document_submitted:  ['sho', 'legal'],
  document_approved:   ['io', 'sho'],
  document_rejected:   ['io', 'sho'],
  review_requested:    ['sho', 'legal'],
  review_completed:    ['io', 'sho', 'admin'],
  review_returned:     ['io', 'sho'],
  escalation:          ['sho', 'legal', 'admin'],
  gap_alert:           ['io', 'sho'],
  deadline_reminder:   ['io', 'sho'],
  security_alert:      ['admin', 'sho'],
  access_request:      ['sho', 'admin'],
  access_approved:     ['io', 'sho'],
  access_rejected:     ['io', 'sho'],
  user_suspended:      ['admin'],
  system_alert:        ['admin'],
};

/* ─── PRIORITY DEFAULTS per event type ─── */
const PRIORITY_DEFAULTS: Record<WorkflowEventType, NotificationPriority> = {
  case_created:        'normal',
  case_assigned:       'high',
  case_status_changed: 'normal',
  evidence_uploaded:   'normal',
  evidence_updated:    'normal',
  document_generated:  'normal',
  document_submitted:  'high',
  document_approved:   'high',
  document_rejected:   'high',
  review_requested:    'high',
  review_completed:    'high',
  review_returned:     'high',
  escalation:          'critical',
  gap_alert:           'high',
  deadline_reminder:   'normal',
  security_alert:      'critical',
  access_request:      'normal',
  access_approved:     'normal',
  access_rejected:     'normal',
  user_suspended:      'high',
  system_alert:        'critical',
};

/* ─── CATEGORY MAPPING ─── */
const CATEGORY_MAP: Record<WorkflowEventType, NotificationCategory> = {
  case_created:        'workflow',
  case_assigned:       'workflow',
  case_status_changed: 'workflow',
  evidence_uploaded:   'evidence',
  evidence_updated:    'evidence',
  document_generated:  'document',
  document_submitted:  'document',
  document_approved:   'document',
  document_rejected:   'document',
  review_requested:    'review',
  review_completed:    'review',
  review_returned:     'review',
  escalation:          'escalation',
  gap_alert:           'gap_alert',
  deadline_reminder:   'deadline',
  security_alert:      'security',
  access_request:      'workflow',
  access_approved:     'workflow',
  access_rejected:     'workflow',
  user_suspended:      'security',
  system_alert:        'system',
};

/* ─── DEFAULT ESCALATION RULES ─── */
export const DEFAULT_REVIEW_ESCALATION: EscalationRule[] = [
  { afterHours: 24, escalateTo: ['sho'], message: 'Review pending for 24 hours — escalate to SHO', priority: 'high' },
  { afterHours: 72, escalateTo: ['admin'], message: 'Review pending for 72 hours — escalate to senior officers', priority: 'critical' },
];

export const DEFAULT_DOCUMENT_ESCALATION: EscalationRule[] = [
  { afterHours: 24, escalateTo: ['sho'], message: 'Document approval pending for 24 hours', priority: 'high' },
  { afterHours: 48, escalateTo: ['admin'], message: 'Document approval pending for 48 hours — requires admin attention', priority: 'critical' },
];

/* ════════════════════════════════════════════
   OS MESSAGE SANITIZATION
   Strips all sensitive PII from messages
   before they leave the browser.
   Only case IDs, FIR numbers, status, and
   required actions are permitted.
   ════════════════════════════════════════════ */

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,   // Aadhaar-like 16-digit
  /\b\d{12}\b/g,                              // 12-digit numbers
  /\b\d{10}\b/g,                              // 10-digit phone numbers
  /\b\+?\d[\d\s-]{9,}\b/g,                   // Phone numbers
  /\b[\w.]+@[\w]+\.[\w.]+\b/g,               // Email addresses
  /(?:victim|witness|complainant|accused)[:\s]+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?/gi, // Named references
];

const SENSITIVE_WORDS: string[] = [
  'aadhaar', 'aadhar', 'pan card', 'passport', 'voter id',
  'address', 'resident of', 'living at', 'staying at',
];

export function sanitizeForOS(message: string): string {
  let safe = message;

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    safe = safe.replace(pattern, '[REDACTED]');
  }

  // Remove lines containing sensitive words
  const lines = safe.split('\n');
  safe = lines.filter(line => {
    const lower = line.toLowerCase();
    return !SENSITIVE_WORDS.some(word => lower.includes(word));
  }).join('\n');

  // Final cleanup — collapse multiple [REDACTED]
  safe = safe.replace(/\[REDACTED\]\s*\[REDACTED\]/g, '[REDACTED]');
  safe = safe.trim();

  return safe || 'Action required — open CrimeGPT to view details.';
}

/* ════════════════════════════════════════════
   RECIPIENT RESOLUTION
   Determines which user IDs receive a
   notification for a given workflow event.
   ════════════════════════════════════════════ */

export interface RecipientContext {
  allUsers: Record<string, User>;
  currentUser: User;
  caseRecord?: CaseRecord;
}

export function resolveRecipients(
  event: WorkflowEvent,
  ctx: RecipientContext
): string[] {
  const targetIds: string[] = [];

  // If explicit targetUserIds are set, use those
  if (event.targetUserIds && event.targetUserIds.length > 0) {
    return event.targetUserIds;
  }

  // Route based on roles
  for (const [userId, user] of Object.entries(ctx.allUsers)) {
    // Skip the triggering user — don't notify yourself
    if (userId === event.triggeredBy) continue;

    // Check if user's role is in the target roles
    if (!event.targetRoles.includes(user.role)) continue;

    // For case-related events, apply station filtering
    if (event.caseId && ctx.caseRecord) {
      const caseStation = ctx.caseRecord.assignedStation || ctx.caseRecord.policeStation;

      // IO: only if assigned to this case
      if (user.role === 'io' && ctx.caseRecord.assignedOfficer !== userId) continue;

      // SHO: only if same station
      if (user.role === 'sho' && user.station !== caseStation) continue;

      // Legal and Admin: no station restriction
    }

    targetIds.push(userId);
  }

  return targetIds;
}

/* ════════════════════════════════════════════
   NOTIFICATION GENERATION
   Converts a WorkflowEvent + recipient list
   into Notification objects ready for dispatch.
   ════════════════════════════════════════════ */

export function generateNotificationsFromEvent(
  event: WorkflowEvent,
  recipientIds: string[]
): Notification[] {
  const notifTypeMap: Record<NotificationPriority, Notification['type']> = {
    critical: 'error',
    high: 'warning',
    normal: 'info',
  };

  return recipientIds.map(() => ({
    id: genNotifId(),
    title: event.title,
    message: event.message,
    timestamp: event.createdAt,
    read: false,
    type: notifTypeMap[event.priority] || 'info',
    priority: event.priority,
    workflowEventId: event.id,
    caseId: event.caseId,
    firNumber: event.firNumber,
    actions: event.actions,
    category: event.category,
    targetRoles: event.targetRoles,
    resolved: false,
    link: event.caseId ? `/cases` : undefined,
  }));
}

/* ════════════════════════════════════════════
   WORKFLOW EVENT FACTORY
   Convenience builders for common events.
   ════════════════════════════════════════════ */

export function buildWorkflowEvent(params: {
  eventType: WorkflowEventType;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByRole: UserRole;
  caseId?: string;
  firNumber?: string;
  title: string;
  message: string;
  targetUserIds?: string[];
  actions?: NotificationAction[];
  escalationRules?: EscalationRule[];
  priority?: NotificationPriority;
  metadata?: Record<string, string>;
}): WorkflowEvent {
  const priority = params.priority || PRIORITY_DEFAULTS[params.eventType] || 'normal';
  const safeMessage = sanitizeForOS(params.message);

  return {
    id: genEventId(),
    eventType: params.eventType,
    caseId: params.caseId,
    firNumber: params.firNumber,
    triggeredBy: params.triggeredBy,
    triggeredByName: params.triggeredByName,
    triggeredByRole: params.triggeredByRole,
    targetRoles: ROLE_ROUTING[params.eventType] || ['admin'],
    targetUserIds: params.targetUserIds,
    priority,
    title: params.title,
    message: params.message,
    safeMessage,
    category: CATEGORY_MAP[params.eventType] || 'system',
    actions: params.actions,
    escalationRules: params.escalationRules,
    createdAt: new Date().toISOString(),
    resolved: false,
    linkedNotificationIds: [],
    metadata: params.metadata,
  };
}

/* ─── Common Event Builders ─── */

export function buildCaseCreatedEvent(user: User, caseRecord: CaseRecord): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'case_created',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId: caseRecord.id,
    firNumber: caseRecord.firNumber,
    title: `New Case Registered — ${caseRecord.firNumber}`,
    message: `${user.name} registered case ${caseRecord.firNumber} for ${caseRecord.crimeType} at ${caseRecord.assignedStation || caseRecord.policeStation}. Classification: ${caseRecord.classification.toUpperCase()}.`,
    priority: caseRecord.classification === 'secret' ? 'critical' : 'normal',
  });
}

export function buildCaseAssignedEvent(user: User, caseRecord: CaseRecord, assignedOfficerName: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'case_assigned',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId: caseRecord.id,
    firNumber: caseRecord.firNumber,
    title: `Case Assigned — ${caseRecord.firNumber}`,
    message: `Case ${caseRecord.firNumber} assigned to ${assignedOfficerName}. Crime type: ${caseRecord.crimeType}.`,
    targetUserIds: [caseRecord.assignedOfficer],
    priority: 'high',
    actions: [{ label: 'View Case', type: 'navigate', payload: '/cases' }],
  });
}

export function buildEvidenceUploadedEvent(user: User, caseId: string, firNumber: string, fileName: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'evidence_uploaded',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Evidence Uploaded — ${firNumber}`,
    message: `${user.name} uploaded evidence file "${fileName}" for case ${firNumber}. SHA-256 hash verified.`,
    actions: [{ label: 'View Evidence', type: 'navigate', payload: '/evidence' }],
  });
}

export function buildDocumentSubmittedEvent(user: User, caseId: string, firNumber: string, docTitle: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'document_submitted',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Document Submitted for Review — ${firNumber}`,
    message: `${user.name} submitted "${docTitle}" for case ${firNumber}. Awaiting SHO approval.`,
    priority: 'high',
    actions: [
      { label: 'Approve', type: 'approve', payload: caseId },
      { label: 'Reject', type: 'reject', payload: caseId },
      { label: 'Request Changes', type: 'request_changes', payload: caseId },
    ],
    escalationRules: DEFAULT_DOCUMENT_ESCALATION,
  });
}

export function buildReviewRequestedEvent(user: User, caseId: string, firNumber: string, reviewType: 'sho' | 'legal'): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'review_requested',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Review Required — ${firNumber}`,
    message: `${user.name} submitted case ${firNumber} for ${reviewType === 'sho' ? 'SHO' : 'Legal Advisor'} review. Action required.`,
    priority: 'high',
    actions: [
      { label: 'Review Now', type: 'navigate', payload: '/review' },
      { label: 'Approve', type: 'approve', payload: caseId },
      { label: 'Return', type: 'request_changes', payload: caseId },
    ],
    escalationRules: DEFAULT_REVIEW_ESCALATION,
  });
}

export function buildReviewCompletedEvent(user: User, caseId: string, firNumber: string, action: 'approved' | 'returned', comment: string): WorkflowEvent {
  const isApproved = action === 'approved';
  return buildWorkflowEvent({
    eventType: isApproved ? 'review_completed' : 'review_returned',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Case ${isApproved ? 'Approved' : 'Returned'} — ${firNumber}`,
    message: `${user.name} (${user.role.toUpperCase()}) ${isApproved ? 'approved' : 'returned'} case ${firNumber}. ${comment ? `Comment: ${comment}` : ''}`,
    priority: 'high',
    actions: [{ label: 'View Case', type: 'navigate', payload: '/cases' }],
  });
}

export function buildDocumentApprovedEvent(user: User, caseId: string, firNumber: string, docTitle: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'document_approved',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Document Approved — ${firNumber}`,
    message: `${user.name} approved "${docTitle}" for case ${firNumber}. Document is now court-ready.`,
    priority: 'high',
    actions: [{ label: 'View Document', type: 'navigate', payload: '/documents' }],
  });
}

export function buildDocumentRejectedEvent(user: User, caseId: string, firNumber: string, docTitle: string, reason: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'document_rejected',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Document Rejected — ${firNumber}`,
    message: `${user.name} rejected "${docTitle}" for case ${firNumber}. ${reason ? `Reason: ${reason}` : ''}`,
    priority: 'high',
    actions: [{ label: 'View Document', type: 'navigate', payload: '/documents' }],
  });
}

export function buildEscalationEvent(
  originalEvent: WorkflowEvent,
  rule: EscalationRule,
  hoursElapsed: number
): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'escalation',
    triggeredBy: 'system',
    triggeredByName: 'CrimeGPT System',
    triggeredByRole: 'admin',
    caseId: originalEvent.caseId,
    firNumber: originalEvent.firNumber,
    title: `Escalation — ${originalEvent.title}`,
    message: `${rule.message}. Original event has been pending for ${Math.round(hoursElapsed)} hours. Case: ${originalEvent.firNumber || 'N/A'}.`,
    priority: rule.priority,
    actions: [{ label: 'Take Action', type: 'navigate', payload: originalEvent.caseId ? '/review' : '/cases' }],
    metadata: { originalEventId: originalEvent.id, escalatedAfterHours: String(hoursElapsed) },
  });
}

export function buildGapAlertEvent(user: User, caseId: string, firNumber: string, gapDescription: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'gap_alert',
    triggeredBy: user.id,
    triggeredByName: user.name,
    triggeredByRole: user.role,
    caseId,
    firNumber,
    title: `Investigation Gap Detected — ${firNumber}`,
    message: `AI Analysis: ${gapDescription} for case ${firNumber}.`,
    priority: 'high',
    actions: [{ label: 'Review Case', type: 'navigate', payload: '/cases' }],
  });
}

export function buildDeadlineReminderEvent(caseId: string, firNumber: string, deadlineType: string, daysRemaining: number): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'deadline_reminder',
    triggeredBy: 'system',
    triggeredByName: 'CrimeGPT System',
    triggeredByRole: 'admin',
    caseId,
    firNumber,
    title: `Deadline Reminder — ${firNumber}`,
    message: `${deadlineType} deadline approaching for case ${firNumber}. ${daysRemaining} day(s) remaining.`,
    priority: daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'high' : 'normal',
    actions: [{ label: 'View Case', type: 'navigate', payload: '/cases' }],
  });
}

export function buildSecurityAlertEvent(title: string, message: string): WorkflowEvent {
  return buildWorkflowEvent({
    eventType: 'security_alert',
    triggeredBy: 'system',
    triggeredByName: 'CrimeGPT Security',
    triggeredByRole: 'admin',
    title,
    message,
    priority: 'critical',
    actions: [{ label: 'View Audit Logs', type: 'navigate', payload: '/audit' }],
  });
}

/* ════════════════════════════════════════════
   ESCALATION CHECKER
   Called periodically by the store. Checks
   unresolved events with escalation rules
   and generates new escalation events.
   ════════════════════════════════════════════ */

export function checkEscalations(
  pendingEvents: WorkflowEvent[],
  existingEscalations: WorkflowEvent[]
): WorkflowEvent[] {
  const newEscalations: WorkflowEvent[] = [];
  const now = Date.now();

  for (const event of pendingEvents) {
    if (event.resolved) continue;
    if (!event.escalationRules || event.escalationRules.length === 0) continue;

    const eventAge = now - new Date(event.createdAt).getTime();
    const hoursElapsed = eventAge / (1000 * 60 * 60);

    for (const rule of event.escalationRules) {
      // Only escalate if enough time has passed
      if (hoursElapsed < rule.afterHours) continue;

      // Check if this escalation level already exists for this event
      const alreadyEscalated = existingEscalations.some(
        e => e.metadata?.originalEventId === event.id &&
             e.eventType === 'escalation' &&
             e.priority === rule.priority
      );
      if (alreadyEscalated) continue;

      // Also check within the pending events being generated this cycle
      const alreadyInBatch = newEscalations.some(
        e => e.metadata?.originalEventId === event.id &&
             e.eventType === 'escalation' &&
             e.priority === rule.priority
      );
      if (alreadyInBatch) continue;

      newEscalations.push(buildEscalationEvent(event, rule, hoursElapsed));
    }
  }

  return newEscalations;
}

/* ════════════════════════════════════════════
   OFFLINE QUEUE
   Stores events while offline; flushes
   when connectivity is restored.
   ════════════════════════════════════════════ */

let _offlineQueue: WorkflowEvent[] = [];

export function queueOfflineEvent(event: WorkflowEvent): void {
  _offlineQueue.push(event);
}

export function getOfflineQueue(): WorkflowEvent[] {
  return [..._offlineQueue];
}

export function clearOfflineQueue(): void {
  _offlineQueue = [];
}

export function flushOfflineQueue(): WorkflowEvent[] {
  const events = [..._offlineQueue];
  _offlineQueue = [];
  return events;
}
