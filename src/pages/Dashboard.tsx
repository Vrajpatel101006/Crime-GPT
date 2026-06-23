/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useTranslation } from '../hooks/useTranslation';
import { StatCard, CaseRow, ReadinessBar } from './dashboard/SharedComponents.tsx';

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
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
   IO DASHBOARD — Investigation Officer
   Focus: My assigned cases, my evidence, readiness
   ═══════════════════════════════════════════ */

function IODashboard({ navigate }: { navigate: (path: string) => void }) {
  const user = getCurrentUser();
  const userRank = getUserRank(user);
  const cases = getAccessibleCases();
  const allEvidence = getEvidence();
  const { t } = useTranslation();

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
          <h1><Briefcase size={28} style={{ color: 'var(--govt-gold-light)' }} /> {t('dashboard.myInvestigations')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • {myActiveCases.length} {myActiveCases.length !== 1 ? t('dashboard.activeInvestigations') : t('dashboard.activeInvestigation')}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/evidence')}>
            <Upload size={16} /> {t('dashboard.uploadEvidence')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> {t('dashboard.newCase')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={FolderOpen} value={myActiveCases.length} label={t('dashboard.activeCases')} change={`${myCases.length} ${t('dashboard.totalAssigned')}`} variant="primary" />
        <StatCard icon={Upload} value={myEvidence.length} label={t('dashboard.myEvidenceFiles')} change={t('dashboard.allHashVerified')} variant="success" />
        <StatCard icon={Clock} value={pendingReviews.length} label={t('dashboard.pendingReviews')} change={t('dashboard.awaitingSHOLegal')} variant="warning" />
        <StatCard icon={BookOpen} value={totalDiaryEntries} label={t('dashboard.diaryEntries')} change={`${avgReadiness}% ${t('dashboard.avgReadiness')}`} variant="info" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* My Cases */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.myActiveCases')}</div>
              <div className="card-subtitle">{t('dashboard.casesAssignedToYou')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {myCases.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noCasesAssignedYet')}</div>
            ) : myCases.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Investigation Readiness */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.investigationReadiness')}</div>
              <div className="card-subtitle">{t('dashboard.caseCompletenessTracker')}</div>
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
                <span className="ring-label">{t('dashboard.average')}</span>
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
            <div className="card-title">{t('dashboard.recentEvidence')}</div>
            <div className="card-subtitle">{t('dashboard.filesYouUploaded')}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/evidence')}>
            View all <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>{t('dashboard.file')}</th><th>{t('dashboard.case')}</th><th>{t('dashboard.type')}</th><th>{t('dashboard.uploaded')}</th><th>{t('dashboard.status')}</th></tr></thead>
            <tbody>
              {myEvidence.slice(0, 5).map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ev.fileName}</td>
                  <td><code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ev.caseId}</code></td>
                  <td><span className="badge badge-neutral">{ev.fileType}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(ev.uploadedAt)}</td>
                  <td><span className="badge badge-success">{t('dashboard.verified')}</span></td>
                </tr>
              ))}
              {myEvidence.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>{t('dashboard.noEvidenceUploadedYet')}</td></tr>
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
  const { t } = useTranslation();

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
          <h1><ShieldCheck size={28} style={{ color: 'var(--govt-gold-light)' }} /> {t('dashboard.stationCommand')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • {t('dashboard.supervising')} {Object.keys(officerWorkload).length} {t('dashboard.officers')}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/review')}>
            <CheckCircle2 size={16} /> {t('dashboard.reviewQueue')} ({pendingApproval.length})
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> {t('dashboard.newCase')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={FolderOpen} value={activeCases.length} label={t('dashboard.activeStationCases')} change={`${stationCases.length} ${t('dashboard.total')}`} variant="primary" />
        <StatCard icon={AlertTriangle} value={pendingApproval.length} label={t('dashboard.pendingMyApproval')} change={t('dashboard.requiresYourReview')} variant="warning" />
        <StatCard icon={Users} value={Object.keys(officerWorkload).length} label={t('dashboard.activeOfficers')} change={t('dashboard.atThisStation')} variant="success" />
        <StatCard icon={BarChart3} value={`${avgReadiness}%`} label={t('dashboard.avgReadiness')} change={t('dashboard.stationWide')} variant="info" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* Approval Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.approvalQueue')}</div>
              <div className="card-subtitle">{t('dashboard.casesAwaitingSHOReview')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/review')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingApproval.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>{t('dashboard.noCasesPendingApproval')}</div>
              </div>
            ) : pendingApproval.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Officer Workload */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.officerWorkload')}</div>
              <div className="card-subtitle">{t('dashboard.caseDistributionAcrossOfficers')}</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {Object.entries(officerWorkload).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noOfficerData')}</div>
            ) : Object.entries(officerWorkload).map(([name, count]) => {
              const maxCount = Math.max(...Object.values(officerWorkload), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={name} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} {count !== 1 ? t('dashboard.cases') : t('dashboard.case')}</span>
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
            <div className="card-title">{t('dashboard.stationCases')}</div>
            <div className="card-subtitle">{t('dashboard.allCasesAt')} {user.station}</div>
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
  const { t } = useTranslation();

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
          <h1><Scale size={28} style={{ color: 'var(--govt-gold-light)' }} /> {t('dashboard.legalReviewDesk')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {t('dashboard.legalAdvisoryWing')} • {pendingLegal.length} {t('dashboard.casesAwaitingReview')}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/legal')}>
            <Scale size={16} /> {t('nav.legal')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/review')}>
            <CheckCircle2 size={16} /> {t('dashboard.reviewQueue')} ({pendingLegal.length})
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={AlertTriangle} value={pendingLegal.length} label={t('dashboard.pendingLegalReview')} change={t('dashboard.requiresYourOpinion')} variant="warning" />
        <StatCard icon={CheckCircle2} value={reviewedCases.length} label={t('dashboard.casesReviewed')} change={t('dashboard.approvedForChargesheet')} variant="success" />
        <StatCard icon={Scale} value={Object.keys(sectionCounts).length} label={t('dashboard.legalSections')} change={t('dashboard.referencedAcrossCases')} variant="info" />
        <StatCard icon={FileText} value={documents.length} label={t('dashboard.documentsDrafted')} change={t('dashboard.courtReadyFiles')} variant="primary" />
      </div>

      <div className="grid-2" style={{ gap: 'var(--space-lg)' }}>
        {/* Legal Review Queue */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.legalReviewQueue')}</div>
              <div className="card-subtitle">{t('dashboard.casesAwaitingLegalOpinion')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/review')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {pendingLegal.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>{t('dashboard.noCasesPendingLegalReview')}</div>
              </div>
            ) : pendingLegal.slice(0, 5).map(c => <CaseRow key={c.id} c={c} navigate={navigate} />)}
          </div>
        </div>

        {/* Most Referenced Legal Sections */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.mostReferencedSections')}</div>
              <div className="card-subtitle">{t('dashboard.bnsBNSSITActUsageAcrossCases')}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/legal')}>
              {t('nav.legal')} <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {topSections.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noSectionData')}</div>
            ) : topSections.map(([sectionId, count]) => {
              const maxCount = topSections[0][1] as number;
              const pct = Math.round((count / (maxCount as number)) * 100);
              return (
                <div key={sectionId} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{sectionId}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{count} {count !== 1 ? t('dashboard.cases') : t('dashboard.case')}</span>
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
            <div className="card-title">{t('dashboard.caseReadinessOverview')}</div>
            <div className="card-subtitle">{t('dashboard.averageReadiness')}: {avgReadiness}% — {t('dashboard.casesVisibleToClearanceLevel')}</div>
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
  const { t } = useTranslation();

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
          <h1><Activity size={28} style={{ color: 'var(--govt-gold-light)' }} /> {t('dashboard.systemCommand')}</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.03em' }}>
            {rankName(userRank)} • {user.station} • {t('dashboard.fullSystemOversight')} • {activeUsers} {t('dashboard.registeredUsers')}
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/audit')}>
            <ScrollText size={16} /> {t('nav.audit')}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin')}>
            <Users size={16} /> {t('dashboard.manageUsers')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            <Plus size={16} /> {t('dashboard.newCase')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger" style={{ marginBottom: 'var(--space-xl)' }}>
        <StatCard icon={Users} value={activeUsers} label={t('dashboard.registeredUsers')} change={t('dashboard.acrossAllStations')} variant="info" />
        <StatCard icon={FolderOpen} value={activeCases} label={t('dashboard.activeCases')} change={`${allCases.length} ${t('dashboard.total')}`} variant="primary" />
        <StatCard icon={BarChart3} value={`${avgReadiness}%`} label={t('dashboard.systemReadiness')} change={t('dashboard.averageScore')} variant="success" />
        <StatCard icon={ScrollText} value={auditLogs.length} label={t('dashboard.auditEvents')} change={t('dashboard.tamperProofTrail')} variant="warning" />
      </div>

      {/* Station & Classification Breakdown */}
      <div className="grid-2" style={{ gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
        {/* Station Performance */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t('dashboard.stationDistribution')}</div>
              <div className="card-subtitle">{t('dashboard.casesAcrossPoliceStations')}</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {Object.entries(stationCounts).length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('dashboard.noStationData')}</div>
            ) : Object.entries(stationCounts).map(([station, count]) => {
              const maxCount = Math.max(...Object.values(stationCounts), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={station} style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{station}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{count} {count !== 1 ? t('dashboard.cases') : t('dashboard.case')}</span>
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
              <div className="card-title">{t('dashboard.dataClassification')}</div>
              <div className="card-subtitle">{t('dashboard.securityClassificationBreakdown')}</div>
            </div>
          </div>
          <div style={{ padding: 'var(--space-md)' }}>
            {[
              { label: t('dashboard.secret'), count: classCounts.secret, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              { label: t('dashboard.confidential'), count: classCounts.confidential, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
              { label: t('dashboard.public'), count: classCounts.public, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('dashboard.evidenceFiles')}</div>
            </div>
            <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{documents.length}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('dashboard.documents')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity — Admin only (audit logs) */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{t('dashboard.recentSystemActivity')}</div>
            <div className="card-subtitle">{t('dashboard.latestActionsAcrossAllUsers')}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit')}>
            {t('dashboard.fullAuditLog')} <ArrowRight size={14} />
          </button>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr><th>{t('dashboard.time')}</th><th>{t('dashboard.user')}</th><th>{t('dashboard.action')}</th><th>{t('dashboard.details')}</th></tr>
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
            <div className="card-title">{t('dashboard.allCases')}</div>
            <div className="card-subtitle">{t('dashboard.completeCaseRegistry')}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/cases')}>
            {t('dashboard.caseManager')} <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {allCases.slice(0, 8).map(c => <CaseRow key={c.id} c={c} navigate={navigate} showStation />)}
        </div>
      </div>
    </div>
  );
}
