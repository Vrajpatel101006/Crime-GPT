/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import {
  BookOpen, Search, Calendar, User, FileText,
  Upload, Shield, Gavel, Eye
} from 'lucide-react';
import { getAccessibleCases, formatDateTime } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import type { DiaryEntry } from '../types';

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  complaint: { icon: FileText, color: 'var(--brand-primary-light)', bg: 'rgba(99,102,241,0.12)' },
  evidence: { icon: Upload, color: 'var(--brand-success)', bg: 'rgba(16,185,129,0.12)' },
  witness: { icon: User, color: 'var(--brand-info)', bg: 'rgba(59,130,246,0.12)' },
  arrest: { icon: Shield, color: 'var(--brand-danger)', bg: 'rgba(239,68,68,0.12)' },
  legal: { icon: Gavel, color: 'var(--brand-warning)', bg: 'rgba(245,158,11,0.12)' },
  document: { icon: FileText, color: 'var(--brand-accent)', bg: 'rgba(6,182,212,0.12)' },
  review: { icon: Eye, color: 'var(--brand-primary-light)', bg: 'rgba(99,102,241,0.12)' },
  other: { icon: Calendar, color: 'var(--text-muted)', bg: 'var(--surface-3)' },
};

export default function CaseDiary() {
  const { t } = useTranslation();
  const cases = getAccessibleCases();
  const [selectedCase, setSelectedCase] = useState(cases[0]?.id || '');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const currentCase = cases.find(c => c.id === selectedCase);
  const allEntries: (DiaryEntry & { caseFir?: string })[] = selectedCase === 'all'
    ? cases.flatMap(c => c.diaryEntries.map(e => ({ ...e, caseFir: c.firNumber })))
    : (currentCase?.diaryEntries || []);

  const filtered = allEntries
    .filter(e => {
      const matchSearch = e.action.toLowerCase().includes(search.toLowerCase()) ||
        e.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><BookOpen size={28} style={{ color: 'var(--brand-primary-light)' }} /> {t('diary.title')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>{t('diary.pageDescription')}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ minWidth: 220 }}>
          <label className="form-label">{t('diary.caseLabel')}</label>
          <select className="form-select" value={selectedCase} onChange={e => setSelectedCase(e.target.value)}>
            <option value="all">{t('dashboard.allCases')}</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.firNumber} — {c.crimeType}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 180 }}>
          <label className="form-label">{t('diary.categoryLabel')}</label>
          <select className="form-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="all">{t('diary.allCategories')}</option>
            <option value="complaint">{t('diary.complaint')}</option>
            <option value="evidence">{t('diary.evidence')}</option>
            <option value="witness">{t('diary.witness')}</option>
            <option value="arrest">{t('diary.arrest')}</option>
            <option value="legal">{t('diary.legal')}</option>
            <option value="document">{t('diary.document')}</option>
            <option value="review">{t('diary.review')}</option>
            <option value="other">{t('diary.other')}</option>
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label">{t('diary.searchLabel')}</label>
          <div className="search-box" style={{ maxWidth: '100%' }}>
            <Search className="search-icon" size={16} />
            <input placeholder={t('diary.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card primary">
          <div className="stat-icon primary"><BookOpen size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-label">{t('diary.totalEntries')}</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><Upload size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{filtered.filter(e => e.category === 'evidence').length}</div>
            <div className="stat-label">{t('diary.evidenceActions')}</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning"><Gavel size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{filtered.filter(e => e.category === 'legal').length}</div>
            <div className="stat-label">{t('diary.legalActions')}</div>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon info"><User size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{filtered.filter(e => e.category === 'witness').length}</div>
            <div className="stat-label">Witness Actions</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length > 0 ? (
        <div className="timeline stagger">
          {filtered.map((entry, i) => {
            const config = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
            const Icon = config.icon;
            return (
              <div key={entry.id || i} className="timeline-item fade-in-up">
                <div className={`timeline-dot ${entry.category === 'evidence' ? 'success' : entry.category === 'arrest' ? 'danger' : entry.category === 'legal' ? 'warning' : ''}`} />
                <div className="timeline-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                        background: config.bg, color: config.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <div className="timeline-title">{entry.action}</div>
                        {'caseFir' in entry && entry.caseFir && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6rem', marginTop: 2 }}>{entry.caseFir}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="timeline-date">{formatDateTime(entry.timestamp)}</div>
                      <span className={`badge ${entry.category === 'evidence' ? 'badge-success' : entry.category === 'legal' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.6rem', marginTop: 4 }}>
                        {entry.category}
                      </span>
                    </div>
                  </div>
                  <div className="timeline-desc">{entry.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <User size={11} /> {entry.performedBy}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 'var(--space-2xl)' }}>
          <BookOpen className="empty-state-icon" />
          <h3>No diary entries found</h3>
          <p>Case diary entries are automatically created as investigation actions occur.</p>
        </div>
      )}
    </div>
  );
}
