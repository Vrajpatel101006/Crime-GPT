import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Upload, FileText, TrendingUp, TrendingDown,
  AlertTriangle, Clock, Activity, ArrowRight, Plus
} from 'lucide-react';
import { getCases, getEvidence, getDocuments, getAuditLogs, formatDate, getCurrentRole } from '../store';

export default function Dashboard() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const role = getCurrentRole();

  useEffect(() => { setTick(t => t + 1); }, []);

  const cases = getCases();
  const evidence = getEvidence();
  const documents = getDocuments();
  const auditLogs = getAuditLogs();


  const pendingReview = cases.filter(c => c.reviewStatus === 'pending_sho' || c.reviewStatus === 'pending_legal').length;
  const avgReadiness = cases.length ? Math.round(cases.reduce((s, c) => s + c.readinessScore, 0) / cases.length) : 0;

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1><Activity size={28} style={{ color: 'var(--govt-gold-light)' }} /> Dashboard</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>Welcome back, {role === 'io' ? 'Inspector' : role === 'sho' ? 'SHO' : role === 'legal' ? 'Advisor' : 'Admin'}. Here&apos;s your investigation overview.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> New Case
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card primary fade-in-up">
          <div className="stat-icon primary"><FolderOpen size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{cases.length}</div>
            <div className="stat-label">Total Cases</div>
            <div className="stat-change up"><TrendingUp size={12} /> +2 this week</div>
          </div>
        </div>
        <div className="stat-card warning fade-in-up">
          <div className="stat-icon warning"><AlertTriangle size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{pendingReview}</div>
            <div className="stat-label">Pending Reviews</div>
            <div className="stat-change down"><TrendingDown size={12} /> Needs attention</div>
          </div>
        </div>
        <div className="stat-card success fade-in-up">
          <div className="stat-icon success"><Upload size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{evidence.length}</div>
            <div className="stat-label">Evidence Files</div>
            <div className="stat-change up"><TrendingUp size={12} /> All verified</div>
          </div>
        </div>
        <div className="stat-card info fade-in-up">
          <div className="stat-icon info"><FileText size={22} /></div>
          <div className="stat-info">
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">Documents Generated</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* Recent Cases */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Cases</div>
              <div className="card-subtitle">Latest investigations</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {cases.slice(0, 4).map(c => (
              <div
                key={c.id}
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
                    background: c.status === 'active' ? 'rgba(201,168,76,0.14)' : c.status === 'approved' ? 'rgba(0,255,65,0.1)' : 'rgba(255,184,0,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.status === 'active' ? 'var(--govt-gold-light)' : c.status === 'approved' ? 'var(--cyber-green)' : 'var(--brand-warning)',
                  }}>
                    <FolderOpen size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.firNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.crimeType} • {c.victim.name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${c.status === 'active' ? 'badge-primary' : c.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                    {c.status.replace('_', ' ')}
                  </span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{formatDate(c.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Investigation Readiness */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Investigation Readiness</div>
              <div className="card-subtitle">Average case completeness</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--space-md)' }}>
            {/* Readiness Ring */}
            <div className="readiness-ring">
              <svg viewBox="0 0 100 100">
                <circle className="ring-bg" cx="50" cy="50" r="42" />
                <circle
                  className="ring-fill"
                  cx="50" cy="50" r="42"
                  stroke={avgReadiness >= 80 ? 'var(--cyber-green)' : avgReadiness >= 50 ? 'var(--govt-gold)' : 'var(--brand-danger)'}
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - avgReadiness / 100)}`}
                />
              </svg>
              <div className="ring-text">
                <span className="ring-value">{avgReadiness}</span>
                <span className="ring-label">Average</span>
              </div>
            </div>

            {/* Per-case readiness */}
            <div style={{ width: '100%', marginTop: 'var(--space-lg)' }}>
              {cases.map(c => (
                <div key={c.id} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{c.firNumber}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: c.readinessScore >= 80 ? 'var(--cyber-green)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{c.readinessScore}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className={`confidence-fill ${c.readinessScore >= 80 ? 'high' : c.readinessScore >= 50 ? 'medium' : 'low'}`}
                      style={{ width: `${c.readinessScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Recent Activity</div>
            <div className="card-subtitle">Latest actions across the system</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 6).map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                      {formatDate(log.timestamp)}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.userName}</span>
                    <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{log.userRole.toUpperCase()}</span>
                  </td>
                  <td>
                    <span className={`badge ${log.action.includes('CREATE') ? 'badge-primary' : log.action.includes('APPROVE') ? 'badge-success' : log.action.includes('UPLOAD') ? 'badge-info' : 'badge-neutral'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
