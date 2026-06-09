import { useState, useCallback, useRef } from 'react';
import {
  Plus, FolderOpen, Search, Mic, MicOff, Loader2, X, CheckCircle2,
  User, MapPin, Calendar, FileText, ChevronRight, AlertCircle, Scale
} from 'lucide-react';
import {
  getCases, addCase, simulateEntityExtraction, simulateLegalAnalysis,
  generateUniqueId, formatDate, formatDateTime, showToast, addDiaryEntry,
  getCurrentUser, getLegalSections, hasPermission
} from '../store';
import type { CaseRecord, CaseStatus, LegalSuggestion, Judgment } from '../types';

/* ─── STATUS COLORS ─── */
const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: 'badge-neutral',
  active: 'badge-primary',
  under_review: 'badge-warning',
  approved: 'badge-success',
  closed: 'badge-neutral',
  returned: 'badge-danger',
};

export default function Cases() {
  const [cases, setCases] = useState(getCases);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCrimeType, setFilterCrimeType] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  const crimeTypes = [...new Set(cases.map(c => c.crimeType))];

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

  const refresh = useCallback(() => setCases(getCases()), []);
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
        </div>
      </div>

      {/* Case Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>FIR Number</th>
              <th>Crime Type</th>
              <th>Victim</th>
              <th>Status</th>
              <th>Readiness</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCase(c)}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.firNumber}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.caseNumber}</div>
                </td>
                <td><span className="badge badge-primary">{c.crimeType}</span></td>
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
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
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
      setStep(2);
      showToast('AI analysis complete!', 'success');
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{caseData.firNumber}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className={`badge ${STATUS_COLORS[caseData.status]}`}>{caseData.status.replace('_', ' ')}</span>
              <span className="badge badge-primary">{caseData.crimeType}</span>
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
