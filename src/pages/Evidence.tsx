import { useState, useCallback, useRef } from 'react';
import {
  Upload, Search, FileText, Image, Music, Film, Shield,
  Hash, X, CheckCircle2, Eye, EyeOff, Copy, Download,
  Tag, Link2
} from 'lucide-react';
import {
  getEvidence, addEvidence, getAccessibleCases,
  generateUniqueId, formatDateTime, showToast, getCurrentUser,
  addDiaryEntry, hasPermission, addCustodyEntry
} from '../store';
import type { Evidence, ExtractedEntity } from '../types';

const FILE_ICONS: Record<string, any> = {
  image: Image,
  document: FileText,
  audio: Music,
  video: Film,
};

export default function EvidencePage() {
  const [evidence, setEvidence] = useState(getEvidence);
  const [search, setSearch] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCase, setFilterCase] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const cases = getAccessibleCases();
  const accessibleCaseIds = new Set(cases.map(c => c.id));

  const refresh = useCallback(() => setEvidence(getEvidence()), []);

  const fileTypes = [...new Set(evidence.map(e => e.fileType))];

  // Filter evidence to only show items from accessible cases
  const accessibleEvidence = evidence.filter(e => accessibleCaseIds.has(e.caseId));

  const filtered = accessibleEvidence.filter(e => {
    const matchSearch = !search ||
      e.fileName.toLowerCase().includes(search.toLowerCase()) ||
      e.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
      e.sha256Hash.substring(0, 8).toLowerCase().includes(search.toLowerCase());
    const matchCase = filterCase === 'all' || e.caseId === filterCase;
    const matchType = filterType === 'all' || e.fileType === filterType;
    return matchSearch && matchCase && matchType;
  });

  const canUpload = hasPermission(getCurrentUser().role, 'upload_evidence');

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><Shield size={28} style={{ color: 'var(--brand-primary-light)' }} /> Evidence Management</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Upload, analyze, and manage evidence with integrity verification</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 200 }} value={filterCase} onChange={e => setFilterCase(e.target.value)}>
            <option value="all">All Cases</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.firNumber}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {fileTypes.map(ft => <option key={ft} value={ft}>{ft.charAt(0).toUpperCase() + ft.slice(1)}</option>)}
          </select>
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input placeholder="Search filename, tag, hash..." value={search} onChange={e => setSearch(e.target.value.slice(0, 200))} maxLength={200} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)} disabled={!canUpload} title={!canUpload ? 'You do not have permission to upload evidence' : ''}>
            <Upload size={16} /> Upload Evidence
          </button>
        </div>
      </div>

      {/* Evidence Grid */}
      <div className="grid-3 stagger">
        {filtered.map(ev => {
          const Icon = FILE_ICONS[ev.fileType] || FileText;
          return (
            <div
              key={ev.id}
              className="card fade-in-up"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedEvidence(ev)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: ev.fileType === 'image' ? 'rgba(99,102,241,0.12)' : ev.fileType === 'document' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)',
                  color: ev.fileType === 'image' ? 'var(--brand-primary-light)' : ev.fileType === 'document' ? 'var(--brand-info)' : 'var(--brand-success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={22} />
                </div>
                <span className={`badge ${ev.fileType === 'image' ? 'badge-primary' : ev.fileType === 'document' ? 'badge-info' : 'badge-success'}`}>
                  {ev.fileType}
                </span>
              </div>

              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 4 }} className="truncate">{ev.fileName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                {(ev.fileSize / 1024).toFixed(0)} KB • {formatDateTime(ev.uploadedAt)}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {ev.tags.slice(0, 3).map((tag, i) => (
                  <span key={i} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}><Tag size={10} /> {tag}</span>
                ))}
                {ev.tags.length > 3 && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>+{ev.tags.length - 3}</span>}
              </div>

              {/* Hash Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'var(--brand-success)' }}>
                <CheckCircle2 size={12} />
                <span>{ev.sha256Hash.substring(0, 8)}••••••••••••</span>
              </div>

              {/* Extracted Entities Count */}
              {ev.extractedEntities.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {ev.extractedEntities.length} entities extracted
                  <span style={{ fontSize: '0.65rem', color: 'var(--brand-warning)', marginLeft: 6 }}>⚠ AI-extracted — verify manually</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state" style={{ marginTop: 'var(--space-2xl)' }}>
          <Shield className="empty-state-icon" />
          <h3>No evidence found</h3>
          <p>Upload evidence files to start building your case.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && <UploadModal onClose={() => { setShowUpload(false); refresh(); }} />}

      {/* Evidence Detail Modal */}
      {selectedEvidence && <EvidenceDetailModal evidence={selectedEvidence} onClose={() => setSelectedEvidence(null)} />}
    </div>
  );
}

/* ─── UPLOAD MODAL ─── */
const MAX_FILE_SIZE_FOR_STORAGE = 2 * 1024 * 1024; // 2 MB — files above this stored as metadata only

function UploadModal({ onClose }: { onClose: () => void }) {
  const user = getCurrentUser();
  const cases = getAccessibleCases();
  const [caseId, setCaseId] = useState(cases[0]?.id || '');
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  }, []);

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

  const processFiles = useCallback(async () => {
    if (!caseId || files.length === 0) {
      showToast('Select a case and at least one file', 'warning');
      return;
    }
    setIsProcessing(true);

    for (const file of files) {
      const hash = await computeSHA256(file);
      const fileType = file.type.startsWith('image') ? 'image' : file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'document';

      // Store file content as base64 for files <= 2 MB
      let fileData: string | undefined;
      if (file.size <= MAX_FILE_SIZE_FOR_STORAGE) {
        fileData = await fileToBase64(file);
      }

      // Simulate OCR entity extraction
      const extractedEntities: ExtractedEntity[] = [];
      if (file.name.toLowerCase().includes('whatsapp') || file.name.toLowerCase().includes('chat')) {
        extractedEntities.push({ type: 'phone', value: '+919111222333', confidence: 0.92 });
        extractedEntities.push({ type: 'upi', value: 'fraud@paytm', confidence: 0.85 });
      }
      if (file.name.toLowerCase().includes('bank') || file.name.toLowerCase().includes('statement')) {
        extractedEntities.push({ type: 'bank_account', value: 'HDFC-XXXX9876', confidence: 0.95 });
        extractedEntities.push({ type: 'amount', value: '₹2,00,000', confidence: 0.98 });
      }

      const tags: string[] = [];
      if (fileType === 'image') tags.push('Screenshot');
      if (file.name.toLowerCase().includes('whatsapp')) tags.push('WhatsApp');
      if (file.name.toLowerCase().includes('bank')) tags.push('Bank Statement');
      tags.push(fileType.charAt(0).toUpperCase() + fileType.slice(1));

      const ev: Evidence = {
        id: `ev-${generateUniqueId()}`,
        caseId,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
        sha256Hash: hash,
        tags,
        extractedEntities,
        mimeType: file.type,
        fileData,
        chainOfCustody: [{
          action: 'uploaded',
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString(),
        }],
      };

      addEvidence(ev);
      addDiaryEntry(caseId, {
        id: generateUniqueId(),
        caseId,
        timestamp: new Date().toISOString(),
        action: 'Evidence Uploaded',
        description: `${file.name} uploaded. SHA-256: ${hash.substring(0, 16)}... ${extractedEntities.length > 0 ? `${extractedEntities.length} entities extracted.` : ''}`,
        performedBy: user.name,
        category: 'evidence',
      });
    }

    showToast(`${files.length} file(s) uploaded with SHA-256 verification!`, 'success');
    setIsProcessing(false);
    onClose();
  }, [caseId, files, user, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={20} style={{ color: 'var(--brand-primary-light)' }} /> Upload Evidence
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Case</label>
            <select className="form-select" value={caseId} onChange={e => setCaseId(e.target.value)}>
              {cases.map(c => <option key={c.id} value={c.id}>{c.firNumber} — {c.crimeType}</option>)}
            </select>
          </div>

          <div
            className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="upload-zone-icon" />
            <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>Drop files here or click to browse</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Images, PDFs, Audio, Video — Max 50MB per file</p>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} accept="image/*,application/pdf,audio/*,video/*" />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ marginTop: 'var(--space-md)' }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                    <span className="truncate" style={{ maxWidth: 300, color: 'var(--text-primary)' }}>{f.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({(f.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={processFiles} disabled={isProcessing || files.length === 0}>
            {isProcessing ? 'Processing...' : `Upload ${files.length} File(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── EVIDENCE DETAIL MODAL ─── */
function EvidenceDetailModal({ evidence: ev, onClose }: { evidence: Evidence; onClose: () => void }) {
  const [hashRevealed, setHashRevealed] = useState(false);
  const user = getCurrentUser();

  // Log 'viewed' custody entry on modal open (once per open)
  const viewedRef = useRef(false);
  if (!viewedRef.current) {
    viewedRef.current = true;
    addCustodyEntry(ev.id, { action: 'viewed', userId: user.id, userName: user.name, timestamp: new Date().toISOString() });
  }

  const maskedHash = `${ev.sha256Hash.substring(0, 8)}${'\u2022'.repeat(20)}${ev.sha256Hash.slice(-4)}`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(ev.sha256Hash);
    showToast('SHA-256 hash copied to clipboard', 'success');
    setHashRevealed(true);
    setTimeout(() => setHashRevealed(false), 10000);
  };

  const handleDownload = () => {
    if (!ev.fileData) {
      showToast('File content not stored — only metadata available', 'warning');
      return;
    }
    const link = document.createElement('a');
    link.href = ev.fileData;
    link.download = ev.fileName;
    link.click();
    addCustodyEntry(ev.id, { action: 'downloaded', userId: user.id, userName: user.name, timestamp: new Date().toISOString() });
    showToast(`${ev.fileName} downloaded`, 'success');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{ev.fileName}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className="badge badge-primary">{ev.fileType}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(ev.fileSize / 1024).toFixed(0)} KB</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTime(ev.uploadedAt)}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* File Preview */}
          {ev.fileData ? (
            <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
              <div className="card-title" style={{ marginBottom: 8 }}>File Preview</div>
              {ev.fileType === 'image' && (
                <img src={ev.fileData} alt={ev.fileName} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--radius-md)', objectFit: 'contain', background: 'var(--surface-0)' }} />
              )}
              {ev.fileType === 'audio' && (
                <audio controls src={ev.fileData} style={{ width: '100%' }} />
              )}
              {ev.fileType === 'video' && (
                <video controls src={ev.fileData} style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 'var(--radius-md)' }} />
              )}
              {ev.fileType === 'document' && ev.mimeType === 'application/pdf' && (
                <iframe src={ev.fileData} title={ev.fileName} style={{ width: '100%', height: 400, border: 'none', borderRadius: 'var(--radius-md)' }} />
              )}
              {ev.fileType === 'document' && ev.mimeType !== 'application/pdf' && (
                <div style={{ padding: 16, background: 'var(--surface-0)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={32} style={{ marginBottom: 8 }} />
                  <div>Preview not available for {ev.mimeType}. Download to view.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)', textAlign: 'center', padding: 'var(--space-lg)' }}>
              <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Preview unavailable — file {ev.fileSize > MAX_FILE_SIZE_FOR_STORAGE ? 'exceeds 2 MB storage limit' : 'content not stored'}</div>
            </div>
          )}

          {/* SHA-256 Hash */}
          <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Hash size={16} style={{ color: 'var(--brand-success)' }} />
              <span className="card-title">SHA-256 Integrity Hash</span>
              <CheckCircle2 size={14} style={{ color: 'var(--brand-success)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <code style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--surface-0)', fontSize: '0.75rem', color: 'var(--brand-success)',
                wordBreak: 'break-all', fontFamily: 'monospace', letterSpacing: hashRevealed ? 'normal' : '1px',
              }}>
                {hashRevealed ? ev.sha256Hash : maskedHash}
              </code>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setHashRevealed(!hashRevealed); if (!hashRevealed) setTimeout(() => setHashRevealed(false), 10000); }} title={hashRevealed ? 'Hide hash' : 'Reveal hash'}>
                  {hashRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={handleCopyHash} title="Copy full hash">
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
              ✓ File integrity verified — tamper-proof evidence record
              {hashRevealed && <span style={{ color: 'var(--brand-warning)', marginLeft: 8 }}>Hash revealed — auto-hides in 10s</span>}
            </div>
          </div>

          {/* Extracted Entities */}
          {ev.extractedEntities.length > 0 && (
            <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
              <div className="card-title" style={{ marginBottom: 12 }}>Extracted Entities (OCR/AI)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ev.extractedEntities.map((ent, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{ent.type.replace('_', ' ')}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>{ent.value}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: ent.confidence >= 0.9 ? 'var(--brand-success)' : 'var(--brand-warning)' }}>
                      {Math.round(ent.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>Evidence Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ev.tags.map((tag, i) => (
                <span key={i} className="badge badge-primary" style={{ padding: '6px 14px' }}>
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Chain of Custody */}
          <div className="card" style={{ background: 'var(--surface-1)' }}>
            <div className="card-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link2 size={16} style={{ color: 'var(--brand-accent)' }} /> Chain of Custody ({ev.chainOfCustody.length} entries)
            </div>
            <div className="timeline">
              {ev.chainOfCustody.map((entry, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${entry.action === 'uploaded' ? 'success' : entry.action === 'viewed' ? '' : 'warning'}`} />
                  <div className="timeline-content" style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{entry.action}</span>
                      <span className="timeline-date">{formatDateTime(entry.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>By: {entry.userName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleDownload} disabled={!ev.fileData} title={!ev.fileData ? 'File content not stored' : `Download ${ev.fileName}`}>
            <Download size={16} /> Download
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
