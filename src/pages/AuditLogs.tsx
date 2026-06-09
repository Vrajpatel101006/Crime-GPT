import { useState } from 'react';
import {
  ScrollText, Search, Clock, Shield,
  FileText, Upload, Eye, CheckCircle2, AlertCircle,
  Download, LogIn, LogOut
} from 'lucide-react';
import { getAuditLogs, formatDateTime, showToast } from '../store';

const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  CREATE_CASE: { color: 'var(--brand-primary-light)', bg: 'rgba(99,102,241,0.12)', icon: FileText },
  UPLOAD_EVIDENCE: { color: 'var(--brand-success)', bg: 'rgba(16,185,129,0.12)', icon: Upload },
  VIEW_EVIDENCE: { color: 'var(--brand-info)', bg: 'rgba(59,130,246,0.12)', icon: Eye },
  GENERATE_DOC: { color: 'var(--brand-accent)', bg: 'rgba(6,182,212,0.12)', icon: FileText },
  APPROVE_CASE: { color: 'var(--brand-success)', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  RETURN_CASE: { color: 'var(--brand-danger)', bg: 'rgba(239,68,68,0.12)', icon: AlertCircle },
  DIARY_ENTRY: { color: 'var(--brand-warning)', bg: 'rgba(245,158,11,0.12)', icon: ScrollText },
  ROLE_SWITCH: { color: 'var(--text-muted)', bg: 'var(--surface-3)', icon: Shield },
  LOGIN: { color: 'var(--brand-success)', bg: 'rgba(16,185,129,0.12)', icon: LogIn },
  LOGOUT: { color: 'var(--brand-danger)', bg: 'rgba(239,68,68,0.12)', icon: LogOut },
};

export default function AuditLogs() {
  const [logs, setLogs] = useState(getAuditLogs);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterRole, setFilterRole] = useState('all');

  const refresh = () => setLogs(getAuditLogs());

  const filtered = logs.filter(l => {
    const matchSearch = l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || l.action === filterAction;
    const matchRole = filterRole === 'all' || l.userRole === filterRole;
    return matchSearch && matchAction && matchRole;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1><ScrollText size={28} style={{ color: 'var(--brand-primary-light)' }} /> Audit Logs</h1>
          <p className="text-sm text-muted" style={{ marginTop: 4 }}>Immutable record of all system actions — tamper-proof audit trail</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={refresh}>Refresh</button>
          <button className="btn btn-secondary" onClick={() => showToast('CSV export simulated — In production, this would download a complete audit log CSV file.', 'info')}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card primary">
          <div className="stat-icon primary"><ScrollText size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{logs.length}</div>
            <div className="stat-label">Total Actions</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><Upload size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{logs.filter(l => l.action === 'UPLOAD_EVIDENCE').length}</div>
            <div className="stat-label">Evidence Uploads</div>
          </div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon info"><FileText size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{logs.filter(l => l.action === 'GENERATE_DOC').length}</div>
            <div className="stat-label">Documents Generated</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning"><CheckCircle2 size={20} /></div>
          <div className="stat-info">
            <div className="stat-value">{logs.filter(l => l.action === 'APPROVE_CASE').length}</div>
            <div className="stat-label">Case Approvals</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
          <Search className="search-icon" size={16} />
          <input placeholder="Search audit logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 200 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
        </select>
        <select className="form-select" style={{ width: 180 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="io">Investigation Officer</option>
          <option value="sho">Station House Officer</option>
          <option value="legal">Legal Advisor</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {/* Integrity Banner */}
      <div style={{
        background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
        borderRadius: 'var(--radius-md)', padding: '12px var(--space-md)',
        marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Shield size={18} style={{ color: 'var(--brand-success)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--brand-success)' }}>Immutable Audit Trail</strong> — All actions are cryptographically logged. Records cannot be modified or deleted.
        </span>
      </div>

      {/* Log Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => {
              const config = ACTION_CONFIG[log.action] || { color: 'var(--text-muted)', bg: 'var(--surface-3)', icon: ScrollText };
              const Icon = config.icon;
              return (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{filtered.length - i}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.82rem' }}>{formatDateTime(log.timestamp)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {log.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{log.userName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'uppercase' }}>{log.userRole}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                        background: config.bg, color: config.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={13} />
                      </div>
                      <span className={`badge ${
                        log.action.includes('CREATE') ? 'badge-primary' :
                        log.action.includes('APPROVE') ? 'badge-success' :
                        log.action.includes('UPLOAD') ? 'badge-info' :
                        log.action.includes('RETURN') ? 'badge-danger' :
                        log.action.includes('GENERATE') ? 'badge-warning' :
                        'badge-neutral'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{log.target}</code>
                  </td>
                  <td style={{ maxWidth: 280, fontSize: '0.82rem' }}>
                    <span className="truncate" style={{ display: 'block' }}>{log.details}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="empty-state" style={{ marginTop: 'var(--space-xl)' }}>
          <ScrollText className="empty-state-icon" />
          <h3>No audit logs match your filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      )}

      <div style={{ textAlign: 'center', padding: 'var(--space-lg)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {logs.length} total records • Immutable audit trail active
      </div>
    </div>
  );
}
