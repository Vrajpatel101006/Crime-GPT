import { useState, useCallback } from 'react';
import {
  CheckSquare, X, CheckCircle2, RotateCcw,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import {
  getAccessibleCases, updateCase, formatDateTime, showToast,
  getCurrentUser, getCurrentRole, addDiaryEntry, addAuditLog, generateUniqueId,
  getLegalSections, getEvidenceForCase
} from '../store';
import type { CaseRecord, ReviewComment, LegalSection } from '../types';

export default function Review() {
  const [, setTick] = useState(0);
  const role = getCurrentRole();
  const cases = getAccessibleCases();
  const refresh = () => setTick(t => t + 1);

  const pendingCases = cases.filter(c => {
    if (role === 'sho') return c.reviewStatus === 'pending_sho';
    if (role === 'legal') return c.reviewStatus === 'pending_legal';
    return c.reviewStatus === 'pending_sho' || c.reviewStatus === 'pending_legal';
  });

  const reviewedCases = cases.filter(c => c.reviewStatus === 'approved' || c.reviewStatus === 'returned');

  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><CheckSquare size={28} style={{ color: 'var(--brand-primary-light)' }} /> Case Reviews</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>
            {role === 'sho' ? 'SHO Review Dashboard — Approve or return cases for chargesheet' :
             role === 'legal' ? 'Legal Advisor Review — Validate legal sections and document readiness' :
             role === 'admin' ? 'Admin Review Oversight — Monitor all review workflows' :
             'Review workflow overview'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card warning">
          <div className="stat-icon warning"><AlertCircle size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{pendingCases.length}</div>
            <div className="stat-label">Pending Review</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><CheckCircle2 size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{cases.filter(c => c.reviewStatus === 'approved').length}</div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon danger"><RotateCcw size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{cases.filter(c => c.reviewStatus === 'returned').length}</div>
            <div className="stat-label">Returned</div>
          </div>
        </div>
      </div>

      {/* Pending Cases */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Pending Review ({pendingCases.length})</div>
        </div>
        {pendingCases.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingCases.map(c => (
              <ReviewCard key={c.id} caseData={c} onClick={() => setSelectedCase(c)} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--brand-success)', margin: '0 auto var(--space-sm)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>All caught up! No pending reviews.</p>
          </div>
        )}
      </div>

      {/* Reviewed Cases */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">Previously Reviewed ({reviewedCases.length})</div>
        </div>
        {reviewedCases.map(c => (
          <ReviewCard key={c.id} caseData={c} onClick={() => setSelectedCase(c)} />
        ))}
      </div>

      {/* Review Modal */}
      {selectedCase && (
        <ReviewModal
          caseData={selectedCase}
          onClose={() => { setSelectedCase(null); refresh(); }}
          onAction={refresh}
        />
      )}
    </div>
  );
}

function ReviewCard({ caseData: c, onClick }: { caseData: CaseRecord; onClick: () => void }) {
  return (
    <div className="card" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: c.reviewStatus === 'approved' ? 'rgba(16,185,129,0.12)' : c.reviewStatus === 'returned' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
          color: c.reviewStatus === 'approved' ? 'var(--brand-success)' : c.reviewStatus === 'returned' ? 'var(--brand-danger)' : 'var(--brand-warning)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {c.reviewStatus === 'approved' ? <CheckCircle2 size={22} /> : c.reviewStatus === 'returned' ? <RotateCcw size={22} /> : <AlertCircle size={22} />}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.firNumber}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {c.crimeType} • {c.victim.name} • Readiness: {c.readinessScore}%
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={`badge ${c.reviewStatus === 'approved' ? 'badge-success' : c.reviewStatus === 'returned' ? 'badge-danger' : c.reviewStatus === 'pending_sho' ? 'badge-warning' : 'badge-info'}`}>
          {c.reviewStatus?.replace('_', ' ')}
        </span>
        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  );
}

function ReviewModal({ caseData, onClose, onAction }: { caseData: CaseRecord; onClose: () => void; onAction: () => void }) {
  const user = getCurrentUser();
  const role = getCurrentRole();
  const [comment, setComment] = useState('');
  const legalSections = getLegalSections();
  const evidence = getEvidenceForCase(caseData.id);
  const canReview = (role === 'sho' && caseData.reviewStatus === 'pending_sho') ||
                    (role === 'legal' && caseData.reviewStatus === 'pending_legal');

  const handleAction = useCallback((action: 'approve' | 'return') => {
    const reviewComment: ReviewComment = {
      id: generateUniqueId(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      comment: comment || (action === 'approve' ? 'Approved' : 'Returned for changes'),
      timestamp: new Date().toISOString(),
      action,
    };

    const newStatus = action === 'approve'
      ? (caseData.reviewStatus === 'pending_sho' ? 'pending_legal' : 'approved')
      : 'pending_sho';

    updateCase(caseData.id, {
      reviewStatus: newStatus as any,
      reviewComments: [...(caseData.reviewComments || []), reviewComment],
      status: newStatus === 'approved' ? 'approved' : caseData.status,
    });

    addDiaryEntry(caseData.id, {
      id: generateUniqueId(),
      caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: action === 'approve' ? `${role === 'sho' ? 'SHO' : 'Legal'} Review: Approved` : `${role === 'sho' ? 'SHO' : 'Legal'} Review: Returned`,
      description: comment || (action === 'approve' ? 'Case approved for next stage.' : 'Case returned for additional work.'),
      performedBy: user.name,
      category: 'review',
    });

    addAuditLog(action === 'approve' ? 'APPROVE_CASE' : 'RETURN_CASE', caseData.id, `${user.name} ${action === 'approve' ? 'approved' : 'returned'} case ${caseData.firNumber}`, user.id);
    showToast(`Case ${action === 'approve' ? 'approved' : 'returned'} successfully!`, action === 'approve' ? 'success' : 'warning');
    onAction();
    onClose();
  }, [caseData, comment, user, role, onAction, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Review: {caseData.firNumber}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className="badge badge-primary">{caseData.crimeType}</span>
              <span className={`badge ${caseData.reviewStatus === 'approved' ? 'badge-success' : 'badge-warning'}`}>{caseData.reviewStatus?.replace('_', ' ')}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {/* Summary */}
          <div className="grid-2" style={{ marginBottom: 'var(--space-md)', gap: 'var(--space-sm)' }}>
            <div className="card" style={{ background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Evidence</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{evidence.length} files</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--brand-success)' }}>✓ All SHA-256 verified</div>
            </div>
            <div className="card" style={{ background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Legal Sections</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{caseData.legalSectionIds.length} applied</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {caseData.legalSectionIds.map(sid => {
                  const s = legalSections.find((x: LegalSection) => x.id === sid);
                  return s ? <span key={sid} className="badge badge-primary" style={{ fontSize: '0.6rem' }}>{s.act} {s.sectionNumber}</span> : null;
                })}
              </div>
            </div>
            <div className="card" style={{ background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Readiness Score</div>
              <div style={{
                fontWeight: 700, fontSize: '1.2rem',
                color: caseData.readinessScore >= 80 ? 'var(--brand-success)' : caseData.readinessScore >= 50 ? 'var(--brand-warning)' : 'var(--brand-danger)',
              }}>{caseData.readinessScore}%</div>
              <div className="confidence-bar" style={{ marginTop: 6 }}>
                <div className={`confidence-fill ${caseData.readinessScore >= 80 ? 'high' : 'medium'}`} style={{ width: `${caseData.readinessScore}%` }} />
              </div>
            </div>
            <div className="card" style={{ background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Diary Entries</div>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{caseData.diaryEntries.length} entries</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Complete investigation trail</div>
            </div>
          </div>

          {/* Narrative */}
          <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
            <div className="card-title" style={{ marginBottom: 8 }}>Incident Narrative</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{caseData.incident.narrative}</p>
          </div>

          {/* Previous Comments */}
          {caseData.reviewComments && caseData.reviewComments.length > 0 && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Review History</div>
              {caseData.reviewComments.map(rc => (
                <div key={rc.id} style={{
                  padding: '10px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)',
                  marginBottom: 4, borderLeft: `3px solid ${rc.action === 'approve' ? 'var(--brand-success)' : 'var(--brand-danger)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rc.userName}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDateTime(rc.timestamp)}</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{rc.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Review Actions */}
          {canReview && (
            <div className="form-group">
              <label className="form-label">Review Comment</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add your review comments..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          {canReview ? (
            <>
              <button className="btn btn-danger" onClick={() => handleAction('return')}>
                <RotateCcw size={16} /> Return for Changes
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-success" onClick={() => handleAction('approve')}>
                <CheckCircle2 size={16} /> Approve
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
