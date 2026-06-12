import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen, Upload, FileText,
  AlertTriangle, Clock, Activity, ArrowRight, Plus,
  ShieldCheck, Users, CheckCircle2, Scale, BookOpen,
  BarChart3, ScrollText, Briefcase
} from 'lucide-react';
import {
  getCases, getAccessibleCases, getEvidence, getDocuments, getAuditLogs,
  formatDate, getCurrentRole, getCurrentUser, getUserRank, rankName,
  getAllUsers
} from '../store';
import type { CaseRecord } from '../types';

/* ═══════════════════════════════════════════
   DASHBOARD — Role-specific views
   IO: My investigations focus
   SHO: Station command & approvals
   Legal: Legal review queue
   Admin: System-wide oversight
   ═══════════════════════════════════════════ */

export default function Dashboard() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const role = getCurrentRole();

  useEffect(() => { setTick(t => t + 1); }, []);

  switch (role) {
    case 'io': return <IODashboard navigate={navigate} />;
    case 'sho': return <SHODashboard navigate={navigate} />;
    case 'legal': return <LegalDashboard navigate={navigate} />;
    case 'admin': return <AdminDashboard navigate={navigate} />;
    default: return <IODashboard navigate={navigate} />;
  }
}

/* ═══════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════ */

function StatCard({ icon: Icon, value, label, change, variant }: {
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

function CaseRow({ c, navigate, showStation }: { c: CaseRecord; navigate: (path: string) => void; showStation?: boolean }) {
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

function ReadinessBar({ c }: { c: CaseRecord }) {
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

/* ═══════════════════════════════════════════
   IO DASHBOARD — Investigation Officer
   Focus: My assigned cases, my evidence, readiness
   ═══════════════════════════════════════════ */

function IODashboard({ navigate }: { navigate: (path: string) => void }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const cases = getAccessibleCases();
  const allEvidence = getEvidence();

  // IO-specific: cases assigned to me
  const myCases = cases.filter(c => c.assignedOfficer === user.id);
  const myActiveCases = myCases.filter(c => c.status === 'active' || c.status === 'draft');
  const myEvidence = allEvidence.filter(e => e.uploadedBy === user.id);
  const pendingReviews = myCases.filter(c => c.reviewStatus === 'pending_sho' || c.reviewStatus === 'pending_legal');
  const avgReadiness = myCases.length ? Math.round(myCases.reduce((s, c) => s + c.readinessScore, 0) / myCases.length) : 0;
  const totalDiaryEntries = myCases.reduce((sum, c) => sum + (c.diaryEntries?.length || 0), 0);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><Briefcase size={28} style={{ color: 'var(--govt-gold-light)' }} /> My Investigations</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • {myActiveCases.length} active investigation{myActiveCases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/evidence')}>
            <Upload size={16} /> Upload Evidence
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> New Case
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={FolderOpen} value={myActiveCases.length} label="Active Cases" change={`${myCases.length} total assigned`} variant="primary" />
        <StatCard icon={Upload} value={myEvidence.length} label="My Evidence Files" change="All hash-verified" variant="success" />
        <StatCard icon={Clock} value={pendingReviews.length} label="Pending Reviews" change="Awaiting SHO/Legal" variant="warning" />
        <StatCard icon={BookOpen} value={totalDiaryEntries} label="Diary Entries" change={`${avgReadiness}% avg readiness`} variant="info" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* My Cases */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My Active Cases</div>
              <div className="card-subtitle">Cases assigned to you</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {myCases.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No cases assigned yet</div>
            ) : myCases.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Investigation Readiness */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Investigation Readiness</div>
              <div className="card-subtitle">Case completeness tracker</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--space-md)' }}>
            <div className="readiness-ring">
              <svg viewBox="0 0 100 100">
                <circle className="ring-bg" cx="50" cy="50" r="42" />
                <circle className="ring-fill" cx="50" cy="50" r="42"
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
            <div style={{ width: '100%', marginTop: 'var(--space-lg)' }}>
              {myCases.map(c => <ReadinessBar key={c.id} c={c} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Evidence */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Recent Evidence</div>
            <div className="card-subtitle">Files you've uploaded</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/evidence')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>File</th><th>Case</th><th>Type</th><th>Uploaded</th><th>Status</th></tr></thead>
            <tbody>
              {myEvidence.slice(0, 5).map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.fileName}</td>
                  <td><code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.caseId}</code></td>
                  <td><span className="badge badge-neutral">{ev.fileType}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(ev.uploadedAt)}</td>
                  <td><span className="badge badge-success">Verified</span></td>
                </tr>
              ))}
              {myEvidence.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>No evidence uploaded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHO DASHBOARD — Station House Officer
   Focus: Station overview, approval queue, officer workload
   ═══════════════════════════════════════════ */

function SHODashboard({ navigate }: { navigate: (path: string) => void }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const cases = getAccessibleCases();
  const allUsers = getAllUsers();

  const stationCases = cases.filter(c => (c.assignedStation || c.policeStation) === user.station);
  const activeCases = stationCases.filter(c => c.status === 'active' || c.status === 'under_review');
  const pendingApproval = stationCases.filter(c => c.reviewStatus === 'pending_sho');
  const avgReadiness = stationCases.length ? Math.round(stationCases.reduce((s, c) => s + c.readinessScore, 0) / stationCases.length) : 0;

  // Officer workload — count cases per IO at this station
  const officerWorkload: Record<string, number> = {};
  stationCases.forEach(c => {
    const officer = allUsers[c.assignedOfficer];
    const name = officer?.name || c.assignedOfficer;
    officerWorkload[name] = (officerWorkload[name] || 0) + 1;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><ShieldCheck size={28} style={{ color: 'var(--govt-gold-light)' }} /> Station Command</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • Supervising {Object.keys(officerWorkload).length} officer(s)
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/review')}>
            <CheckCircle2 size={16} /> Review Queue ({pendingApproval.length})
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> New Case
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={FolderOpen} value={activeCases.length} label="Active Station Cases" change={`${stationCases.length} total`} variant="primary" />
        <StatCard icon={AlertTriangle} value={pendingApproval.length} label="Pending My Approval" change="Requires your review" variant="warning" />
        <StatCard icon={Users} value={Object.keys(officerWorkload).length} label="Active Officers" change="At this station" variant="success" />
        <StatCard icon={BarChart3} value={`${avgReadiness}%`} label="Avg Readiness" change="Station-wide" variant="info" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* Approval Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Approval Queue</div>
              <div className="card-subtitle">Cases awaiting SHO review</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/review')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingApproval.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>No cases pending your approval</div>
              </div>
            ) : pendingApproval.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Officer Workload */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Officer Workload</div>
              <div className="card-subtitle">Case distribution across officers</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {Object.entries(officerWorkload).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No officer data</div>
            ) : Object.entries(officerWorkload).map(([name, count]) => {
              const maxCount = Math.max(...Object.values(officerWorkload), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={name} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} case{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill medium" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Station Cases Overview */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Station Cases</div>
            <div className="card-subtitle">All cases at {user.station}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {stationCases.slice(0, 6).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEGAL DASHBOARD — Legal Advisor
   Focus: Legal review queue, sections analysis, judgments
   ═══════════════════════════════════════════ */

function LegalDashboard({ navigate }: { navigate: (path: string) => void }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const cases = getAccessibleCases();
  const documents = getDocuments();

  const pendingLegal = cases.filter(c => c.reviewStatus === 'pending_legal');
  const reviewedCases = cases.filter(c => c.status === 'approved' || c.reviewStatus === 'approved');
  const avgReadiness = cases.length ? Math.round(cases.reduce((s, c) => s + c.readinessScore, 0) / cases.length) : 0;

  // Count most referenced legal sections across all accessible cases
  const sectionCounts: Record<string, number> = {};
  cases.forEach(c => {
    (c.legalSectionIds || []).forEach(sid => {
      sectionCounts[sid] = (sectionCounts[sid] || 0) + 1;
    });
  });
  const topSections = Object.entries(sectionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><Scale size={28} style={{ color: 'var(--govt-gold-light)' }} /> Legal Review Desk</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • Legal Advisory Wing • {pendingLegal.length} case(s) awaiting review
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/legal')}>
            <Scale size={16} /> Legal Intel
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/review')}>
            <CheckCircle2 size={16} /> Review Queue ({pendingLegal.length})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={AlertTriangle} value={pendingLegal.length} label="Pending Legal Review" change="Requires your opinion" variant="warning" />
        <StatCard icon={CheckCircle2} value={reviewedCases.length} label="Cases Reviewed" change="Approved for chargesheet" variant="success" />
        <StatCard icon={Scale} value={Object.keys(sectionCounts).length} label="Legal Sections" change="Referenced across cases" variant="info" />
        <StatCard icon={FileText} value={documents.length} label="Documents Drafted" change="Court-ready files" variant="primary" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* Legal Review Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Legal Review Queue</div>
              <div className="card-subtitle">Cases awaiting legal opinion</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/review')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingLegal.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>No cases pending legal review</div>
              </div>
            ) : pendingLegal.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Most Referenced Legal Sections */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Most Referenced Sections</div>
              <div className="card-subtitle">BNS/BNSS/IT Act usage across cases</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/legal')}>
              Legal Intel <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {topSections.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No section data</div>
            ) : topSections.map(([sectionId, count]) => {
              const maxCount = topSections[0][1] as number;
              const pct = Math.round((count / (maxCount as number)) * 100);
              return (
                <div key={sectionId} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sectionId}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{count} case{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill high" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Investigation Readiness */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">Case Readiness Overview</div>
            <div className="card-subtitle">Average readiness: {avgReadiness}% — cases visible to your clearance level</div>
          </div>
        </div>
        <div style={{ padding: 'var(--space-md)' }}>
          {cases.slice(0, 8).map(c => <ReadinessBar key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADMIN DASHBOARD — Administrator / SP
   Focus: System-wide oversight, audit trail, all stations
   ═══════════════════════════════════════════ */

function AdminDashboard({ navigate }: { navigate: (path: string) => void }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const allCases = getCases();
  const allUsers = getAllUsers();
  const evidence = getEvidence();
  const documents = getDocuments();
  const auditLogs = getAuditLogs();

  const activeUsers = Object.values(allUsers).length;
  const activeCases = allCases.filter(c => c.status === 'active' || c.status === 'under_review').length;
  const avgReadiness = allCases.length ? Math.round(allCases.reduce((s, c) => s + c.readinessScore, 0) / allCases.length) : 0;

  // Station breakdown
  const stationCounts: Record<string, number> = {};
  allCases.forEach(c => {
    const station = c.assignedStation || c.policeStation;
    stationCounts[station] = (stationCounts[station] || 0) + 1;
  });

  // Classification breakdown
  const classCounts = { public: 0, confidential: 0, secret: 0 };
  allCases.forEach(c => {
    if (c.classification) classCounts[c.classification]++;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><Activity size={28} style={{ color: 'var(--govt-gold-light)' }} /> System Command</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • Full system oversight • {activeUsers} registered users
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/audit')}>
            <ScrollText size={16} /> Audit Logs
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
            <Users size={16} /> Manage Users
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> New Case
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={Users} value={activeUsers} label="Registered Users" change="Across all stations" variant="info" />
        <StatCard icon={FolderOpen} value={activeCases} label="Active Cases" change={`${allCases.length} total`} variant="primary" />
        <StatCard icon={BarChart3} value={`${avgReadiness}%`} label="System Readiness" change="Average score" variant="success" />
        <StatCard icon={ScrollText} value={auditLogs.length} label="Audit Events" change="Tamper-proof trail" variant="warning" />
      </div>

      {/* Station & Classification Breakdown */}
      <div className="grid-2" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        {/* Station Performance */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Station Distribution</div>
              <div className="card-subtitle">Cases across police stations</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {Object.entries(stationCounts).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No station data</div>
            ) : Object.entries(stationCounts).map(([station, count]) => {
              const maxCount = Math.max(...Object.values(stationCounts), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={station} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{station}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} case{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill medium" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Classification & Evidence */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Data Classification</div>
              <div className="card-subtitle">Security classification breakdown</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {[
              { label: 'Secret', count: classCounts.secret, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              { label: 'Confidential', count: classCounts.confidential, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { label: 'Public', count: classCounts.public, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            ].map(item => {
              const total = classCounts.secret + classCounts.confidential + classCounts.public;
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.count} ({pct}%)</span>
                  </div>
                  <div className="confidence-bar">
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 'inherit', background: item.color, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '0 var(--space-md) var(--space-md)', display: 'flex', gap: 'var(--space-md)' }}>
            <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{evidence.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Evidence Files</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{documents.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Documents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity — Admin only (audit logs) */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent System Activity</div>
            <div className="card-subtitle">Latest actions across all users</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
            Full Audit Log <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {auditLogs.slice(0, 8).map(log => (
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
                    <span className={`badge ${
                      log.action.includes('CREATE') ? 'badge-primary' :
                      log.action.includes('APPROVE') ? 'badge-success' :
                      log.action.includes('UPLOAD') ? 'badge-info' :
                      log.action.includes('LOGIN') ? 'badge-success' :
                      log.action.includes('LOGOUT') ? 'badge-danger' :
                      'badge-neutral'
                    }`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Cases Table */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <div className="card-title">All Cases</div>
            <div className="card-subtitle">Complete case registry — admin override active</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
            Case Manager <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {allCases.slice(0, 8).map(c => <CaseRow key={c.id} c={c} navigate={navigate} showStation />)}
        </div>
      </div>
    </div>
  );
}
