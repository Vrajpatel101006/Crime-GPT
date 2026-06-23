/* ============================================
   CRIMEGPT 2.0 — DASHBOARD SHARED COMPONENTS
   ============================================
   Reusable components shared across all dashboard views.
   ============================================ */

import { FolderOpen } from 'lucide-react';
import { formatDate } from '../../store';
import type { CaseRecord } from '../../types';

export function StatCard({ icon: Icon, value, label, change, variant }: {
  icon: any; value: string | number; label: string; change?: string; variant: 'primary' | 'warning' | 'success' | 'info';
}) {
  return (
    <div className={`stat-card ${variant} fade-in-up`}>
      <div className={`stat-icon ${variant}`}><Icon size={22} /></div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {change && <div className="stat-change up">{change}</div>}
      </div>
    </div>
  );
}

export function CaseRow({ c, navigate, showStation }: { c: CaseRecord; navigate: (path: string) => void; showStation?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)',
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-1)')}
      onClick={() => navigate('/cases')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: c.status === 'active' ? 'rgba(201,168,76,0.14)' : c.status === 'approved' ? 'rgba(0,255,65,0.1)' : c.status === 'under_review' ? 'rgba(245,158,11,0.12)' : 'rgba(255,184,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: c.status === 'active' ? 'var(--govt-gold-light)' : c.status === 'approved' ? 'var(--cyber-green)' : c.status === 'under_review' ? '#f59e0b' : 'var(--brand-warning)',
        }}>
          <FolderOpen size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.firNumber}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {c.crimeType} • {c.victim.name}
            {showStation && ` • ${c.assignedStation || c.policeStation}`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {c.classification && (
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            background: c.classification === 'secret' ? 'rgba(239,68,68,0.1)' : c.classification === 'confidential' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
            color: c.classification === 'secret' ? '#ef4444' : c.classification === 'confidential' ? '#f59e0b' : '#10b981',
            border: `1px solid ${c.classification === 'secret' ? 'rgba(239,68,68,0.25)' : c.classification === 'confidential' ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
            textTransform: 'uppercase',
          }}>{c.classification}</span>
        )}
        <div style={{ textAlign: 'right' }}>
          <span className={`badge ${c.status === 'active' ? 'badge-primary' : c.status === 'approved' ? 'badge-success' : c.status === 'under_review' ? 'badge-warning' : 'badge-neutral'}`}>
            {c.status.replace('_', ' ')}
          </span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(c.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

export function ReadinessBar({ c }: { c: CaseRecord }) {
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.firNumber}</span>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: c.readinessScore >= 80 ? 'var(--cyber-green)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{c.readinessScore}%</span>
      </div>
      <div className="confidence-bar">
        <div className={`confidence-fill ${c.readinessScore >= 80 ? 'high' : c.readinessScore >= 50 ? 'medium' : 'low'}`} style={{ width: `${c.readinessScore}%` }} />
      </div>
    </div>
  );
}
