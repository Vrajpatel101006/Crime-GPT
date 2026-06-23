/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef } from 'react';
import {
  Plus, X, CheckCircle2, Mic, MicOff, Loader2, FileText, ChevronRight,
  AlertCircle, Scale, Sparkles, Upload, HardDrive, Lock
} from 'lucide-react';
import {
  getCurrentUser, simulateEntityExtraction, simulateLegalAnalysis,
  generateUniqueId, showToast, addCase, updateCase, addEvidence, addDiaryEntry,
  getLegalSections, encryptCaseForStorage
} from '../../store';
import type { CaseRecord, LegalSuggestion, Judgment, Evidence, ExtractedEntity } from '../../types';
import { CRIME_TEMPLATES } from './caseConstants';

export default function CreateCaseModal({ onClose }: { onClose: () => void }) {
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

  /* ── Helper functions ── */
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

  /* ── Voice recording with Web Speech API ── */
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

  /* ── Crime category selection ── */
  const handleCategorySelect = useCallback((category: string) => {
    if (selectedCrimeCategory === category) {
      setSelectedCrimeCategory('');
      setNarrative('');
    } else {
      setSelectedCrimeCategory(category);
      const template = CRIME_TEMPLATES[category];
      if (template) setNarrative(template.prompt);
    }
  }, [selectedCrimeCategory]);

  /* ── Process narrative with AI ── */
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
  }, [narrative, selectedCrimeCategory]);

  /* ── Create case ── */
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

    // Encrypt PII fields before storage (AES-256-GCM)
    const encryptedCase = await encryptCaseForStorage(newCase);
    addCase(encryptedCase);

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

    showToast(`Case ${firNum} created securely!${stagedFiles.length > 0 ? ` ${stagedFiles.length} evidence file(s) uploaded.` : ''}`, 'success');
    onClose();
  }, [narrative, crimeType, suggestions, selectedSectionIds, manualAddedSectionIds, stagedFiles, stagedFileHashes, victimName, victimMobile, victimAddress, accusedName, accusedMobile, incidentDate, incidentLocation, user, onClose]);

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
                  <button className={`voice-pulse ${isRecording ? 'recording' : ''}`} onClick={toggleRecording}>
                    {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
                  </button>
                </div>
              )}

              {/* Crime Category Chips */}
              <div className="form-group">
                <label className="form-label">
                  Crime Category <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.85em' }}>(optional — auto-fills template)</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {Object.keys(CRIME_TEMPLATES).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`btn btn-sm ${selectedCrimeCategory === cat ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        borderRadius: '20px', fontSize: '0.85rem', padding: '6px 14px',
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
                        if (selectedSectionIds.size === suggestions.length) setSelectedSectionIds(new Set());
                        else setSelectedSectionIds(new Set(suggestions.map(s => s.section.id)));
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
                  <label className="form-label">Victim Name * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(letters only)</span> <span title="Encrypted at rest"><Lock size={12} style={{ color: 'var(--govt-gold)', opacity: 0.6, verticalAlign: 'middle', marginLeft: 4 }} /></span></label>
                  <input className="form-input" value={victimName} onChange={e => setVictimName(e.target.value.replace(/[0-9]/g, ''))} placeholder="Full name" maxLength={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Victim Mobile * <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(numbers only)</span> <span title="Encrypted at rest"><Lock size={12} style={{ color: 'var(--govt-gold)', opacity: 0.6, verticalAlign: 'middle', marginLeft: 4 }} /></span></label>
                  <input className="form-input" inputMode="numeric" value={victimMobile} onChange={e => { const v = e.target.value.replace(/[^0-9+]/g, ''); setVictimMobile(v.slice(0, 15)); }} placeholder="+91..." maxLength={15} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="form-label">Victim Address <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(max 300 chars)</span> <span title="Encrypted at rest"><Lock size={12} style={{ color: 'var(--govt-gold)', opacity: 0.6, verticalAlign: 'middle', marginLeft: 4 }} /></span></label>
                <input className="form-input" value={victimAddress} onChange={e => setVictimAddress(e.target.value.slice(0, 300))} placeholder="Full address" maxLength={300} />
                {victimAddress.length > 250 && <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{victimAddress.length} / 300</div>}
              </div>
              <div className="form-row" style={{ marginBottom: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Accused Name <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(letters only)</span> <span title="Encrypted at rest"><Lock size={12} style={{ color: 'var(--govt-gold)', opacity: 0.6, verticalAlign: 'middle', marginLeft: 4 }} /></span></label>
                  <input className="form-input" value={accusedName} onChange={e => setAccusedName(e.target.value.replace(/[0-9]/g, ''))} placeholder="If known" maxLength={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Accused Mobile <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(numbers only)</span> <span title="Encrypted at rest"><Lock size={12} style={{ color: 'var(--govt-gold)', opacity: 0.6, verticalAlign: 'middle', marginLeft: 4 }} /></span></label>
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
                  <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFileStage(e.target.files)} />
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
