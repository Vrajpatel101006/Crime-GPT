import { useState, useCallback, useRef } from 'react';
import {
  Plus, FolderOpen, Search, Mic, MicOff, Loader2, X, CheckCircle2,
  User, MapPin, Calendar, FileText, ChevronRight, AlertCircle, Scale, Sparkles,
  Key, Clock, Shield, Edit3
} from 'lucide-react';
import {
  getCases, getAccessibleCases, addCase, simulateEntityExtraction, simulateLegalAnalysis,
  generateUniqueId, formatDate, formatDateTime, showToast, addDiaryEntry,
  getCurrentUser, getLegalSections, hasPermission,
  canAccessCase, getAllUsers, updateCase,
  createAccessRequest, getAccessRequests
} from '../store';
import type { CaseRecord, CaseStatus, CaseClassification, LegalSuggestion, Judgment, ClearanceLevel } from '../types';

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

export default function Cases() {
  const [cases, setCases] = useState(() => getAccessibleCases());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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
  });

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

      {/* Case Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>FIR Number</th>
              <th>Crime Type</th>
              <th>Classification</th>
              <th>Victim</th>
              <th>Status</th>
              <th>Readiness</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const cls = CLASSIFICATION_COLORS[c.classification || 'confidential'];
              return (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCase(c)}>
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
                <td><span className={`badge ${STATUS_COLORS[c.status]}`}>{c.status.replace('_', ' ')}</span></td>
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
  const [judgments, setJudgments] = useState<Judgment[]>([]);
  const [aiPowered, setAiPowered] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  void analysisData;

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

  // Process narrative with AI
  const processNarrative = useCallback(async () => {
    if (!narrative.trim()) {
      showToast('Please enter a complaint narrative', 'warning');
      return;
    }
    setIsProcessing(true);

    try {
      const [entityResult, legalResult] = await Promise.all([
        simulateEntityExtraction(narrative),
        simulateLegalAnalysis(narrative),
      ]);

      setCrimeType(entityResult.crimeType);
      setEntities(entityResult.entities);
      setSuggestions(legalResult.suggestions);
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
  const createCase = useCallback(() => {
    const now = new Date().toISOString();
    const id = generateUniqueId();
    const firNum = `FIR/CC/AHD/2026/${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;

    const newCase: CaseRecord = {
      id: `case-${id}`,
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
      legalSectionIds: suggestions.map(s => s.section.id),
      documentIds: [],
      diaryEntries: [],
      readinessScore: 25,
      reviewStatus: 'pending_sho',
    };

    addCase(newCase);
    addDiaryEntry(newCase.id, {
      id: generateUniqueId(),
      caseId: newCase.id,
      timestamp: now,
      action: 'Case Created',
      description: `FIR registered for ${crimeType}. AI analysis identified ${suggestions.length} relevant legal sections.`,
      performedBy: user.name,
      category: 'complaint',
    });

    showToast(`Case ${firNum} created successfully!`, 'success');
    onClose();
  }, [narrative, crimeType, suggestions, victimName, victimMobile, victimAddress, accusedName, accusedMobile, incidentDate, incidentLocation, user, onClose]);

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

              {/* Narrative Input */}
              <div className="form-group">
                <label className="form-label">Complaint Narrative</label>
                <textarea
                  className="form-textarea"
                  rows={6}
                  placeholder='e.g., "Victim received a WhatsApp investment scam link and lost ₹2 lakh from their HDFC account..."'
                  value={narrative}
                  onChange={e => setNarrative(e.target.value)}
                />
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
                <div className="section-title" style={{ marginBottom: 8 }}>Recommended Legal Sections</div>
                {suggestions.map((s, i) => (
                  <div key={i} className="card" style={{ marginBottom: 8, background: 'var(--surface-1)', padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="badge badge-primary" style={{ marginRight: 8 }}>{s.section.act} {s.section.sectionNumber}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{s.section.title}</span>
                      </div>
                      <span style={{
                        fontWeight: 700, fontSize: '0.85rem',
                        color: s.confidence >= 0.8 ? 'var(--brand-success)' : s.confidence >= 0.6 ? 'var(--brand-warning)' : 'var(--brand-danger)',
                      }}>
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>{s.reasoning}</p>
                    {s.section.punishment && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-warning)', marginTop: 4 }}>
                        ⚖️ <strong>Punishment:</strong> {s.section.punishment}
                      </div>
                    )}
                    {s.section.legacyReference && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-info)', marginTop: 4 }}>
                        📜 <strong>Replaces:</strong> {s.section.legacyReference}
                      </div>
                    )}
                    <div className="confidence-bar" style={{ marginTop: 8 }}>
                      <div className={`confidence-fill ${s.confidence >= 0.8 ? 'high' : s.confidence >= 0.6 ? 'medium' : 'low'}`} style={{ width: `${s.confidence * 100}%` }} />
                    </div>
                  </div>
                ))}
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

              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginTop: 'var(--space-md)', display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertCircle size={18} style={{ color: 'var(--brand-warning)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>AI recommendations only. Officer approval is mandatory before proceeding.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && (
            <div className="fade-in">
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Victim Name *</label>
                  <input className="form-input" value={victimName} onChange={e => setVictimName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Victim Mobile *</label>
                  <input className="form-input" value={victimMobile} onChange={e => setVictimMobile(e.target.value)} placeholder="+91..." />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Victim Address</label>
                <input className="form-input" value={victimAddress} onChange={e => setVictimAddress(e.target.value)} placeholder="Full address" />
              </div>
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Accused Name</label>
                  <input className="form-input" value={accusedName} onChange={e => setAccusedName(e.target.value)} placeholder="If known" />
                </div>
                <div className="form-group">
                  <label className="form-label">Accused Mobile</label>
                  <input className="form-input" value={accusedMobile} onChange={e => setAccusedMobile(e.target.value)} placeholder="+91..." />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Incident Date</label>
                  <input className="form-input" type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Incident Location</label>
                  <input className="form-input" value={incidentLocation} onChange={e => setIncidentLocation(e.target.value)} placeholder="Location of the crime" />
                </div>
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
            <button className="btn btn-success" onClick={createCase} disabled={!victimName || !victimMobile}>
              <CheckCircle2 size={16} /> Create Case
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── CASE DETAILS MODAL ─── */
function CaseDetailsModal({ caseData, onClose }: { caseData: CaseRecord; onClose: () => void }) {
  const [tab, setTab] = useState<'details' | 'diary' | 'legal'>('details');
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

              {/* Readiness */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Investigation Readiness:</div>
                <div className="confidence-bar" style={{ flex: 1 }}>
                  <div className={`confidence-fill ${caseData.readinessScore >= 80 ? 'high' : caseData.readinessScore >= 50 ? 'medium' : 'low'}`} style={{ width: `${caseData.readinessScore}%` }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{caseData.readinessScore}%</span>
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
