import { useState, useEffect } from 'react';
import { Users, Shield, Settings as SettingsIcon, Plus, Edit3, Trash2, Save, X, UserCheck, Lock, Bell, Database, Globe, Search, ShieldAlert, Ban, Clock } from 'lucide-react';
import {
  getAllUsers, showToast, getCurrentUser, getUserState, subscribeUserState,
  suspendUser, unsuspendUser, toggleUserActive,
  getPermissions, setPermissions, subscribePermissions,
  getSettings, updateSettings, subscribeSettings,
} from '../store';
import type { UserRole } from '../types';
import type { PermKey, SystemSettings } from '../store';

/* ─── USER TYPE ─── */
interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  badge: string;
  station: string;
  email: string;
  active: boolean;
  lastLogin: string;
}

/* ─── USER LIST HELPER ─── */
function buildAppUsers(): AppUser[] {
  return Object.values(getAllUsers()).map(u => ({
    ...u,
    active: true,
    lastLogin: u.role === 'io' ? '2026-06-08T09:15:00Z' : u.role === 'sho' ? '2026-06-07T14:30:00Z' : u.role === 'legal' ? '2026-06-06T11:00:00Z' : '2026-06-05T10:00:00Z',
  }));
}

/* ─── ROLE PERMISSIONS ─── */
const PERMISSIONS = [
  { key: 'create_case', label: 'Create New Case' },
  { key: 'edit_case', label: 'Edit Case Details' },
  { key: 'delete_case', label: 'Delete Case' },
  { key: 'upload_evidence', label: 'Upload Evidence' },
  { key: 'delete_evidence', label: 'Delete Evidence' },
  { key: 'generate_doc', label: 'Generate Documents' },
  { key: 'approve_case', label: 'Approve/Reject Case' },
  { key: 'assign_officer', label: 'Assign Officer' },
  { key: 'view_audit', label: 'View Audit Logs' },
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'export_data', label: 'Export Case Data' },
  { key: 'legal_review', label: 'Legal Review' },
] as const;

/* ─── SYSTEM SETTINGS ─── */

const ROLE_LABELS: Record<UserRole, string> = {
  io: 'Investigation Officer',
  sho: 'Station House Officer',
  legal: 'Legal Advisor',
  admin: 'Administrator',
};

const ROLE_COLORS: Record<UserRole, string> = {
  io: '#6366f1',
  sho: '#f59e0b',
  legal: '#10b981',
  admin: '#ef4444',
};

/* ─── MAIN EXPORT ─── */
export default function Admin() {
  const user = getCurrentUser();
  const [tab, setTab] = useState<'users' | 'roles' | 'settings'>('users');

  if (user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: 16 }} />
        <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6 }}>
          The Administration section is restricted to users with the <strong>Administrator</strong> role.
          Please contact your system administrator if you need access.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Administration</h1>
          <p className="text-muted">Manage users, roles, and system configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'users' as const, icon: Users, label: 'Users' },
          { key: 'roles' as const, icon: Shield, label: 'Roles & Permissions' },
          { key: 'settings' as const, icon: SettingsIcon, label: 'System Settings' },
        ].map(t => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

/* ─── USERS TAB ─── */
function UsersTab() {
  const [users, setUsers] = useState<AppUser[]>(buildAppUsers);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [suspending, setSuspending] = useState<AppUser | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => subscribeUserState(() => forceUpdate(n => n + 1)), []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.badge.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || ROLE_LABELS[u.role].toLowerCase().includes(q) || u.station.toLowerCase().includes(q);
    const uState = getUserState(u.id);
    const isSuspended = uState?.suspendedUntil && new Date(uState.suspendedUntil) > new Date();
    const status = isSuspended ? 'suspended' : uState?.active ? 'active' : 'inactive';
    const matchStatus = filterStatus === 'all' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = (id: string) => {
    if (users.length <= 1) { showToast('Cannot delete the last user.', 'error'); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
    showToast('User removed successfully.', 'success');
  };

  const handleToggleActive = (id: string) => {
    toggleUserActive(id);
    const uState = getUserState(id);
    showToast(`User ${uState?.active ? 'activated' : 'deactivated'}.`, 'info');
  };

  const handleSave = (updated: AppUser) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditing(null);
    showToast('User updated successfully.', 'success');
  };

  const handleAdd = (newUser: AppUser) => {
    setUsers(prev => [...prev, newUser]);
    setShowAdd(false);
    showToast('New user added successfully.', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Registered Users</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>{users.length} users registered in the system</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select className="form-select" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search name, email, badge, station..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, width: 260 }} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Badge No.</th>
              <th>Station</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  <Search size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No users found{search ? ` matching "${search}"` : ''}</p>
                </td>
              </tr>
            )}
            {filtered.map(u => {
              const uState = getUserState(u.id);
              const isSuspended = !!(uState?.suspendedUntil && new Date(uState.suspendedUntil) > new Date());
              const lastLogin = uState?.lastLogin ? new Date(uState.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

              return (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: ROLE_COLORS[u.role],
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.75rem',
                    }}>
                      {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="badge" style={{ background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role], border: `1px solid ${ROLE_COLORS[u.role]}40` }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.badge}</td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.station}</td>
                <td>
                  {isSuspended ? (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Ban size={11} /> Suspended
                      {uState?.suspensionReason && <small style={{ opacity: 0.8 }}>({uState.suspensionReason.slice(0, 20)})</small>}
                    </span>
                  ) : (
                    <button className={`badge ${uState?.active ? 'badge-success' : 'badge-warning'}`} onClick={() => handleToggleActive(u.id)} style={{ cursor: 'pointer', border: 'none' }}>
                      {uState?.active ? '● Active' : '○ Inactive'}
                    </button>
                  )}
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lastLogin}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isSuspended ? (
                      <button className="btn btn-ghost btn-icon" title="Lift Suspension" style={{ color: '#10b981' }} onClick={() => { unsuspendUser(u.id); showToast(`Suspension lifted for ${u.name}`, 'success'); }}>
                        <UserCheck size={14} />
                      </button>
                    ) : (
                      <button className="btn btn-ghost btn-icon" title="Suspend User" style={{ color: '#ef4444' }} onClick={() => setSuspending(u)}>
                        <Ban size={14} />
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => setEditing(u)}>
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" title="Delete" style={{ color: '#ef4444' }} onClick={() => handleDelete(u.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <UserEditModal user={editing} onSave={handleSave} onCancel={() => setEditing(null)} />}
      {showAdd && <UserAddModal onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}
      {suspending && <SuspendModal user={suspending} onSuspend={(userId, until, reason) => { suspendUser(userId, until, reason); setSuspending(null); showToast(`User suspended successfully.`, 'success'); }} onCancel={() => setSuspending(null)} />}
    </div>
  );
}

/* ─── SUSPEND MODAL ─── */
function SuspendModal({ user, onSuspend, onCancel }: { user: AppUser; onSuspend: (userId: string, until: string, reason: string) => void; onCancel: () => void }) {
  const [duration, setDuration] = useState('7d');
  const [customDays, setCustomDays] = useState(7);
  const [reason, setReason] = useState('');

  const computeUntil = (): string => {
    const now = new Date();
    switch (duration) {
      case '3d': now.setDate(now.getDate() + 3); break;
      case '7d': now.setDate(now.getDate() + 7); break;
      case '14d': now.setDate(now.getDate() + 14); break;
      case '30d': now.setDate(now.getDate() + 30); break;
      case '90d': now.setDate(now.getDate() + 90); break;
      case 'custom': now.setDate(now.getDate() + customDays); break;
    }
    return now.toISOString();
  };

  const durationLabel = (): string => {
    switch (duration) {
      case '3d': return '3 days';
      case '7d': return '1 week';
      case '14d': return '2 weeks';
      case '30d': return '1 month';
      case '90d': return '3 months';
      case 'custom': return `${customDays} day${customDays !== 1 ? 's' : ''}`;
      default: return '7 days';
    }
  };

  const until = computeUntil();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Ban size={18} style={{ color: '#ef4444' }} /> Suspend User</h3>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: '#ef4444' }}>{user.name}</strong> ({ROLE_LABELS[user.role]}) will be unable to login until the suspension expires.
            </p>
          </div>
          <div className="form-group">
            <label>Suspension Duration</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { key: '3d', label: '3 Days' },
                { key: '7d', label: '1 Week' },
                { key: '14d', label: '2 Weeks' },
                { key: '30d', label: '1 Month' },
                { key: '90d', label: '3 Months' },
                { key: 'custom', label: 'Custom' },
              ].map(d => (
                <button key={d.key} className={`btn ${duration === d.key ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '0.8rem' }} onClick={() => setDuration(d.key)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          {duration === 'custom' && (
            <div className="form-group">
              <label>Custom Duration (days)</label>
              <input className="form-input" type="number" min={1} max={365} value={customDays} onChange={e => setCustomDays(Number(e.target.value))} />
            </div>
          )}
          <div className="form-group">
            <label>Reason for Suspension</label>
            <input className="form-input" placeholder="e.g., Misconduct, investigation pending..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} />
            Suspension ends: <strong>{new Date(until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={() => onSuspend(user.id, until, reason || 'No reason provided')}>
            <Ban size={16} /> Suspend for {durationLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── USER EDIT MODAL ─── */
function UserEditModal({ user, onSave, onCancel }: { user: AppUser; onSave: (u: AppUser) => void; onCancel: () => void }) {
  const [form, setForm] = useState<AppUser>({ ...user });

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Edit User</h3>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="io">Investigation Officer</option>
                <option value="sho">Station House Officer</option>
                <option value="legal">Legal Advisor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="form-group">
              <label>Badge Number</label>
              <input className="form-input" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Station</label>
            <input className="form-input" value={form.station} onChange={e => setForm({ ...form, station: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}><Save size={16} /> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

/* ─── USER ADD MODAL ─── */
function UserAddModal({ onAdd, onCancel }: { onAdd: (u: AppUser) => void; onCancel: () => void }) {
  const [form, setForm] = useState<AppUser>({
    id: `user-${Date.now()}`,
    name: '', email: '', role: 'io', badge: '', station: '', active: true,
    lastLogin: new Date().toISOString(),
  });

  const canSave = form.name.trim() && form.email.trim() && form.badge.trim();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Insp. Rajesh Patel" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g., rajesh.patel@gujpol.gov.in" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Role</label>
              <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="io">Investigation Officer</option>
                <option value="sho">Station House Officer</option>
                <option value="legal">Legal Advisor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="form-group">
              <label>Badge Number</label>
              <input className="form-input" value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })} placeholder="e.g., GP-1234" />
            </div>
          </div>
          <div className="form-group">
            <label>Station</label>
            <input className="form-input" value={form.station} onChange={e => setForm({ ...form, station: e.target.value })} placeholder="e.g., Cybercrime PS, Ahmedabad" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={() => onAdd(form)}><Plus size={16} /> Add User</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ROLES TAB ─── */
function RolesTab() {
  const [perms, setPerms] = useState(getPermissions());

  useEffect(() => subscribePermissions(() => setPerms(getPermissions())), []);

  const togglePerm = (role: UserRole, perm: PermKey) => {
    setPerms(prev => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
  };

  const handleSave = () => {
    setPermissions(perms);
    showToast('Role permissions updated — changes apply to all users immediately.', 'success');
  };

  const allUsers = buildAppUsers();
  const roleCounts: Record<UserRole, number> = {
    io: allUsers.filter(u => u.role === 'io').length,
    sho: allUsers.filter(u => u.role === 'sho').length,
    legal: allUsers.filter(u => u.role === 'legal').length,
    admin: allUsers.filter(u => u.role === 'admin').length,
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>Role Permissions Matrix</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Configure what each role can access</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Save Permissions
        </button>
      </div>

      {/* Role summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => {
          const permCount = Object.values(perms[role]).filter(Boolean).length;
          return (
            <div key={role} className="card" style={{ borderLeft: `4px solid ${ROLE_COLORS[role]}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Shield size={18} style={{ color: ROLE_COLORS[role] }} />
                <strong>{ROLE_LABELS[role]}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span><UserCheck size={13} style={{ verticalAlign: 'middle' }} /> {roleCounts[role]} users</span>
                <span>{permCount}/{PERMISSIONS.length} perms</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission matrix table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Permission</th>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                <th key={role} style={{ textAlign: 'center', color: ROLE_COLORS[role] }}>{ROLE_LABELS[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.key}>
                <td style={{ fontWeight: 500 }}>{p.label}</td>
                {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => (
                  <td key={role} style={{ textAlign: 'center' }}>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={perms[role][p.key]}
                        onChange={() => togglePerm(role, p.key)}
                        style={{ width: 18, height: 18, cursor: 'pointer', accentColor: ROLE_COLORS[role] }}
                      />
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── SETTINGS TAB ─── */
function SettingsTab() {
  const [settings, setSettings] = useState<SystemSettings>(getSettings());

  useEffect(() => subscribeSettings(() => setSettings(getSettings())), []);

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(settings);
    showToast('System settings saved — changes apply to all users immediately.', 'success');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>System Configuration</h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>Manage application-wide settings and preferences</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Save Settings
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Security */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Lock size={18} style={{ color: '#ef4444' }} />
            <h4 style={{ margin: 0 }}>Security & Encryption</h4>
          </div>
          <div className="form-group">
            <label>AES-256 Encryption</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.encryptionEnabled} onChange={e => updateSetting('encryptionEnabled', e.target.checked)} />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{settings.encryptionEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="form-group">
            <label>Session Timeout (minutes)</label>
            <input className="form-input" type="number" value={settings.sessionTimeout} onChange={e => updateSetting('sessionTimeout', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Max File Upload Size (MB)</label>
            <input className="form-input" type="number" value={settings.maxFileSize} onChange={e => updateSetting('maxFileSize', Number(e.target.value))} />
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bell size={18} style={{ color: '#f59e0b' }} />
            <h4 style={{ margin: 0 }}>Notifications</h4>
          </div>
          <div className="form-group">
            <label>Email Notifications</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.emailNotifications} onChange={e => updateSetting('emailNotifications', e.target.checked)} />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{settings.emailNotifications ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="form-group">
            <label>SMS Alerts</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.smsAlerts} onChange={e => updateSetting('smsAlerts', e.target.checked)} />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{settings.smsAlerts ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
          <div className="form-group">
            <label>Auto-Backup</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.autoBackup} onChange={e => updateSetting('autoBackup', e.target.checked)} />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{settings.autoBackup ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        </div>

        {/* Station Info */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Database size={18} style={{ color: '#6366f1' }} />
            <h4 style={{ margin: 0 }}>Station & FIR Configuration</h4>
          </div>
          <div className="form-group">
            <label>Police Station</label>
            <input className="form-input" value={settings.policeStation} onChange={e => updateSetting('policeStation', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>District</label>
              <input className="form-input" value={settings.district} onChange={e => updateSetting('district', e.target.value)} />
            </div>
            <div className="form-group">
              <label>State</label>
              <input className="form-input" value={settings.state} onChange={e => updateSetting('state', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>FIR Number Prefix</label>
            <input className="form-input" value={settings.firPrefix} onChange={e => updateSetting('firPrefix', e.target.value)} />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Format: {settings.firPrefix}/YYYY/NNNN</small>
          </div>
        </div>

        {/* General */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Globe size={18} style={{ color: '#10b981' }} />
            <h4 style={{ margin: 0 }}>General Preferences</h4>
          </div>
          <div className="form-group">
            <label>Default Language</label>
            <select className="form-select" value={settings.language} onChange={e => updateSetting('language', e.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Gujarati</option>
            </select>
          </div>
          <div className="form-group">
            <label>Auto-Save Interval (minutes)</label>
            <input className="form-input" type="number" min={1} max={30} value={settings.autoSaveInterval} onChange={e => updateSetting('autoSaveInterval', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Offline-First Mode</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings.offlineMode} onChange={e => updateSetting('offlineMode', e.target.checked)} />
              <span className="toggle-slider" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{settings.offlineMode ? 'Enabled (IndexedDB)' : 'Disabled'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
