/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, Fragment } from 'react';
import {
  Plus, FolderOpen, Search, Mic, MicOff, Loader2, X, CheckCircle2,
  User, MapPin, Calendar, FileText, ChevronRight, AlertCircle, Scale, Sparkles,
  Key, Clock, Shield, Edit3, MessageSquare, Send, Undo2, Lock,
  Upload, HardDrive, ChevronUp, ChevronDown
} from 'lucide-react';
import {
  getCases, getAccessibleCases, addCase, simulateEntityExtraction, simulateLegalAnalysis,
  generateUniqueId, formatDate, formatDateTime, showToast, addDiaryEntry,
  getCurrentUser, getLegalSections, hasPermission,
  canAccessCase, getAllUsers, updateCase,
  createAccessRequest, getAccessRequests, getEvidenceForCase, getDocumentsForCase,
  addEvidence
} from '../store';
import type { CaseRecord, CaseStatus, CaseClassification, LegalSuggestion, Judgment, ClearanceLevel, Evidence, ExtractedEntity } from '../types';

/* ─── STATUS COLORS ─── */
const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'badge-neutral',
  active: 'badge-primary',
  under_review: 'badge-warning',
  approved: 'badge-success',
  closed: 'badge-neutral',
  returned: 'badge-danger',
};

const CLASSIFICATION_COLORS: Record<CaseClassification, { bg: string; border: string; text: string; icon: string }> = {
  public: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', text: '#10b981', icon: 'PUBLIC' },
  confidential: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b', icon: 'CONFIDENTIAL' },
  secret: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', icon: 'SECRET' },
};

/* ─── CRIME CATEGORY TEMPLATES ─── */
const CRIME_TEMPLATES: Record<string, { prompt: string; boostedSections: string[]; entityPriority: string }> = {
  'Cyber Fraud': {
    prompt: 'Complaint under Cyber Fraud.\n\nVictim: [Full Name], [Age] years, resident of [City/Area].\n\nComplaint: On [date], the victim received a [WhatsApp message/email/phone call/Instagram DM] from an unknown person claiming to offer [investment opportunity/lottery prize/job offer/crypto trading platform]. The victim was instructed to [transfer money to bank account/download trading app/share OTP and bank details]. The victim transferred a total of ₹[amount] via [UPI/bank transfer/crypto] to account/UPI ID [details]. After the transfer, the accused [became unreachable/deleted the account/demanded more money].\n\nSuspect details (if known): Name/Phone/UPI ID/Website/App: [details]\n\nEvidence available: [WhatsApp chat screenshots/bank statements/transaction IDs/call recordings/app screenshots]',
    boostedSections: ['bns-318', 'bns-319', 'bns-336', 'it-66d', 'it-66'],
    entityPriority: 'phone, upi, bank_account, amount, url, email, name, date',
  },
  'Identity Theft': {
    prompt: 'Complaint under Identity Theft.\n\nVictim: [Full Name], [Age] years, resident of [City/Area]. Mobile: [number].\n\nComplaint: The victim discovered that an unknown person has created a fake [social media profile/bank account/loan application] using the victim\'s [name/photograph/Aadhaar number/PAN number] without consent. The fake profile/account was found on [platform - Instagram/Facebook/WhatsApp/loan app] with [username/account details]. The impersonator has been [sending messages to victim\'s contacts/taking loans in victim\'s name/posting defamatory content].\n\nVictim\'s Aadhaar/PAN (if compromised): [number]\n\nEvidence available: [Screenshots of fake profile/loan rejection letters/threatening messages]',
    boostedSections: ['bns-319', 'it-66c', 'it-66d', 'dpdp-9'],
    entityPriority: 'name, phone, email, aadhaar, pan, url',
  },
  'Financial Fraud': {
    prompt: 'Complaint under Financial Fraud.\n\nVictim: [Full Name], [Age] years, resident of [City/Area]. Mobile: [number].\n\nComplaint: The victim was approached by [person/company name] offering [fake investment scheme/ponzi scheme/chit fund/fixed deposit with high returns]. The victim invested ₹[amount] over the period [start date] to [end date] via [bank transfer/cheque/cash/UPI]. The accused provided fake [receipts/account statements/certificates]. When the victim requested withdrawal/returns, the accused [refused/absconded/demanded additional fees].\n\nBank account used by accused: [account number, IFSC, bank name]\nTotal amount defrauded: ₹[amount]\n\nEvidence available: [Bank statements/investment receipts/WhatsApp chats/email correspondence]',
    boostedSections: ['bns-318', 'bns-340', 'bns-338', 'it-66d'],
    entityPriority: 'bank_account, amount, name, phone, date, email',
  },
  'Hacking': {
    prompt: 'Complaint under Hacking / Unauthorized Access.\n\nVictim: [Full Name/Organization Name]. Mobile: [number]. Email: [email].\n\nComplaint: On [date], the victim discovered that their [email account/social media account/website/server/bank account] was accessed by an unauthorized person. The victim noticed [unusual login from unknown IP/password changed/data deleted/unauthorized transactions/unauthorized posts]. The victim\'s [Gmail/Instagram/Facebook/website admin panel] showed login activity from [IP address/location/device] that the victim does not recognize.\n\nAffected accounts/systems: [email/social media handles/website URL/server IP]\nData compromised: [personal data/financial records/official documents/customer database]\n\nEvidence available: [Login history screenshots/IP logs/email headers/server logs]',
    boostedSections: ['it-43', 'it-66', 'it-66b', 'it-72'],
    entityPriority: 'email, url, phone, name, date',
  },
  'Drug Offence': {
    prompt: 'Complaint under Drug Offence.\n\nInformant: [Full Name/Badge Number], [Rank], P.S. [Station].\n\nComplaint: On [date] at approximately [time], during [patrolling/checking/specific intelligence], the accused was found in possession of [type of drug - cannabis/ganja/brown sugar/MDMA/cocaine/heroin] near [location]. The quantity seized was approximately [weight in grams/kg]. The accused was found [concealing the substance in a bag/selling to customers/consuming on the spot].\n\nAccused: [Name if known], [Age], resident of [area].\nDrug type seized: [substance name]\nQuantity: [weight]\n\nEvidence available: [Seized substance/photographs of seizure spot/witness statements/FSL report]',
    boostedSections: ['ndps-8', 'ndps-15', 'ndps-20', 'ndps-21', 'bns-61'],
    entityPriority: 'name, amount, date, vehicle, phone',
  },
};

export default function Cases() {
  const [cases, setCases] = useState(() => getAccessibleCases());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'firNumber' | 'crimeType' | 'status' | 'readinessScore'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [filterCrimeType, setFilterCrimeType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const crimeTypes = [...new Set(cases.map(c => c.crimeType))];
  const user = getCurrentUser();
  const allCases = getCases();
  const inaccessibleCases = allCases.filter(c => !canAccessCase(user, c).allowed);
  const myAccessRequests = getAccessRequests().filter(r => r.requestedBy === user.id);

  const filtered = cases.filter(c => {
    const matchSearch = !search ||
      c.firNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.crimeType.toLowerCase().includes(search.toLowerCase()) ||
      c.victim.name.toLowerCase().includes(search.toLowerCase()) ||
      c.policeStation.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchCrime = filterCrimeType === 'all' || c.crimeType === filterCrimeType;
    return matchSearch && matchStatus && matchCrime;
  }).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortColumn) {
      case 'firNumber': return a.firNumber.localeCompare(b.firNumber) * dir;
      case 'crimeType': return a.crimeType.localeCompare(b.crimeType) * dir;
      case 'status': return a.status.localeCompare(b.status) * dir;
      case 'readinessScore': return (a.readinessScore - b.readinessScore) * dir;
      case 'createdAt':
      default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    }
  });

  const handleSort = (col: typeof sortColumn) => {
    if (sortColumn === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDir('asc'); }
  };

  const renderSortIcon = (col: typeof sortColumn) => {
    if (sortColumn !== col) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return sortDir === 'asc' ? <ChevronUp size={12} style={{ marginLeft: 2 }} /> : <ChevronDown size={12} style={{ marginLeft: 2 }} />;
  };

  const refresh = useCallback(() => setCases(getAccessibleCases()), []);
  const canCreate = hasPermission(getCurrentUser().role, 'create_case');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><FolderOpen size={28} style={{ color: 'var(--brand-primary-light)' }} /> Cases</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Manage investigations and case records</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
            <option value="returned">Returned</option>
          </select>
          <select className="form-select" style={{ width: 160 }} value={filterCrimeType} onChange={e => setFilterCrimeType(e.target.value)}>
            <option value="all">All Crime Types</option>
            {crimeTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input placeholder="Search FIR, victim, station..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Create Case
            </button>
          )}
          {inaccessibleCases.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowAccessModal(true)} title="Request cross-station access">
              <Key size={16} /> Request Access
              {myAccessRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="badge badge-warning" style={{ marginLeft: 6 }}>{myAccessRequests.filter(r => r.status === 'pending').length}</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pending Access Requests Banner */}
      {myAccessRequests.filter(r => r.status === 'pending').length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-md)',
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            You have <strong style={{ color: '#f59e0b' }}>{myAccessRequests.filter(r => r.status === 'pending').length} pending access request(s)</strong> awaiting approval.
          </span>
        </div>
      )}

      {/* Review Queue Indicator — for SHO/Legal roles */}
      {(() => {
        if (user.role !== 'sho' && user.role !== 'legal') return null;
        const reviewQueue = cases.filter(c => c.status === 'under_review' && (c.assignedStation === user.station || c.policeStation === user.station));
        if (reviewQueue.length === 0) return null;
        return (
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
              onClick={() => { setFilterStatus('under_review'); setSearch(''); setFilterCrimeType('all'); }}
            >
              Show Review Queue
            </button>
          </div>
        );
      })()}

      {/* Summary Stats Bar */}
      <div style={{
        display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {(() => {
          const counts = {
            total: cases.length,
            active: cases.filter(c => c.status === 'active').length,
            under_review: cases.filter(c => c.status === 'under_review').length,
            approved: cases.filter(c => c.status === 'approved').length,
            returned: cases.filter(c => c.status === 'returned').length,
            closed: cases.filter(c => c.status === 'closed').length,
          };
          const stats: { label: string; count: number; color: string; bg: string }[] = [
            { label: 'Total', count: counts.total, color: 'var(--text-primary)', bg: 'var(--surface-1)' },
            { label: 'Active', count: counts.active, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
            { label: 'Under Review', count: counts.under_review, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Approved', count: counts.approved, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
            { label: 'Returned', count: counts.returned, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { label: 'Closed', count: counts.closed, color: '#6b7280', bg: 'var(--surface-1)' },
          ];
          return stats.map(s => (
            <div key={s.label} style={{
              flex: '1 1 auto', minWidth: 100, padding: '10px 14px',
              background: s.bg, borderRadius: 'var(--radius-md)',
              border: `1px solid ${s.color}22`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ));
        })()}
      </div>

      {/* Bulk Actions Bar */}
      {selectedCaseIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)',
          padding: '10px 14px', borderRadius: 'var(--radius-md)',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brand-primary)' }}>
            {selectedCaseIds.size} case{selectedCaseIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              const eligible = [...selectedCaseIds].filter(id => {
                const c = cases.find(x => x.id === id);
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
              setSelectedCaseIds(new Set());
              refresh();
            }}
          >
            <Send size={14} /> Submit for Review
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCaseIds(new Set())}>
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
                  checked={filtered.length > 0 && selectedCaseIds.size === filtered.length}
                  onChange={e => setSelectedCaseIds(e.target.checked ? new Set(filtered.map(c => c.id)) : new Set())}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                />
              </th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('firNumber')}>FIR Number{renderSortIcon('firNumber')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('crimeType')}>Crime Type{renderSortIcon('crimeType')}</th>
              <th>Classification</th>
              <th>Victim</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('status')}>Status{renderSortIcon('status')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('readinessScore')}>Readiness{renderSortIcon('readinessScore')}</th>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('createdAt')}>Date{renderSortIcon('createdAt')}</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const cls = CLASSIFICATION_COLORS[c.classification || 'confidential'];
              const returnEntries = c.status === 'returned'
                ? c.diaryEntries.filter(e => e.action.startsWith('Returned by')).slice(-2)
                : [];
              return (
              <Fragment key={c.id}>
              <tr style={{ cursor: 'pointer', background: selectedCaseIds.has(c.id) ? 'rgba(59,130,246,0.06)' : c.status === 'returned' ? 'rgba(239,68,68,0.03)' : undefined }} onClick={() => setSelectedCase(c)}>
                <td style={{ padding: '8px 4px' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedCaseIds.has(c.id)}
                    onChange={e => {
                      const next = new Set(selectedCaseIds);
                      if (e.target.checked) next.add(c.id);
                      else next.delete(c.id);
                      setSelectedCaseIds(next);
                    }}
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
            {filtered.length === 0 && (
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
      {showCreate && <CreateCaseModal onClose={() => { setShowCreate(false); refresh(); }} />}

      {/* Case Details Modal */}
      {selectedCase && <CaseDetailsModal caseData={selectedCase} onClose={() => { setSelectedCase(null); refresh(); }} />}

      {/* Access Request Modal */}
      {showAccessModal && <AccessRequestModal onClose={() => { setShowAccessModal(false); refresh(); }} />}
    </div>
  );
}

/* ─── CREATE CASE MODAL ─── */
function CreateCaseModal({ onClose }: { onClose: () => void }) {
  const user = getCurrentUser();
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [narrative, setNarrative] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState('en-IN');

  // Extracted data
  const [crimeType, setCrimeType] = useState('');
  const [entities, setEntities] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<LegalSuggestion[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [showManualSectionSearch, setShowManualSectionSearch] = useState(false);
  const [manualSectionQuery, setManualSectionQuery] = useState('');
  const [manualAddedSectionIds, setManualAddedSectionIds] = useState<Set<string>>(new Set());

  // Evidence upload state
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedFileHashes, setStagedFileHashes] = useState<Map<File, string>>(new Map());
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE_FOR_STORAGE = 2 * 1024 * 1024; // 2 MB

  const computeSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileStage = async (newFiles: FileList | null) => {
    if (!newFiles) return;
    const fileArr = Array.from(newFiles);
    const newHashes = new Map(stagedFileHashes);
    for (const f of fileArr) {
      const hash = await computeSHA256(f);
      newHashes.set(f, hash);
    }
    setStagedFiles(prev => [...prev, ...fileArr]);
    setStagedFileHashes(newHashes);
    showToast(`${fileArr.length} file(s) staged for upload.`, 'success');
  };

  const removeStagedFile = (idx: number) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [aiPowered, setAiPowered] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  void analysisData;
  const [selectedCrimeCategory, setSelectedCrimeCategory] = useState('');

  // Form fields
  const [victimName, setVictimName] = useState('');
  const [victimMobile, setVictimMobile] = useState('');
  const [victimAddress, setVictimAddress] = useState('');
  const [accusedName, setAccusedName] = useState('');
  const [accusedMobile, setAccusedMobile] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [incidentLocation, setIncidentLocation] = useState('');

  const recognitionRef = useRef<any>(null);

  // Voice recording with Web Speech API
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNarrative(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsRecording(false);
      showToast('Speech recognition error. Try again.', 'error');
    };

    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    showToast('Listening... Speak your complaint', 'info');
  }, [isRecording, language]);

  // Crime category selection
  const handleCategorySelect = useCallback((category: string) => {
    if (selectedCrimeCategory === category) {
      // Deselect
      setSelectedCrimeCategory('');
      setNarrative('');
    } else {
      setSelectedCrimeCategory(category);
      const template = CRIME_TEMPLATES[category];
      if (template) setNarrative(template.prompt);
    }
  }, [selectedCrimeCategory]);

  // Process narrative with AI
  const processNarrative = useCallback(async () => {
    if (!narrative.trim()) {
      showToast('Please enter a complaint narrative', 'warning');
      return;
    }
    setIsProcessing(true);

    try {
      const [entityResult, legalResult] = await Promise.all([
        simulateEntityExtraction(narrative, selectedCrimeCategory || undefined),
        simulateLegalAnalysis(narrative, selectedCrimeCategory || undefined),
      ]);

      setCrimeType(entityResult.crimeType);
      setEntities(entityResult.entities);
      setSuggestions(legalResult.suggestions);
      setSelectedSectionIds(new Set(legalResult.suggestions.map(s => s.section.id)));
      setJudgments(legalResult.judgments);
      setAiPowered(entityResult.aiPowered);

      // Auto-populate form fields from AI analysis
      const ai = entityResult.analysis;
      if (ai) {
        setAnalysisData(ai);
        if (ai.victim?.name) setVictimName(ai.victim.name);
        if (ai.victim?.mobile) setVictimMobile(ai.victim.mobile);
        if (ai.victim?.address) setVictimAddress(ai.victim.address);
        if (ai.accused?.name && ai.accused.name !== 'Unknown') setAccusedName(ai.accused.name);
        if (ai.accused?.mobile) setAccusedMobile(ai.accused.mobile);
        if (ai.incident?.date) setIncidentDate(ai.incident.date);
        if (ai.incident?.location) setIncidentLocation(ai.incident.location);
      }

      setStep(2);
      showToast(entityResult.aiPowered ? 'AI analysis complete!' : 'Analysis complete (fallback mode)', 'success');
    } catch {
      showToast('Error processing narrative', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [narrative]);

  // Create case
  const createCase = useCallback(async () => {
    const now = new Date().toISOString();
    const id = generateUniqueId();
    const firNum = `FIR/CC/AHD/2026/${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
    const caseId = `case-${id}`;

    const newCase: CaseRecord = {
      id: caseId,
      firNumber: firNum,
      caseNumber: `CC-AHD-2026-${id.slice(0, 4)}`,
      policeStation: user.station,
      assignedOfficer: user.id,
      assignedStation: user.station,
      classification: 'confidential',
      clearanceRequired: 1,
      status: 'active',
      crimeType,
      createdAt: now,
      updatedAt: now,
      victim: { name: victimName, address: victimAddress, mobile: victimMobile },
      accused: { name: accusedName || 'Unknown', address: '', mobile: accusedMobile },
      incident: { date: incidentDate || new Date().toISOString().split('T')[0], time: '00:00', location: incidentLocation || 'Not specified', narrative, crimeType },
      evidenceIds: [],
      legalSectionIds: [...selectedSectionIds, ...manualAddedSectionIds],
      documentIds: [],
      diaryEntries: [],
      readinessScore: 25,
      reviewStatus: 'pending_sho',
    };

    addCase(newCase);

    // Upload staged evidence files
    if (stagedFiles.length > 0) {
      setIsUploadingEvidence(true);
      const evidenceIds: string[] = [];
      for (const file of stagedFiles) {
        const hash = stagedFileHashes.get(file) || await computeSHA256(file);
        const fileType = file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'document';

        let fileData: string | undefined;
        if (file.size <= MAX_FILE_SIZE_FOR_STORAGE) {
          fileData = await fileToBase64(file);
        }

        const tags: string[] = [fileType.charAt(0).toUpperCase() + fileType.slice(1)];
        if (fileType === 'image') tags.push('Screenshot');

        const evId = `ev-${generateUniqueId()}`;
        const ev: Evidence = {
          id: evId,
          caseId,
          fileName: file.name,
          fileType,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.id,
          sha256Hash: hash,
          tags,
          extractedEntities: [] as ExtractedEntity[],
          chainOfCustody: [{ action: 'uploaded', userId: user.id, userName: user.name, timestamp: new Date().toISOString() }],
          mimeType: file.type || 'application/octet-stream',
          fileData,
        };
        addEvidence(ev);
        evidenceIds.push(evId);
      }
      // Link evidence to case
      updateCase(caseId, { evidenceIds });
      addDiaryEntry(caseId, {
        id: generateUniqueId(), caseId, timestamp: now,
        action: 'Evidence Uploaded',
        description: `${stagedFiles.length} evidence file(s) uploaded during case creation with SHA-256 integrity verification.`,
        performedBy: user.name, category: 'evidence',
      });
      setIsUploadingEvidence(false);
    }

    addDiaryEntry(caseId, {
      id: generateUniqueId(),
      caseId,
      timestamp: now,
      action: 'Case Created',
      description: `FIR registered for ${crimeType}. AI analysis identified ${[...selectedSectionIds, ...manualAddedSectionIds].length} relevant legal sections.${stagedFiles.length > 0 ? ` ${stagedFiles.length} evidence file(s) uploaded.` : ''}`,
      performedBy: user.name,
      category: 'complaint',
    });

    showToast(`Case ${firNum} created successfully!${stagedFiles.length > 0 ? ` ${stagedFiles.length} evidence file(s) uploaded.` : ''}`, 'success');
    onClose();
  }, [narrative, crimeType, suggestions, selectedSectionIds, manualAddedSectionIds, stagedFiles, stagedFileHashes, victimName, victimMobile, victimAddress, accusedName, accusedMobile, incidentDate, incidentLocation, user, onClose, computeSHA256, fileToBase64]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={20} style={{ color: 'var(--brand-primary-light)' }} />
              Create New Case — Step {step} of 3
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {step === 1 ? 'Enter complaint narrative' : step === 2 ? 'AI Analysis Results' : 'Confirm case details'}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* STEP 1: Input */}
          {step === 1 && (
            <div className="fade-in">
              {/* Language & Mode */}
              <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Language</label>
                  <select className="form-select" value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="en-IN">English</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="gu-IN">Gujarati</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Input Mode</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`btn ${inputMode === 'text' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setInputMode('text')}>
                      <FileText size={14} /> Text
                    </button>
                    <button className={`btn ${inputMode === 'voice' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setInputMode('voice')}>
                      <Mic size={14} /> Voice
                    </button>
                  </div>
                </div>
              </div>

              {/* Voice Button */}
              {inputMode === 'voice' && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
                  <button
                    className={`voice-pulse ${isRecording ? 'recording' : ''}`}
                    onClick={toggleRecording}
                  >
                    {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
                  </button>
                </div>
              )}

              {/* Crime Category Chips */}
              <div className="form-group">
                <label className="form-label">Crime Category <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.85em' }}>(optional — auto-fills template)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.keys(CRIME_TEMPLATES).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`btn btn-sm ${selectedCrimeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        padding: '6px 14px',
                        transition: 'all 0.2s ease',
                        ...(selectedCrimeCategory === cat ? {} : { border: '1px solid var(--border)' }),
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Narrative Input */}
              <div className="form-group">
                <label className="form-label">
                  Complaint Narrative
                  {selectedCrimeCategory && (
                    <span style={{ marginLeft: '8px', fontSize: '0.8em', color: 'var(--primary)' }}>
                      Template: {selectedCrimeCategory} — fill in the [brackets]
                    </span>
                  )}
                </label>
                <textarea
                  className="form-textarea"
                  rows={selectedCrimeCategory ? 10 : 6}
                  maxLength={5000}
                  placeholder={selectedCrimeCategory ? 'Edit the template above with actual case details...' : 'e.g., "Victim received a WhatsApp investment scam link and lost ₹2 lakh from their HDFC account..."'}
                  value={narrative}
                  onChange={e => setNarrative(e.target.value.slice(0, 5000))}
                />
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: narrative.length > 4800 ? 'var(--brand-warning)' : 'var(--text-muted)', marginTop: 4 }}>
                  {narrative.length} / 5000
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AI Analysis */}
          {step === 2 && (
            <div className="fade-in">
              {/* AI Status Badge */}
              {aiPowered && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-md)', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={16} style={{ color: 'var(--brand-accent)' }} />
                  <span style={{ fontSize: 12, color: 'var(--brand-accent)', fontWeight: 600 }}>AI-Powered Analysis (Groq LLM)</span>
                  <span style={{ fontSize: 11, color: 'var(--text-300)' }}>— Fields auto-populated in Step 3</span>
                </div>
              )}
              {/* Crime Classification */}
              <div className="card" style={{ marginBottom: 'var(--space-md)', background: 'var(--surface-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary-light)' }}>
                    <Scale size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Crime Classification</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{crimeType}</div>
                  </div>
                </div>
              </div>

              {/* Extracted Entities */}
              {Object.keys(entities).length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>Extracted Entities</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Object.entries(entities).map(([key, val]) => (
                      <div key={key} className="badge badge-info" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                        {key}: {val}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Suggestions */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="section-title" style={{ marginBottom: 0 }}>Recommended Legal Sections</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => {
                        if (selectedSectionIds.size === suggestions.length) {
                          setSelectedSectionIds(new Set());
                        } else {
                          setSelectedSectionIds(new Set(suggestions.map(s => s.section.id)));
                        }
                      }}
                    >
                      {selectedSectionIds.size === suggestions.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      onClick={() => setShowManualSectionSearch(!showManualSectionSearch)}
                    >
                      + Add Manual Section
                    </button>
                  </div>
                </div>

                {/* Manual Section Search */}
                {showManualSectionSearch && (
                  <div className="fade-in" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
                    <input
                      className="form-input"
                      placeholder="Search sections by title, keyword, or section number..."
                      value={manualSectionQuery}
                      onChange={e => setManualSectionQuery(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    {manualSectionQuery.trim().length > 1 && (
                      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                        {getLegalSections()
                          .filter(s =>
                            !selectedSectionIds.has(s.id) &&
                            !manualAddedSectionIds.has(s.id) &&
                            (s.title.toLowerCase().includes(manualSectionQuery.toLowerCase()) ||
                             s.keywords.some(k => k.toLowerCase().includes(manualSectionQuery.toLowerCase())) ||
                             s.sectionNumber.toLowerCase().includes(manualSectionQuery.toLowerCase()) ||
                             `${s.act} ${s.sectionNumber}`.toLowerCase().includes(manualSectionQuery.toLowerCase()))
                          )
                          .slice(0, 8)
                          .map(s => (
                            <button
                              key={s.id}
                              className="btn btn-ghost btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', marginBottom: 4, padding: '6px 8px' }}
                              onClick={() => {
                                setManualAddedSectionIds(prev => new Set([...prev, s.id]));
                                setManualSectionQuery('');
                                showToast(`Added ${s.act} ${s.sectionNumber}`, 'success');
                              }}
                            >
                              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{s.act} {s.sectionNumber}</span>
                              <span style={{ fontSize: '0.82rem' }}>{s.title}</span>
                            </button>
                          ))}
                        {getLegalSections()
                          .filter(s =>
                            !selectedSectionIds.has(s.id) &&
                            !manualAddedSectionIds.has(s.id) &&
                            (s.title.toLowerCase().includes(manualSectionQuery.toLowerCase()) ||
                             s.keywords.some(k => k.toLowerCase().includes(manualSectionQuery.toLowerCase())) ||
                             s.sectionNumber.toLowerCase().includes(manualSectionQuery.toLowerCase()) ||
                             `${s.act} ${s.sectionNumber}`.toLowerCase().includes(manualSectionQuery.toLowerCase()))
                          ).length === 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: 8 }}>No matching sections found.</div>
                        )}
                      </div>
                    )}
                    {manualAddedSectionIds.size > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {[...manualAddedSectionIds].map(sid => {
                          const s = getLegalSections().find(sec => sec.id === sid);
                          return s ? (
                            <span key={sid} className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
                              {s.act} {s.sectionNumber}
                              <button onClick={() => setManualAddedSectionIds(prev => { const n = new Set(prev); n.delete(sid); return n; })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}><X size={10} /></button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {suggestions.map((s, i) => (
                  <div key={i} className="card" style={{
                    marginBottom: 8, background: 'var(--surface-1)', padding: 'var(--space-md)',
                    opacity: selectedSectionIds.has(s.section.id) ? 1 : 0.5,
                    border: selectedSectionIds.has(s.section.id) ? '1px solid var(--border)' : '1px dashed var(--border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={selectedSectionIds.has(s.section.id)}
                          onChange={e => {
                            const next = new Set(selectedSectionIds);
                            if (e.target.checked) next.add(s.section.id);
                            else next.delete(s.section.id);
                            setSelectedSectionIds(next);
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                        />
                        <div>
                          <span className="badge badge-primary" style={{ marginRight: 8 }}>{s.section.act} {s.section.sectionNumber}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{s.section.title}</span>
                        </div>
                      </div>
                      <span style={{
                        fontWeight: 700, fontSize: '0.85rem',
                        color: s.confidence >= 0.8 ? 'var(--brand-success)' : s.confidence >= 0.6 ? 'var(--brand-warning)' : 'var(--brand-danger)',
                      }}>
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6, marginLeft: 26 }}>{s.reasoning}</p>
                    {s.section.punishment && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-warning)', marginTop: 4, marginLeft: 26 }}>
                        ⚖️ <strong>Punishment:</strong> {s.section.punishment}
                      </div>
                    )}
                    {s.section.legacyReference && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-info)', marginTop: 4, marginLeft: 26 }}>
                        📜 <strong>Replaces:</strong> {s.section.legacyReference}
                      </div>
                    )}
                    <div className="confidence-bar" style={{ marginTop: 8, marginLeft: 26 }}>
                      <div className={`confidence-fill ${s.confidence >= 0.8 ? 'high' : s.confidence >= 0.6 ? 'medium' : 'low'}`} style={{ width: `${s.confidence * 100}%` }} />
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'right' }}>
                  {selectedSectionIds.size} of {suggestions.length} sections selected
                  {manualAddedSectionIds.size > 0 && <span style={{ marginLeft: 8, color: 'var(--brand-success)' }}>+ {manualAddedSectionIds.size} manually added</span>}
                </div>
              </div>

              {/* Relevant Judgments */}
              {judgments.length > 0 && (
                <div>
                  <div className="section-title" style={{ marginBottom: 8 }}>Relevant Judgments</div>
                  {judgments.map(j => (
                    <div key={j.id} className="card" style={{ marginBottom: 8, background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{j.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{j.court} • {j.year} • {j.citation}</div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{j.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginTop: 'var(--space-md)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={18} style={{ color: 'var(--brand-warning)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600 }}>⚠ AI Disclaimer</div>
                  <span style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>AI analysis can make mistakes. Officers must verify all recommendations before proceeding. Final approval is mandatory.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && (
            <div className="fade-in">
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Victim Name * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(letters only)</span></label>
                  <input className="form-input" value={victimName} onChange={e => setVictimName(e.target.value.replace(/[0-9]/g, ''))} placeholder="Full name" maxLength={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Victim Mobile * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(numbers only)</span></label>
                  <input className="form-input" inputMode="numeric" value={victimMobile} onChange={e => { const v = e.target.value.replace(/[^0-9+]/g, ''); setVictimMobile(v.slice(0, 15)); }} placeholder="+91..." maxLength={15} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Victim Address <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(max 300 chars)</span></label>
                <input className="form-input" value={victimAddress} onChange={e => setVictimAddress(e.target.value.slice(0, 300))} placeholder="Full address" maxLength={300} />
                {victimAddress.length > 250 && <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{victimAddress.length} / 300</div>}
              </div>
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Accused Name <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(letters only)</span></label>
                  <input className="form-input" value={accusedName} onChange={e => setAccusedName(e.target.value.replace(/[0-9]/g, ''))} placeholder="If known" maxLength={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Accused Mobile <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(numbers only)</span></label>
                  <input className="form-input" inputMode="numeric" value={accusedMobile} onChange={e => { const v = e.target.value.replace(/[^0-9+]/g, ''); setAccusedMobile(v.slice(0, 15)); }} placeholder="+91..." maxLength={15} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Incident Date <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(no future dates)</span></label>
                  <input className="form-input" type="date" value={incidentDate} max={new Date().toISOString().split('T')[0]} onChange={e => { if (e.target.value <= new Date().toISOString().split('T')[0]) setIncidentDate(e.target.value); }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Incident Location <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(max 200 chars)</span></label>
                  <input className="form-input" value={incidentLocation} onChange={e => setIncidentLocation(e.target.value.slice(0, 200))} placeholder="Location of the crime" maxLength={200} />
                </div>
              </div>

              {/* Evidence Upload Zone */}
              <div style={{ marginTop: 'var(--space-md)' }}>
                <div className="section-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <HardDrive size={14} />
                  Evidence Upload
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional — upload now or later)</span>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFileStage(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-lg)', textAlign: 'center', cursor: 'pointer',
                    background: 'var(--surface-1)', transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Drag & drop files here, or <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>click to browse</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Images, PDFs, audio, video — Max 2 MB for full preview storage
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={e => handleFileStage(e.target.files)}
                  />
                </div>

                {/* Staged Files List */}
                {stagedFiles.length > 0 && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      {stagedFiles.length} file(s) staged — will be uploaded when case is created
                    </div>
                    {stagedFiles.map((file, idx) => {
                      const hash = stagedFileHashes.get(file);
                      const fileType = file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'document';
                      return (
                        <div key={idx} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          padding: '8px 10px', marginBottom: 4,
                          background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                            <FileText size={14} style={{ color: fileType === 'image' ? 'var(--brand-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {(file.size / 1024).toFixed(1)} KB {file.size > MAX_FILE_SIZE_FOR_STORAGE ? '(metadata only — exceeds 2 MB)' : ''}
                                {hash && ` | SHA-256: ${hash.substring(0, 8)}...${hash.slice(-4)}`}
                              </div>
                            </div>
                          </div>
                          <button className="btn btn-ghost btn-icon" style={{ flexShrink: 0, color: 'var(--brand-danger)' }} onClick={(e) => { e.stopPropagation(); removeStagedFile(idx); }}>
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>Back</button>}
          <div style={{ flex: 1 }} />
          {step === 1 && (
            <button className="btn btn-primary" onClick={processNarrative} disabled={isProcessing}>
              {isProcessing ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <>Analyze with AI <ChevronRight size={16} /></>}
            </button>
          )}
          {step === 2 && (
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Approve & Continue <ChevronRight size={16} />
            </button>
          )}
          {step === 3 && (
            <button className="btn btn-success" onClick={createCase} disabled={!victimName || !victimMobile || isUploadingEvidence}>
              {isUploadingEvidence ? (
                <><Loader2 size={16} className="spin" /> Creating & Uploading...</>
              ) : (
                <><CheckCircle2 size={16} /> Create Case{stagedFiles.length > 0 ? ` (+${stagedFiles.length} files)` : ''}</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── CASE DETAILS MODAL ─── */
function CaseDetailsModal({ caseData, onClose }: { caseData: CaseRecord; onClose: () => void }) {
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

  const caseStation = caseData.assignedStation || caseData.policeStation;
  const stationOfficers = Object.values(getAllUsers()).filter(u => u.station === caseStation && (u.role === 'io' || u.role === 'sho'));

  // Status change state
  const [returnComment, setReturnComment] = useState('');
  const [showReturnBox, setShowReturnBox] = useState<'sho' | 'legal' | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Status timeline stages
  const STATUS_STAGES: { key: CaseStatus; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'active', label: 'Active' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'closed', label: 'Closed' },
  ];
  const currentStageIdx = STATUS_STAGES.findIndex(s => s.key === caseData.status);

  // Status change handlers
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

  // What action buttons to show?
  const isAssignedIO = user.id === caseData.assignedOfficer;
  const canSubmitReview = isAssignedIO && (caseData.status === 'active' || caseData.status === 'returned' || caseData.status === 'draft');
  const canApproveOrReturn = (user.role === 'sho' || user.role === 'legal') && caseData.status === 'under_review';
  const canClose = user.role === 'admin' && caseData.status === 'approved';

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
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
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
                {/* Row 1: Classification + Clearance (editable for admin/SHO) */}
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
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          CL-{caseData.clearanceRequired}
                        </span>
                        {canEditSecurity && (
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ padding: 2, color: 'var(--text-muted)', opacity: 0.7 }}
                            onClick={() => setEditSecurity(true)}
                            title="Edit classification & clearance"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Access: {accessInfo.reason}
                  </div>
                </div>

                {/* Row 2: Station + Officer (officer editable for admin/SHO) */}
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
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ padding: 2, color: 'var(--text-muted)', opacity: 0.7 }}
                          onClick={() => setEditOfficer(true)}
                          title="Reassign officer"
                        >
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
                    // Returned state gets a special red indicator on the Under Review step
                    const isReturnedStep = isReturned && stage.key === 'under_review';
                    return (
                      <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: idx < STATUS_STAGES.length - 1 ? 1 : 'none' }}>
                        {/* Node */}
                        <div style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72,
                        }}>
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
                        {/* Connector line */}
                        {idx < STATUS_STAGES.length - 1 && (
                          <div style={{
                            flex: 1, height: 2, marginLeft: 2, marginRight: 2,
                            background: isPast ? 'var(--brand-success)' : 'var(--border)',
                            borderRadius: 1,
                          }} />
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
                  {/* IO: Submit for Review */}
                  {canSubmitReview && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSubmitForReview}
                      disabled={statusLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      {statusLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      Submit for Review
                    </button>
                  )}

                  {/* SHO/Legal: Approve */}
                  {canApproveOrReturn && (
                    <>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handleApprove}
                        disabled={statusLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-success)', color: '#fff', border: 'none' }}
                      >
                        {statusLoading ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                        Approve Case
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setShowReturnBox(showReturnBox ? null : (user.role as 'sho' | 'legal'))}
                        disabled={statusLoading}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-danger)', color: '#fff', border: 'none' }}
                      >
                        {statusLoading ? <Loader2 size={14} className="spin" /> : <Undo2 size={14} />}
                        Return to IO
                      </button>
                    </>
                  )}

                  {/* Admin: Close Case */}
                  {canClose && (
                    <button
                      className="btn btn-sm"
                      onClick={handleCloseCase}
                      disabled={statusLoading}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--text-muted)', color: '#fff', border: 'none' }}
                    >
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
                    className="form-textarea"
                    rows={3}
                    placeholder="Explain what needs to be corrected or added before the case can be approved..."
                    value={returnComment}
                    onChange={e => setReturnComment(e.target.value)}
                    style={{ marginBottom: 10, fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleReturn(showReturnBox)}
                      disabled={statusLoading || !returnComment.trim()}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-danger)', color: '#fff', border: 'none' }}
                    >
                      {statusLoading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                      Confirm Return
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowReturnBox(null); setReturnComment(''); }}>
                      Cancel
                    </button>
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
                {/* Readiness Checklist */}
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
                          <span style={{ textDecoration: item.done ? 'none' : 'none', fontWeight: item.done ? 500 : 400 }}>
                            {item.label}
                          </span>
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
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>Name:</strong> {caseData.victim.name}</div>
                    <div><strong>Mobile:</strong> {caseData.victim.mobile}</div>
                    <div><strong>Address:</strong> {caseData.victim.address}</div>
                    {caseData.victim.age && <div><strong>Age:</strong> {caseData.victim.age}</div>}
                  </div>
                </div>

                {/* Accused */}
                <div className="card" style={{ background: 'var(--surface-1)' }}>
                  <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} style={{ color: 'var(--brand-danger)' }} /> Accused Details
                  </div>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div><strong>Name:</strong> {caseData.accused.name}</div>
                    <div><strong>Mobile:</strong> {caseData.accused.mobile || 'N/A'}</div>
                    <div><strong>Address:</strong> {caseData.accused.address || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              {/* Incident */}
              <div className="card" style={{ background: 'var(--surface-1)', marginTop: 'var(--space-md)' }}>
                <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} style={{ color: 'var(--brand-warning)' }} /> Incident Details
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: '0.85rem', marginBottom: 12 }}>
                  <div><Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Date:</strong> {caseData.incident.date}</div>
                  <div><MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>Location:</strong> {caseData.incident.location}</div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{caseData.incident.narrative}</p>
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
                const DOC_TYPE_LABELS: Record<string, string> = {
                  fir: 'FIR', remand_request: 'Remand Request', chargesheet: 'Chargesheet',
                  purvani_chargesheet: 'Purvani Chargesheet', seizure_receipt: 'Seizure Receipt',
                  medical_letter: 'Medical Letter', court_custody: 'Court Custody',
                  panchanama: 'Panchanama', face_id_form: 'Face ID Form', lers_request: 'LERS Request',
                };
                const DOC_STATUS_COLORS: Record<string, string> = {
                  draft: 'badge-neutral', validated: 'badge-primary', approved: 'badge-success', exported: 'badge-warning',
                };
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

/* ─── ACCESS REQUEST MODAL ─── */
function AccessRequestModal({ onClose }: { onClose: () => void }) {
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
                      border: existing ? `1px solid ${existing.status === 'approved' ? 'rgba(16,185,129,0.4)' : existing.status === 'pending' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}` : '1px solid var(--border-subtle)',
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
