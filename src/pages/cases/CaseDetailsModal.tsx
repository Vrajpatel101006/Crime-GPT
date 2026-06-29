import { useState } from 'react';
import {
  X, CheckCircle2, Undo2, Loader2, Send, Lock, User, MapPin, Calendar,
  FileText, MessageSquare, AlertCircle, Edit3, FolderOpen
} from 'lucide-react';
import {
  getCurrentUser, canAccessCase, getAllUsers, updateCase, addDiaryEntry,
  generateUniqueId, showToast, getLegalSections, getEvidenceForCase,
  getDocumentsForCase, formatDateTime
} from '../../store';
import type { CaseRecord, CaseClassification, ClearanceLevel } from '../../types';
import {
  STATUS_COLORS, CLASSIFICATION_COLORS, STATUS_STAGES,
  DOC_TYPE_LABELS, DOC_STATUS_COLORS
} from './caseConstants';

export default function CaseDetailsModal({ caseData, onClose }: { caseData: CaseRecord; onClose: () => void }) {
  const [tab, setTab] = useState<'details' | 'diary' | 'legal' | 'evidence' | 'documents'>('details');
  const user = getCurrentUser();
  const cls = CLASSIFICATION_COLORS[caseData.classification || 'confidential'];
  const accessInfo = canAccessCase(user, caseData);

  // Classification / clearance editing state
  const canEditSecurity = user.role === 'admin' || user.role === 'sho';
  const [editSecurity, setEditSecurity] = useState(false);
  const [newClassification, setNewClassification] = useState<CaseClassification>(caseData.classification || 'confidential');
  const [newClearance, setNewClearance] = useState<number>(caseData.clearanceRequired || 1);

  // Officer reassignment state
  const [editOfficer, setEditOfficer] = useState(false);
  const [newOfficerId, setNewOfficerId] = useState(caseData.assignedOfficer);

  // NEW: Case details editing state
  const isAssignedIO = user.id === caseData.assignedOfficer;
  const canEditCase = isAssignedIO || user.role === 'admin';
  const [editCaseDetails, setEditCaseDetails] = useState(false);
  const [editVictim, setEditVictim] = useState({ ...caseData.victim });
  const [editAccused, setEditAccused] = useState({ ...caseData.accused });
  const [editIncident, setEditIncident] = useState({ ...caseData.incident });
  const [editCrimeType, setEditCrimeType] = useState(caseData.crimeType);

  const caseStation = caseData.assignedStation || caseData.policeStation;
  const stationOfficers = Object.values(getAllUsers()).filter(u => u.station === caseStation && (u.role === 'io' || u.role === 'sho'));

  // Status change state
  const [returnComment, setReturnComment] = useState('');
  const [showReturnBox, setShowReturnBox] = useState<'sho' | 'legal' | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const currentStageIdx = STATUS_STAGES.findIndex(s => s.key === caseData.status);

  /* ── Status change handlers ── */
  const handleSubmitForReview = async () => {
    setStatusLoading(true);
    await new Promise(r => setTimeout(r, 400));
    updateCase(caseData.id, { status: 'under_review' });
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: 'Submitted for Review',
      description: `Case submitted for SHO/Legal review by ${user.name}.`,
      performedBy: user.name, category: 'other',
    });
    showToast('Case submitted for review.', 'success');
    setStatusLoading(false);
  };

  const handleApprove = async () => {
    setStatusLoading(true);
    await new Promise(r => setTimeout(r, 400));
    updateCase(caseData.id, { status: 'approved' });
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: 'Case Approved',
      description: `Case approved by ${user.name} (${user.role.toUpperCase()}).`,
      performedBy: user.name, category: 'other',
    });
    showToast('Case approved successfully.', 'success');
    setStatusLoading(false);
  };

  const handleReturn = async (returnerRole: 'sho' | 'legal') => {
    if (!returnComment.trim()) { showToast('Please add a comment before returning.', 'warning'); return; }
    setStatusLoading(true);
    await new Promise(r => setTimeout(r, 400));
    updateCase(caseData.id, { status: 'returned' });
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: `Returned by ${returnerRole.toUpperCase()}`,
      description: `Case returned with comments by ${user.name}: "${returnComment}"`,
      performedBy: user.name, category: 'other',
    });
    showToast('Case returned to IO with comments.', 'success');
    setReturnComment('');
    setShowReturnBox(null);
    setStatusLoading(false);
  };

  const handleCloseCase = async () => {
    setStatusLoading(true);
    await new Promise(r => setTimeout(r, 400));
    updateCase(caseData.id, { status: 'closed' });
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: 'Case Closed',
      description: `Case closed by ${user.name} (Admin).`,
      performedBy: user.name, category: 'other',
    });
    showToast('Case closed.', 'success');
    setStatusLoading(false);
  };

  const handleSaveSecurity = () => {
    updateCase(caseData.id, { classification: newClassification, clearanceRequired: newClearance as ClearanceLevel });
    setEditSecurity(false);
    showToast(`Classification updated to ${newClassification.toUpperCase()} (CL-${newClearance}).`, 'success');
  };

  const handleSaveOfficer = () => {
    if (newOfficerId === caseData.assignedOfficer) { setEditOfficer(false); return; }
    const newOfficer = Object.values(getAllUsers()).find(u => u.id === newOfficerId);
    updateCase(caseData.id, { assignedOfficer: newOfficerId });
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: 'Officer Reassigned',
      description: `Case reassigned from ${caseData.assignedOfficer} to ${newOfficer?.name || newOfficerId} by ${user.name}.`,
      performedBy: user.name, category: 'other',
    });
    setEditOfficer(false);
    showToast(`Case reassigned to ${newOfficer?.name || newOfficerId}.`, 'success');
  };

  // NEW: Handler for saving case details edits
  const handleSaveCaseDetails = () => {
    if (!editVictim.name || !editVictim.mobile) {
      showToast('Victim name and mobile are required.', 'warning');
      return;
    }
    if (!editIncident.date || !editIncident.location) {
      showToast('Incident date and location are required.', 'warning');
      return;
    }

    updateCase(caseData.id, {
      victim: editVictim,
      accused: editAccused,
      incident: editIncident,
      crimeType: editCrimeType,
    });

    addDiaryEntry(caseData.id, {
      id: generateUniqueId(), caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: 'Case Details Updated',
      description: `Case details edited by ${user.name}: victim, accused, incident information updated.`,
      performedBy: user.name, category: 'other',
    });

    setEditCaseDetails(false);
    showToast('Case details updated successfully.', 'success');
  };

  const handleCancelEdit = () => {
    setEditCaseDetails(false);
    setEditVictim({ ...caseData.victim });
    setEditAccused({ ...caseData.accused });
    setEditIncident({ ...caseData.incident });
    setEditCrimeType(caseData.crimeType);
  };

  // What action buttons to show?
  const canSubmitReview = isAssignedIO && (caseData.status === 'active' || caseData.status === 'returned' || caseData.status === 'draft');
  const canApproveOrReturn = (user.role === 'sho' || user.role === 'legal') && caseData.status === 'under_review';
  const canClose = user.role === 'admin' && caseData.status === 'approved';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{caseData.firNumber}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`badge ${STATUS_COLORS[caseData.status]}`}>{caseData.status.replace('_', ' ')}</span>
              <span className="badge badge-primary">{caseData.crimeType}</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                background: cls.bg, border: `1px solid ${cls.border}`, color: cls.text,
                letterSpacing: '0.05em',
              }}>
                {cls.icon}
              </span>
              {caseData.clearanceRequired > 1 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Clearance Level: {caseData.clearanceRequired}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canEditCase && tab === 'details' && !editCaseDetails && (
              <button className="btn btn-primary btn-sm" onClick={() => setEditCaseDetails(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit3 size={14} /> Edit Case
              </button>
            )}
            {canEditCase && tab === 'details' && editCaseDetails && (
              <>
                <button className="btn btn-success btn-sm" onClick={handleSaveCaseDetails} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Save Changes
                </button>
                <button className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="tabs" style={{ padding: '0 var(--space-lg)', margin: 0 }}>
          <button className={`tab ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
          <button className={`tab ${tab === 'diary' ? 'active' : ''}`} onClick={() => setTab('diary')}>Case Diary ({caseData.diaryEntries.length})</button>
          <button className={`tab ${tab === 'legal' ? 'active' : ''}`} onClick={() => setTab('legal')}>Legal Sections</button>
          <button className={`tab ${tab === 'evidence' ? 'active' : ''}`} onClick={() => setTab('evidence')}>Evidence ({getEvidenceForCase(caseData.id).length})</button>
          <button className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents ({getDocumentsForCase(caseData.id).length})</button>
        </div>

        <div className="modal-body">
          {tab === 'details' && (
            <div className="fade-in">
              {/* Security Info Banner */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-md)',
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: cls.bg, border: `1px solid ${cls.border}`,
              }}>
                {/* Row 1: Classification + Clearance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {editSecurity && canEditSecurity ? (
                      <>
                        <select
                          className="form-select"
                          style={{ width: 150, fontSize: '0.78rem', padding: '4px 8px' }}
                          value={newClassification}
                          onChange={e => setNewClassification(e.target.value as CaseClassification)}
                        >
                          <option value="public">PUBLIC</option>
                          <option value="confidential">CONFIDENTIAL</option>
                          <option value="secret">SECRET</option>
                        </select>
                        <select
                          className="form-select"
                          style={{ width: 100, fontSize: '0.78rem', padding: '4px 8px' }}
                          value={newClearance}
                          onChange={e => setNewClearance(Number(e.target.value))}
                        >
                          {[1,2,3,4,5].map(cl => <option key={cl} value={cl}>CL-{cl}</option>)}
                        </select>
                        <button className="btn btn-primary btn-sm" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={handleSaveSecurity}>
                          <CheckCircle2 size={12} /> Save
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => { setEditSecurity(false); setNewClassification(caseData.classification || 'confidential'); setNewClearance(caseData.clearanceRequired || 1); }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <strong style={{ color: cls.text, fontSize: '0.82rem' }}>{cls.icon}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CL-{caseData.clearanceRequired}</span>
                        {canEditSecurity && (
                          <button className="btn btn-ghost btn-icon" style={{ padding: 2, color: 'var(--text-muted)', opacity: 0.7 }} onClick={() => setEditSecurity(true)} title="Edit classification & clearance">
                            <Edit3 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Access: {accessInfo.reason}</div>
                </div>

                {/* Row 2: Station + Officer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                    {caseStation}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  {editOfficer && canEditSecurity ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={12} style={{ color: 'var(--text-muted)' }} />
                      <select
                        className="form-select"
                        style={{ width: 180, fontSize: '0.78rem', padding: '4px 8px' }}
                        value={newOfficerId}
                        onChange={e => setNewOfficerId(e.target.value)}
                      >
                        {stationOfficers.map(o => (
                          <option key={o.id} value={o.id}>{o.name} ({o.role.toUpperCase()})</option>
                        ))}
                      </select>
                      <button className="btn btn-primary btn-sm" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={handleSaveOfficer}>
                        <CheckCircle2 size={12} /> Save
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => { setEditOfficer(false); setNewOfficerId(caseData.assignedOfficer); }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)' }}>
                      <User size={12} style={{ color: 'var(--text-muted)' }} />
                      Officer: {(() => { const o = Object.values(getAllUsers()).find(u => u.id === caseData.assignedOfficer); return o ? `${o.name} (${o.role.toUpperCase()})` : caseData.assignedOfficer; })()}
                      {canEditSecurity && (
                        <button className="btn btn-ghost btn-icon" style={{ padding: 2, color: 'var(--text-muted)', opacity: 0.7 }} onClick={() => setEditOfficer(true)} title="Reassign officer">
                          <Edit3 size={13} />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* STATUS TIMELINE */}
              <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>Case Lifecycle</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {STATUS_STAGES.map((stage, idx) => {
                    const isPast = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    const isReturned = caseData.status === 'returned';
                    const isReturnedStep = isReturned && stage.key === 'under_review';
                    return (
                      <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: idx < STATUS_STAGES.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700,
                            border: `2px solid ${isCurrent ? (isReturnedStep ? '#ef4444' : 'var(--brand-primary)') : isPast ? 'var(--brand-success)' : 'var(--border)'}`,
                            background: isCurrent ? (isReturnedStep ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)') : isPast ? 'rgba(34,197,94,0.12)' : 'var(--surface-2)',
                            color: isCurrent ? (isReturnedStep ? '#ef4444' : 'var(--brand-primary)') : isPast ? 'var(--brand-success)' : 'var(--text-muted)',
                          }}>
                            {isPast ? <CheckCircle2 size={14} /> : isCurrent ? (isReturnedStep ? <Undo2 size={12} /> : idx + 1) : idx + 1}
                          </div>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: isCurrent ? 700 : 500,
                            color: isCurrent ? (isReturnedStep ? '#ef4444' : 'var(--brand-primary)') : isPast ? 'var(--brand-success)' : 'var(--text-muted)',
                            textAlign: 'center', lineHeight: 1.2,
                          }}>
                            {isReturnedStep ? 'Returned' : stage.label}
                          </span>
                        </div>
                        {idx < STATUS_STAGES.length - 1 && (
                          <div style={{ flex: 1, height: 2, marginLeft: 2, marginRight: 2, background: isPast ? 'var(--brand-success)' : 'var(--border)', borderRadius: 1 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STATUS ACTION BUTTONS */}
              {(canSubmitReview || canApproveOrReturn || canClose) && (
                <div style={{
                  display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap',
                  marginBottom: 'var(--space-md)', padding: 'var(--space-md)',
                  background: 'var(--surface-1)', borderRadius: 'var(--radius-md)',
                  alignItems: 'center',
                }}>
                  {canSubmitReview && (
                    <button className="btn btn-primary btn-sm" onClick={handleSubmitForReview} disabled={statusLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {statusLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      Submit for Review
                    </button>
                  )}
                  {canApproveOrReturn && (
                    <>
                      <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={statusLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-success)', color: '#fff', border: 'none' }}>
                        {statusLoading ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                        Approve Case
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setShowReturnBox(showReturnBox ? null : (user.role as 'sho' | 'legal'))} disabled={statusLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-danger)', color: '#fff', border: 'none' }}>
                        {statusLoading ? <Loader2 size={14} className="spin" /> : <Undo2 size={14} />}
                        Return to IO
                      </button>
                    </>
                  )}
                  {canClose && (
                    <button className="btn btn-sm" onClick={handleCloseCase} disabled={statusLoading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--text-muted)', color: '#fff', border: 'none' }}>
                      {statusLoading ? <Loader2 size={14} className="spin" /> : <Lock size={14} />}
                      Close Case
                    </button>
                  )}
                </div>
              )}

              {/* Return Comment Box */}
              {showReturnBox && (
                <div className="fade-in" style={{
                  marginBottom: 'var(--space-md)', padding: 'var(--space-md)',
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--radius-md)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MessageSquare size={14} style={{ color: 'var(--brand-danger)' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Return Comments <span style={{ color: 'var(--brand-danger)', fontWeight: 400 }}>(required)</span></span>
                  </div>
                  <textarea
                    className="form-textarea" rows={3}
                    placeholder="Explain what needs to be corrected or added before the case can be approved..."
                    value={returnComment}
                    onChange={e => setReturnComment(e.target.value)}
                    style={{ marginBottom: 10, fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReturn(showReturnBox)} disabled={statusLoading || !returnComment.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-danger)', color: '#fff', border: 'none' }}>
                      {statusLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      Confirm Return
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowReturnBox(null); setReturnComment(''); }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Readiness */}
              <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Investigation Readiness:</div>
                  <div className="confidence-bar" style={{ flex: 1 }}>
                    <div className={`confidence-fill ${caseData.readinessScore >= 80 ? 'high' : caseData.readinessScore >= 50 ? 'medium' : 'low'}`} style={{ width: `${caseData.readinessScore}%` }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{caseData.readinessScore}%</span>
                </div>
                {(() => {
                  const evidence = getEvidenceForCase(caseData.id);
                  const docs = getDocumentsForCase(caseData.id);
                  const checklist: { label: string; done: boolean; tab?: 'details' | 'diary' | 'legal' | 'evidence' | 'documents' }[] = [
                    { label: 'Victim details recorded', done: !!caseData.victim?.name && !!caseData.victim?.mobile, tab: 'details' },
                    { label: 'Accused identified', done: !!caseData.accused?.name, tab: 'details' },
                    { label: 'Incident date & location', done: !!caseData.incident?.date && !!caseData.incident?.location, tab: 'details' },
                    { label: 'Legal sections applied', done: caseData.legalSectionIds.length > 0, tab: 'legal' },
                    { label: 'Evidence uploaded', done: evidence.length > 0, tab: 'evidence' },
                    { label: 'Documents generated', done: docs.length > 0, tab: 'documents' },
                    { label: 'Case diary entries', done: caseData.diaryEntries.length > 0, tab: 'diary' },
                    { label: 'Case submitted for review', done: caseData.status !== 'draft' && caseData.status !== 'active', tab: 'details' },
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                      {checklist.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => item.tab && setTab(item.tab)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
                            fontSize: '0.8rem', color: item.done ? 'var(--brand-success)' : 'var(--text-muted)',
                            textAlign: 'left',
                          }}
                        >
                          {item.done ? <CheckCircle2 size={13} /> : <div style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid var(--text-muted)', opacity: 0.5 }} />}
                          <span style={{ fontWeight: item.done ? 500 : 400 }}>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="grid-2">
                {/* Victim */}
                <div className="card" style={{ background: 'var(--surface-1)' }}>
                  <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={16} style={{ color: 'var(--brand-info)' }} /> Victim Details
                  </div>
                  {editCaseDetails ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input className="form-input" value={editVictim.name} onChange={e => setEditVictim({ ...editVictim, name: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Mobile *</label>
                        <input className="form-input" value={editVictim.mobile} onChange={e => setEditVictim({ ...editVictim, mobile: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Address</label>
                        <input className="form-input" value={editVictim.address || ''} onChange={e => setEditVictim({ ...editVictim, address: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Age</label>
                        <input className="form-input" type="number" value={editVictim.age || ''} onChange={e => setEditVictim({ ...editVictim, age: Number(e.target.value) || undefined })} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div><strong>Name:</strong> {caseData.victim.name}</div>
                      <div><strong>Mobile:</strong> {caseData.victim.mobile}</div>
                      <div><strong>Address:</strong> {caseData.victim.address}</div>
                      {caseData.victim.age && <div><strong>Age:</strong> {caseData.victim.age}</div>}
                    </div>
                  )}
                </div>

                {/* Accused */}
                <div className="card" style={{ background: 'var(--surface-1)' }}>
                  <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} style={{ color: 'var(--brand-danger)' }} /> Accused Details
                  </div>
                  {editCaseDetails ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Name</label>
                        <input className="form-input" value={editAccused.name || ''} onChange={e => setEditAccused({ ...editAccused, name: e.target.value })} placeholder="Unknown" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Mobile</label>
                        <input className="form-input" value={editAccused.mobile || ''} onChange={e => setEditAccused({ ...editAccused, mobile: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Address</label>
                        <input className="form-input" value={editAccused.address || ''} onChange={e => setEditAccused({ ...editAccused, address: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div><strong>Name:</strong> {caseData.accused.name}</div>
                      <div><strong>Mobile:</strong> {caseData.accused.mobile || 'N/A'}</div>
                      <div><strong>Address:</strong> {caseData.accused.address || 'Unknown'}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Incident */}
              <div className="card" style={{ background: 'var(--surface-1)', marginTop: 'var(--space-md)' }}>
                <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} style={{ color: 'var(--brand-warning)' }} /> Incident Details
                </div>
                {editCaseDetails ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Date *</label>
                        <input className="form-input" type="date" value={editIncident.date || ''} onChange={e => setEditIncident({ ...editIncident, date: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Location *</label>
                        <input className="form-input" value={editIncident.location || ''} onChange={e => setEditIncident({ ...editIncident, location: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Crime Type</label>
                      <input className="form-input" value={editCrimeType} onChange={e => setEditCrimeType(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Narrative / Description</label>
                      <textarea className="form-textarea" rows={5} value={editIncident.narrative || ''} onChange={e => setEditIncident({ ...editIncident, narrative: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem', marginBottom: 12 }}>
                      <div><Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Date:</strong> {caseData.incident.date}</div>
                      <div><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Location:</strong> {caseData.incident.location}</div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{caseData.incident.narrative}</p>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'diary' && (
            <div className="fade-in">
              <div className="timeline">
                {caseData.diaryEntries.map(entry => (
                  <div key={entry.id} className="timeline-item">
                    <div className={`timeline-dot ${entry.category === 'complaint' ? '' : entry.category === 'evidence' ? 'success' : entry.category === 'legal' ? '' : 'warning'}`} />
                    <div className="timeline-content">
                      <div className="timeline-date">{formatDateTime(entry.timestamp)}</div>
                      <div className="timeline-title">{entry.action}</div>
                      <div className="timeline-desc">{entry.description}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>By: {entry.performedBy}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'legal' && (
            <div className="fade-in">
              {caseData.legalSectionIds.map(sid => {
                const section = getLegalSections().find(s => s.id === sid);
                if (!section) return null;
                return (
                  <div key={sid} className="card" style={{ marginBottom: 'var(--space-sm)', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-primary">{section.act} {section.sectionNumber}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{section.title}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{section.description}</p>
                    {section.punishment && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--brand-warning)', marginTop: 6 }}>
                        <strong>Punishment:</strong> {section.punishment}
                      </div>
                    )}
                    {section.legacyReference && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-info)', marginTop: 4 }}>
                        📜 <strong>Replaces:</strong> {section.legacyReference}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'evidence' && (
            <div className="fade-in">
              {(() => {
                const evidence = getEvidenceForCase(caseData.id);
                if (evidence.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                      <FolderOpen size={32} style={{ opacity: 0.4, marginBottom: 10 }} />
                      <div>No evidence files uploaded for this case yet.</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Upload evidence from the Evidence page.</div>
                    </div>
                  );
                }
                return evidence.map(ev => (
                  <div key={ev.id} className="card" style={{ marginBottom: 'var(--space-sm)', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <FileText size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-all' }}>{ev.fileName}</span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem', flexShrink: 0 }}>{ev.fileType.toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>{(ev.fileSize / 1024).toFixed(1)} KB</span>
                          <span>Uploaded: {formatDateTime(ev.uploadedAt)}</span>
                          <span>By: {ev.uploadedBy}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>
                          SHA-256: {ev.sha256Hash.substring(0, 8)}{'••••••••••••••••••••'}{ev.sha256Hash.slice(-4)}
                        </div>
                        {ev.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            {ev.tags.map((tag, i) => (
                              <span key={i} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {ev.fileData && (
                        <div style={{
                          width: 48, height: 48, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0,
                          background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {ev.fileType === 'image' ? (
                            <img src={ev.fileData} alt={ev.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <FileText size={20} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {tab === 'documents' && (
            <div className="fade-in">
              {(() => {
                const docs = getDocumentsForCase(caseData.id);
                if (docs.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                      <FileText size={32} style={{ opacity: 0.4, marginBottom: 10 }} />
                      <div>No documents generated for this case yet.</div>
                      <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Generate documents from the Documents page.</div>
                    </div>
                  );
                }
                return docs.map(doc => (
                  <div key={doc.id} className="card" style={{ marginBottom: 'var(--space-sm)', background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <FileText size={14} style={{ color: 'var(--brand-success)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{doc.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span>{DOC_TYPE_LABELS[doc.type] || doc.type}</span>
                          <span>v{doc.version}</span>
                          <span>Generated: {formatDateTime(doc.generatedAt)}</span>
                          <span>By: {doc.generatedBy}</span>
                        </div>
                        {doc.validationErrors.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--brand-danger)', marginTop: 6 }}>
                            {doc.validationErrors.length} validation error{doc.validationErrors.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${DOC_STATUS_COLORS[doc.status] || 'badge-neutral'}`} style={{ flexShrink: 0, textTransform: 'capitalize' }}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
