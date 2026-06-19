import { useState, Fragment } from 'react';
import {
  Plus, FolderOpen, Search, User, ChevronRight, AlertCircle,
  Clock, Key, MessageSquare, ChevronUp, ChevronDown, Send
} from 'lucide-react';
import {
  getCases, getCurrentUser, hasPermission, canAccessCase,
  getAccessRequests, formatDate, formatDateTime, showToast,
  addDiaryEntry, generateUniqueId, updateCase
} from '../store';
import type { CaseRecord } from '../types';
import { STATUS_COLORS, CLASSIFICATION_COLORS } from './cases/caseConstants';
import { useCaseFilters } from './cases/useCaseFilters';
import CreateCaseModal from './cases/CreateCaseModal';
import CaseDetailsModal from './cases/CaseDetailsModal';
import AccessRequestModal from './cases/AccessRequestModal';

export default function Cases() {
  const f = useCaseFilters();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const user = getCurrentUser();
  const allCases = getCases();
  const inaccessibleCases = allCases.filter(c => !canAccessCase(user, c).allowed);
  const myAccessRequests = getAccessRequests().filter(r => r.requestedBy === user.id);
  const canCreate = hasPermission(user.role, 'create_case');

  const renderSortIcon = (col: Parameters<typeof f.handleSort>[0]) => {
    if (f.sortColumn !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return f.sortDir === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: 2 }} />
      : <ChevronDown size={12} style={{ marginLeft: 2 }} />;
  };

  const stats = [
    { label: 'Total', count: f.counts.total, color: 'var(--text-primary)', bg: 'var(--surface-1)' },
    { label: 'Active', count: f.counts.active, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Under Review', count: f.counts.under_review, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Approved', count: f.counts.approved, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Returned', count: f.counts.returned, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Closed', count: f.counts.closed, color: '#6b7280', bg: 'var(--surface-1)' },
  ];

  const reviewQueue = (user.role === 'sho' || user.role === 'legal')
    ? f.cases.filter(c => c.status === 'under_review' && (c.assignedStation === user.station || c.policeStation === user.station))
    : [];

  const pendingAccessCount = myAccessRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><FolderOpen size={28} style={{ color: 'var(--brand-primary-light)' }} /> Cases</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Manage investigations and case records</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 140 }} value={f.filterStatus} onChange={e => f.setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
            <option value="returned">Returned</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={f.filterCrimeType} onChange={e => f.setFilterCrimeType(e.target.value)}>
            <option value="all">All Crime Types</option>
            {f.crimeTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input placeholder="Search FIR, victim, station..." value={f.search} onChange={e => f.setSearch(e.target.value)} />
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Case
            </button>
          )}
          {inaccessibleCases.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowAccessModal(true)} title="Request cross-station access">
              <Key size={16} /> Request Access
              {pendingAccessCount > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: 6 }}>{pendingAccessCount}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pending Access Requests Banner */}
      {pendingAccessCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)',
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            You have <strong style={{ color: '#f59e0b' }}>{pendingAccessCount} pending access request(s)</strong> awaiting approval.
          </span>
        </div>
      )}

      {/* Review Queue Indicator */}
      {reviewQueue.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)',
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: '#ef4444' }}>{reviewQueue.length} case{reviewQueue.length > 1 ? 's' : ''}</strong> awaiting your {user.role === 'sho' ? 'SHO' : 'Legal'} review.
          </span>
          <button
            className="btn btn-sm"
            style={{
              marginLeft: 'auto', fontSize: '0.75rem', padding: '4px 10px',
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
            }}
            onClick={() => { f.setFilterStatus('under_review'); f.setSearch(''); f.setFilterCrimeType('all'); }}
          >
            Show Review Queue
          </button>
        </div>
      )}

      {/* Summary Stats Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            flex: '1 1 auto', minWidth: 100, padding: '10px 14px',
            background: s.bg, borderRadius: 'var(--radius-md)',
            border: `1px solid ${s.color}22`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {f.selectedCaseIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)',
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
            {f.selectedCaseIds.size} case{f.selectedCaseIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              const eligible = [...f.selectedCaseIds].filter(id => {
                const c = f.cases.find(x => x.id === id);
                return c && (c.status === 'active' || c.status === 'returned' || c.status === 'draft') && c.assignedOfficer === user.id;
              });
              if (eligible.length === 0) { showToast('No eligible cases selected. Only your active/returned/draft cases can be submitted.', 'warning'); return; }
              eligible.forEach(id => {
                updateCase(id, { status: 'under_review' });
                addDiaryEntry(id, {
                  id: generateUniqueId(), caseId: id, timestamp: new Date().toISOString(),
                  action: 'Bulk Submitted for Review',
                  description: `Case submitted for review via bulk action by ${user.name}.`,
                  performedBy: user.name, category: 'other',
                });
              });
              showToast(`${eligible.length} case(s) submitted for review.`, 'success');
              f.clearSelection();
              f.refresh();
            }}
          >
            <Send size={14} /> Submit for Review
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => f.clearSelection()}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Case Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36, padding: '8px 4px' }}>
                <input
                  type="checkbox"
                  checked={f.filteredCases.length > 0 && f.selectedCaseIds.size === f.filteredCases.length}
                  onChange={e => f.selectAll(e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                />
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => f.handleSort('firNumber')}>FIR Number{renderSortIcon('firNumber')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => f.handleSort('crimeType')}>Crime Type{renderSortIcon('crimeType')}</th>
              <th>Classification</th>
              <th>Victim</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => f.handleSort('status')}>Status{renderSortIcon('status')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => f.handleSort('readinessScore')}>Readiness{renderSortIcon('readinessScore')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => f.handleSort('createdAt')}>Date{renderSortIcon('createdAt')}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {f.filteredCases.map(c => {
              const cls = CLASSIFICATION_COLORS[c.classification || 'confidential'];
              const returnEntries = c.status === 'returned'
                ? c.diaryEntries.filter(e => e.action.startsWith('Returned by')).slice(-2)
                : [];
              return (
              <Fragment key={c.id}>
              <tr style={{ cursor: 'pointer', background: f.selectedCaseIds.has(c.id) ? 'rgba(59,130,246,0.06)' : c.status === 'returned' ? 'rgba(239,68,68,0.03)' : undefined }} onClick={() => setSelectedCase(c)}>
                <td style={{ padding: '8px 4px' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={f.selectedCaseIds.has(c.id)}
                    onChange={e => f.toggleCaseSelection(c.id, e.target.checked)}
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                  />
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.firNumber}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.caseNumber}</div>
                </td>
                <td><span className="badge badge-primary">{c.crimeType}</span></td>
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                    background: cls.bg, border: `1px solid ${cls.border}`, color: cls.text,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    {cls.icon}
                  </span>
                  {c.clearanceRequired > 1 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                      CL-{c.clearanceRequired}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} style={{ color: 'var(--text-muted)' }} />
                    {c.victim.name}
                  </div>
                </td>
                <td>
                  <span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status.replace('_', ' ')}</span>
                  {c.status === 'under_review' && (user.role === 'sho' || user.role === 'legal') && (
                    <span style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                      background: '#ef4444', marginLeft: 4,
                      boxShadow: '0 0 0 2px rgba(239,68,68,0.25)',
                    }} title="Awaiting your review" />
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                    <div className="confidence-bar" style={{ flex: 1, height: 6 }}>
                      <div className={`confidence-fill ${c.readinessScore >= 80 ? 'high' : c.readinessScore >= 50 ? 'medium' : 'low'}`} style={{ width: `${c.readinessScore}%` }} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{c.readinessScore}%</span>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{formatDate(c.createdAt)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setSelectedCase(c); }}>
                    View <ChevronRight size={14} />
                  </button>
                </td>
              </tr>

              {/* Return Comments Inline Panel */}
              {returnEntries.length > 0 && (
                <tr style={{ background: 'rgba(239,68,68,0.04)' }}>
                  <td colSpan={8} style={{ padding: '10px 16px 10px 52px', borderTop: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {returnEntries.map((entry, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                        }}>
                          <MessageSquare size={13} style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>{entry.action}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{entry.description}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>By {entry.performedBy} • {formatDateTime(entry.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
            {f.filteredCases.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>
                <div className="empty-state">
                  <FolderOpen className="empty-state-icon" />
                  <h3>No cases found</h3>
                  <p>Create a new case to get started.</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Case Modal */}
      {showCreate && <CreateCaseModal onClose={() => { setShowCreate(false); f.refresh(); }} />}

      {/* Case Details Modal */}
      {selectedCase && <CaseDetailsModal caseData={selectedCase} onClose={() => { setSelectedCase(null); f.refresh(); }} />}

      {/* Access Request Modal */}
      {showAccessModal && <AccessRequestModal onClose={() => { setShowAccessModal(false); f.refresh(); }} />}
    </div>
  );
}
