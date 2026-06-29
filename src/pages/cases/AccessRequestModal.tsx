import { useState } from 'react';
import { X, Key, Shield, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  getCurrentUser, getCases, getAccessRequests, canAccessCase,
  createAccessRequest, showToast
} from '../../store';
import { CLASSIFICATION_COLORS } from './caseConstants';

export default function AccessRequestModal({ onClose }: { onClose: () => void }) {
  const user = getCurrentUser();
  const allCases = getCases();
  const accessRequests = getAccessRequests();
  const [requestingFor, setRequestingFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const inaccessibleCases = allCases
    .map(c => ({ case: c, access: canAccessCase(user, c) }))
    .filter(x => !x.access.allowed);

  const myRequests = accessRequests.filter(r => r.requestedBy === user.id);

  const handleRequest = (caseId: string) => {
    if (!reason.trim()) {
      showToast('Please enter a reason for access request.', 'warning');
      return;
    }
    createAccessRequest(caseId, reason.trim());
    showToast('Access request submitted — awaiting SHO/Admin approval.', 'success');
    setRequestingFor(null);
    setReason('');
  };

  const getExistingRequest = (caseId: string) =>
    myRequests.find(r => r.caseId === caseId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={20} style={{ color: 'var(--brand-primary-light)' }} />
              Request Cross-Station Access
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Zero FIR Protocol — request access to cases outside your station (Layer 6)
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {inaccessibleCases.length === 0 ? (
            <div className="empty-state">
              <Shield size={32} style={{ color: 'var(--brand-success)', marginBottom: 8 }} />
              <h3>Full Access</h3>
              <p>You already have access to all cases in the system.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {inaccessibleCases.map(({ case: c, access }) => {
                const existing = getExistingRequest(c.id);
                const cls = CLASSIFICATION_COLORS[c.classification || 'confidential'];
                const isRequesting = requestingFor === c.id;

                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      background: 'var(--surface-1)',
                      border: existing
                        ? `1px solid ${existing.status === 'approved' ? 'rgba(16,185,129,0.4)' : existing.status === 'pending' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}`
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.firNumber}</span>
                          <span className="badge badge-primary">{c.crimeType}</span>
                          <span style={{
                            display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                            background: cls.bg, border: `1px solid ${cls.border}`, color: cls.text,
                          }}>{cls.icon}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {c.assignedStation || c.policeStation} &nbsp;•&nbsp; Victim: {c.victim.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <AlertCircle size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                          {access.reason}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {existing ? (
                          <span className={`badge ${
                            existing.status === 'approved' ? 'badge-success' :
                            existing.status === 'pending' ? 'badge-warning' : 'badge-danger'
                          }`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                            {existing.status === 'approved' ? '✓ Approved' :
                             existing.status === 'pending' ? '⏱ Pending' : '✗ Rejected'}
                          </span>
                        ) : isRequesting ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
                            <input
                              className="form-input"
                              placeholder="Reason (e.g., linked investigation, court order...)"
                              value={reason}
                              onChange={e => setReason(e.target.value)}
                              autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') handleRequest(c.id); }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleRequest(c.id)}>
                                <CheckCircle2 size={13} /> Submit
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setRequestingFor(null); setReason(''); }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm" onClick={() => setRequestingFor(c.id)}>
                            <Key size={13} /> Request Access
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {inaccessibleCases.length} case(s) outside your access scope
          </span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
