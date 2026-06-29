import { useState, useCallback, useEffect } from 'react';
import {
  FileText, Plus, Download, Eye, X, CheckCircle2,
  AlertCircle, Loader2, FileCheck, Printer
} from 'lucide-react';
import {
  getAccessibleCases, getDocumentsForCase, addDocument, generateUniqueId,
  formatDateTime, showToast, getCurrentUser, addDiaryEntry, getUserPreferences,
  subscribeUserPreferences,
} from '../store';
import { useTranslation } from '../hooks/useTranslation';
import type { CaseRecord, DocumentType, GeneratedDocument } from '../types';
import { DOC_TYPES, generateDocContent } from './documents/index';

export default function Documents() {
  const { t } = useTranslation();
  const cases = getAccessibleCases();
  const [selectedCase, setSelectedCase] = useState(cases[0]?.id || '');
  const [showGenerate, setShowGenerate] = useState(false);
  const [defaultDocType, setDefaultDocType] = useState<DocumentType>('fir');
  const [previewDoc, setPreviewDoc] = useState<GeneratedDocument | null>(null);
  const [, setTick] = useState(0);

  const currentCase = cases.find(c => c.id === selectedCase);
  const docs = selectedCase ? getDocumentsForCase(selectedCase) : [];

  const refresh = () => setTick(prev => prev + 1);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><FileText size={28} style={{ color: 'var(--brand-primary-light)' }} /> {t('document.title')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>{t('document.description')}</p>
        </div>
        <div className="page-header-actions">
          <select className="form-select" style={{ width: 280 }} value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
            {cases.map(c => <option key={c.id} value={c.id}>{c.firNumber} — {c.crimeType}</option>)}
          </select>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (!currentCase) {
                showToast('Please select a case first', 'warning');
                return;
              }
              setDefaultDocType('fir'); 
              setShowGenerate(true);
            }}
          >
            <Plus size={16} /> {t('document.generate')}
          </button>
        </div>
      </div>

      {/* Document Type Grid */}
      <div className="section-header">
        <div className="section-title">{t('document.availableTemplates')}</div>
      </div>
      <div className="grid-4 stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        {DOC_TYPES.map(dt => (
          <div
            key={dt.value}
            className="card fade-in-up"
            style={{ cursor: 'pointer', textAlign: 'center' }}
            onClick={() => {
              if (!currentCase) {
                showToast('Please select a case first', 'warning');
                return;
              }
              setDefaultDocType(dt.value); 
              setShowGenerate(true);
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: 'rgba(99,102,241,0.12)', color: 'var(--brand-primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-sm)',
            }}>
              <FileText size={22} />
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>{dt.label}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dt.description}</p>
          </div>
        ))}
      </div>

      {/* Generated Documents */}
      <div className="section-header">
        <div className="section-title">{t('document.generatedFor')} {currentCase?.firNumber || t('document.selectCase')}</div>
        <span className="badge badge-primary">{docs.length} {t('document.title').toLowerCase()}</span>
      </div>

      {docs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {docs.map(doc => (
            <div key={doc.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: doc.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
                  color: doc.status === 'approved' ? 'var(--brand-success)' : 'var(--brand-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{doc.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    v{doc.version} • {formatDateTime(doc.generatedAt)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`badge ${doc.status === 'approved' ? 'badge-success' : doc.status === 'validated' ? 'badge-info' : 'badge-neutral'}`}>
                  {doc.status}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewDoc(doc)}>
                  <Eye size={14} /> {t('action.preview')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3>{t('document.noDocuments')}</h3>
          <p>{t('document.selectCaseFirst')}.</p>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && currentCase && (
        <GenerateModal caseData={currentCase} defaultDocType={defaultDocType} onClose={() => { setShowGenerate(false); refresh(); }} t={t} />
      )}

      {/* Preview Modal */}
      {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} t={t} />}
    </div>
  );
}

function GenerateModal({ caseData, defaultDocType, onClose, t }: { caseData: CaseRecord; defaultDocType: DocumentType; onClose: () => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  const user = getCurrentUser();
  const [docType, setDocType] = useState<DocumentType>(defaultDocType);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'gu' | 'hi'>(
    getUserPreferences().documentLanguage
  );
  const [selectedStampId, setSelectedStampId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ content: string; errors: string[] } | null>(null);

  // Subscribe to preference changes (e.g., when user changes language in Settings)
  useEffect(() => {
    return subscribeUserPreferences(() => {
      setSelectedLanguage(getUserPreferences().documentLanguage);
    });
  }, []);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const selectedStamp = (getUserPreferences().stamps || []).find(s => s.id === selectedStampId);
      const result = generateDocContent(caseData, docType, selectedLanguage, {
        selectedStamp
      });
      setGenerated(result);
      setIsGenerating(false);
    }, 1200);
  }, [caseData, docType, selectedLanguage, selectedStampId]);

  const handleSave = useCallback(() => {
    if (!generated) return;
    const docTypeInfo = DOC_TYPES.find(d => d.value === docType);
    const doc: GeneratedDocument = {
      id: `doc-${generateUniqueId()}`,
      caseId: caseData.id,
      type: docType,
      title: docTypeInfo?.label || 'Document',
      content: generated.content,
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      status: generated.errors.length > 0 ? 'draft' : 'validated',
      validationErrors: generated.errors,
      version: 1,
    };
    addDocument(doc);
    addDiaryEntry(caseData.id, {
      id: generateUniqueId(),
      caseId: caseData.id,
      timestamp: new Date().toISOString(),
      action: `${docTypeInfo?.label || 'Document'} Generated`,
      description: `Generated ${docTypeInfo?.label} for case ${caseData.firNumber}. ${generated.errors.length > 0 ? `${generated.errors.length} validation warning(s).` : 'All validations passed.'}`,
      performedBy: user.name,
      category: 'document',
    });
    showToast(`${docTypeInfo?.label} generated successfully!`, 'success');
    onClose();
  }, [generated, docType, caseData, user, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} style={{ color: 'var(--brand-primary-light)' }} /> {t('document.generate')}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {!generated ? (
            <div className="fade-in">
              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">{t('document.type')}</label>
                <select className="form-select" value={docType} onChange={e => setDocType(e.target.value as DocumentType)}>
                  {DOC_TYPES.map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">{t('documents.generateLanguage')}</label>
                <select
                  className="form-select"
                  value={selectedLanguage}
                  onChange={e => setSelectedLanguage(e.target.value as 'en' | 'gu' | 'hi')}
                >
                  <option value="en">English</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {t('documents.languageSelectorDescription')}
                </small>
              </div>

              {(getUserPreferences().stamps || []).length > 0 && (
                <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                  <label className="form-label">Select Digital Stamp</label>
                  <select 
                    className="form-select" 
                    value={selectedStampId} 
                    onChange={e => setSelectedStampId(e.target.value)}
                  >
                    <option value="">-- No Stamp --</option>
                    {(getUserPreferences().stamps || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-md)' }}>
                <div className="card-title" style={{ marginBottom: 8 }}>Case Data Summary</div>
                <div style={{ fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><strong>FIR:</strong> {caseData.firNumber}</div>
                  <div><strong>Crime:</strong> {caseData.crimeType}</div>
                  <div><strong>Victim:</strong> {caseData.victim.name}</div>
                  <div><strong>Accused:</strong> {caseData.accused.name}</div>
                  <div><strong>Evidence:</strong> {caseData.evidenceIds.length} files</div>
                  <div><strong>Sections:</strong> {caseData.legalSectionIds.length} applied</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="fade-in">
              {generated.errors.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  {generated.errors.map((err, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: 4, fontSize: '0.82rem', color: 'var(--brand-danger)' }}>
                      <AlertCircle size={14} /> {err}
                    </div>
                  ))}
                </div>
              )}
              <div className="doc-preview" dangerouslySetInnerHTML={{ __html: generated.content }} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          {!generated ? (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <><Loader2 size={16} className="spin" /> {t('legal.analyzing')}...</> : <><FileText size={16} /> {t('document.generate')}</>}
            </button>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => setGenerated(null)}>{t('action.back')}</button>
              <button className="btn btn-success" onClick={handleSave}>
                <CheckCircle2 size={16} /> {t('action.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ doc, onClose }: { doc: GeneratedDocument; onClose: () => void; t: (key: string, params?: Record<string, string | number>) => string }) {
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${doc.title}</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; line-height: 1.5; color: #000; padding: 40px; }
            .doc-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .doc-emblem { font-weight: bold; font-size: 16px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
            .doc-title { font-weight: bold; font-size: 22px; text-decoration: underline; margin-bottom: 4px; }
            .doc-subtitle { font-size: 14px; color: #333; }
            .doc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; }
            .doc-field { font-weight: bold; }
            .doc-section { margin-bottom: 25px; }
            .doc-section-title { font-weight: bold; font-size: 14px; text-decoration: underline; text-transform: uppercase; margin-bottom: 12px; }
            .doc-fields { display: grid; grid-template-columns: 200px 1fr; gap: 8px 16px; margin: 0; }
            .doc-fields dt { font-weight: bold; }
            .doc-fields dd { margin: 0; }
            .doc-narrative { text-align: justify; white-space: pre-wrap; margin-top: 10px; }
            .doc-numbered { margin: 10px 0 10px 20px; padding: 0; list-style-type: decimal; }
            .doc-numbered li { margin-bottom: 5px; }
            .doc-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
            .doc-sig-block { text-align: center; }
            .doc-sig-line { border-top: 1px solid #000; padding-top: 8px; margin-top: 60px; font-weight: bold; }
            .doc-note { text-align: center; font-size: 10px; color: #666; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; }
            .doc-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .doc-table th, .doc-table td { border: 1px solid #000; padding: 8px; text-align: left; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          ${doc.content || ''}
          <script>
            window.onload = () => {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportDocx = () => {
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const postHtml = "</body></html>";
    const htmlStr = preHtml + (doc.content || '') + postHtml;
    const blob = new Blob(['\ufeff', htmlStr], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{doc.title}</h3>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className={`badge ${doc.status === 'approved' ? 'badge-success' : 'badge-info'}`}>{doc.status}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{doc.version} • {formatDateTime(doc.generatedAt)}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="doc-preview" dangerouslySetInnerHTML={{ __html: doc.content || '<p>[Document content — Generated from case data using verified templates]</p>' }} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Download size={16} /> Export PDF
          </button>
          <button className="btn btn-secondary" onClick={handleExportDocx}>
            <Download size={16} /> Export DOCX
          </button>
          <button className="btn btn-ghost" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}
