import { useState, useCallback } from 'react';
import {
  Scale, Search, BookOpen, Loader2, ChevronRight,
  Gavel, AlertCircle, Sparkles, Database, Brain, Layers
} from 'lucide-react';
import { getLegalSections, getJudgments, simulateLegalAnalysis, showToast } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { getLegalSectionTranslations, getJudgmentTranslations } from './documents/docTranslations';
import type { LegalSection, LegalSuggestion, Judgment } from '../types';
import type { LegalSectionTranslations, JudgmentTranslations } from './documents/docTranslations';

export default function LegalIntel() {
  const { t, language } = useTranslation();
  const LEGAL_SECTIONS = getLegalSections();
  const JUDGMENTS = getJudgments();
  const legalT = getLegalSectionTranslations(language);
  const judgmentT = getJudgmentTranslations(language);
  const [tab, setTab] = useState<'analyze' | 'sections' | 'judgments'>('analyze');
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<LegalSuggestion[]>([]);
  const [relJudgments, setRelJudgments] = useState<Judgment[]>([]);
  const [searchSections, setSearchSections] = useState('');

  const runAnalysis = useCallback(async () => {
    if (!query.trim()) { showToast(t('legal.enterNarrative'), 'warning'); return; }
    setIsAnalyzing(true);
    try {
      const result = await simulateLegalAnalysis(query);
      setSuggestions(result.suggestions);
      setRelJudgments(result.judgments);
      showToast(`${t('legal.foundSections')} ${result.suggestions.length} ${t('legal.relevantSections')}`, 'success');
    } catch { showToast(t('legal.analysisFailed'), 'error'); }
    finally { setIsAnalyzing(false); }
  }, [query, t]);

  const filteredSections = LEGAL_SECTIONS.filter(s =>
    s.sectionNumber.includes(searchSections) ||
    s.title.toLowerCase().includes(searchSections.toLowerCase()) ||
    s.act.toLowerCase().includes(searchSections.toLowerCase()) ||
    s.keywords.some(k => k.toLowerCase().includes(searchSections.toLowerCase()))
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><Scale size={28} style={{ color: 'var(--brand-primary-light)' }} /> {t('legal.title')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>{t('legal.pageDescription')}</p>
        </div>
      </div>

      {/* Knowledge Base Architecture */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card" style={{ borderTop: '2px solid var(--brand-info)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Database size={20} style={{ color: 'var(--brand-info)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t('legal.layer1Title')}</span>
          </div>
          <p style={{ fontSize: '0.8rem' }}>{t('legal.layer1Desc')}</p>
          <div className="badge badge-info" style={{ marginTop: 10 }}>{LEGAL_SECTIONS.length} {t('legal.sectionsLoaded')}</div>
        </div>
        <div className="card" style={{ borderTop: '2px solid var(--brand-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Brain size={20} style={{ color: 'var(--brand-primary-light)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t('legal.layer2Title')}</span>
          </div>
          <p style={{ fontSize: '0.8rem' }}>{t('legal.layer2Desc')}</p>
          <div className="badge badge-primary" style={{ marginTop: 10 }}>{t('legal.aiProcessed')}</div>
        </div>
        <div className="card" style={{ borderTop: '2px solid var(--brand-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Layers size={20} style={{ color: 'var(--brand-accent)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t('legal.layer3Title')}</span>
          </div>
          <p style={{ fontSize: '0.8rem' }}>{t('legal.layer3Desc')}</p>
          <div className="badge badge-neutral" style={{ marginTop: 10 }}>{t('legal.semanticSearch')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'analyze' ? 'active' : ''}`} onClick={() => setTab('analyze')}>
          <Sparkles size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t('legal.aiAnalysis')}
        </button>
        <button className={`tab ${tab === 'sections' ? 'active' : ''}`} onClick={() => setTab('sections')}>
          <BookOpen size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t('legal.sections')} ({LEGAL_SECTIONS.length})
        </button>
        <button className={`tab ${tab === 'judgments' ? 'active' : ''}`} onClick={() => setTab('judgments')}>
          <Gavel size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {t('legal.judgments')} ({JUDGMENTS.length})
        </button>
      </div>

      {/* AI Analysis Tab */}
      {tab === 'analyze' && (
        <div className="fade-in">
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="card-title" style={{ marginBottom: 12 }}>{t('legal.narrativeAnalysis')}</div>
            <textarea
              className="form-textarea"
              rows={4}
              maxLength={5000}
              placeholder={t('legal.narrativePlaceholder')}
              value={query}
              onChange={e => setQuery(e.target.value.slice(0, 5000))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: '0.72rem', color: query.length > 4800 ? 'var(--brand-warning)' : 'var(--text-muted)' }}>{query.length} / 5000</span>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={isAnalyzing}>
                {isAnalyzing ? <><Loader2 size={16} className="spin" /> {t('legal.analyzing')}...</> : <><Sparkles size={16} /> {t('legal.analyze')}</>}
              </button>
            </div>
          </div>

          {suggestions.length > 0 && (
            <>
              <div className="section-header">
                <div className="section-title">{t('legal.suggestions')}</div>
                <span className="badge badge-success">{suggestions.length} {t('legal.relevantSections')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                {suggestions.map((s, i) => {
                  const secTranslated = legalT[s.section.id];
                  const secTitle = secTranslated?.title || s.section.title;
                  const secPunishment = secTranslated?.punishment || s.section.punishment;
                  return (
                  <div key={i} className="card" style={{ background: 'var(--surface-1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span className="badge badge-primary">{s.section.act} {s.section.sectionNumber}</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{secTitle}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{s.reasoning}</p>
                        {s.matchedKeywords.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {s.matchedKeywords.map((kw, j) => (
                              <span key={j} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{kw}</span>
                            ))}
                          </div>
                        )}
                        {secPunishment && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--brand-warning)', marginTop: 8 }}>
                            ⚖️ <strong>Punishment:</strong> {secPunishment}
                          </div>
                        )}
                        {s.section.legacyReference && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--brand-info)', marginTop: 4 }}>
                            📜 <strong>Replaces:</strong> {s.section.legacyReference}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', minWidth: 70 }}>
                        <div style={{
                          fontSize: '1.5rem', fontWeight: 800,
                          color: s.confidence >= 0.8 ? 'var(--brand-success)' : s.confidence >= 0.6 ? 'var(--brand-warning)' : 'var(--brand-danger)',
                        }}>
                          {Math.round(s.confidence * 100)}%
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>confidence</div>
                      </div>
                    </div>
                    <div className="confidence-bar" style={{ marginTop: 12 }}>
                      <div className={`confidence-fill ${s.confidence >= 0.8 ? 'high' : s.confidence >= 0.6 ? 'medium' : 'low'}`} style={{ width: `${s.confidence * 100}%` }} />
                    </div>
                  </div>
                );
                })}
              </div>

              {relJudgments.length > 0 && (
                <>
                  <div className="section-header">
                    <div className="section-title">Relevant Judgments</div>
                  </div>
                  {relJudgments.map(j => {
                    const jTranslated = judgmentT[j.id];
                    const jTitle = jTranslated?.title || j.title;
                    const jSummary = jTranslated?.summary || j.summary;
                    return (
                    <div key={j.id} className="card" style={{ background: 'var(--surface-1)', marginBottom: 'var(--space-sm)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Gavel size={16} style={{ color: 'var(--brand-warning)' }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{jTitle}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{j.court} • {j.year} • {j.citation}</div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{jSummary}</p>
                    </div>
                    );
                  })}
                </>
              )}

              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginTop: 'var(--space-md)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertCircle size={18} style={{ color: 'var(--brand-warning)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600 }}>⚠ AI Disclaimer</div>
                  <span style={{ fontSize: '0.80rem', color: 'var(--text-secondary)' }}>AI analysis can make mistakes. Officers must verify all recommendations before proceeding. Final approval is mandatory.</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Legal Sections Tab */}
      {tab === 'sections' && (
        <div className="fade-in">
          <div className="search-box" style={{ marginBottom: 'var(--space-lg)', maxWidth: 500 }}>
            <Search className="search-icon" size={16} />
            <input placeholder="Search by section number, title, act, or keyword..." value={searchSections} onChange={e => setSearchSections(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {filteredSections.map(s => (
              <SectionCard key={s.id} section={s} legalT={legalT} />
            ))}
          </div>
        </div>
      )}

      {/* Judgments Tab */}
      {tab === 'judgments' && (
        <div className="fade-in">
          {JUDGMENTS.map(j => {
            const translated = judgmentT[j.id];
            const title = translated?.title || j.title;
            const summary = translated?.summary || j.summary;
            return (
              <div key={j.id} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Gavel size={18} style={{ color: 'var(--brand-warning)' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{title}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>{j.court} • {j.year} • {j.citation}</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{summary}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {j.relevantSections.map(sid => {
                    const sec = LEGAL_SECTIONS.find(s => s.id === sid);
                    const secTranslated = sec ? legalT[sec.id]?.title : null;
                    return sec ? <span key={sid} className="badge badge-primary">{sec.act} {sec.sectionNumber} — {secTranslated || sec.title}</span> : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section: s, legalT }: { section: LegalSection; legalT: LegalSectionTranslations }) {
  const [expanded, setExpanded] = useState(false);
  const translated = legalT[s.id];
  const title = translated?.title || s.title;
  const description = translated?.description || s.description;
  const punishment = translated?.punishment || s.punishment;

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge ${s.act === 'BNS' ? 'badge-primary' : s.act === 'BNSS' ? 'badge-info' : s.act === 'BSA' ? 'badge-warning' : s.act === 'IT Act' ? 'badge-success' : s.act === 'DPDP Act' ? 'badge-success' : s.act === 'POCSO' ? 'badge-danger' : 'badge-info'}`}>
            {s.act} {s.sectionNumber}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
        </div>
        <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
      </div>
      {expanded && (
        <div className="fade-in" style={{ marginTop: 12 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{description}</p>
          {s.keywords.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Keywords: </span>
              {s.keywords.map((k, i) => <span key={i} className="badge badge-neutral" style={{ marginRight: 4, fontSize: '0.65rem' }}>{k}</span>)}
            </div>
          )}
          {s.crimeTypes.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Crime Types: </span>
              {s.crimeTypes.map((ct, i) => <span key={i} className="badge badge-primary" style={{ marginRight: 4, fontSize: '0.65rem' }}>{ct}</span>)}
            </div>
          )}
          {s.evidence_required.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Evidence Required: </span>
              {s.evidence_required.map((e, i) => <span key={i} className="badge badge-info" style={{ marginRight: 4, fontSize: '0.65rem' }}>{e}</span>)}
            </div>
          )}
          {punishment && (
            <div style={{ fontSize: '0.82rem', color: 'var(--brand-warning)' }}>⚖️ <strong>Punishment:</strong> {punishment}</div>
          )}
          {s.legacyReference && (
            <div style={{ fontSize: '0.78rem', color: 'var(--brand-info)', marginTop: 6 }}>📜 <strong>Replaces:</strong> {s.legacyReference}</div>
          )}
        </div>
      )}
    </div>
  );
}
