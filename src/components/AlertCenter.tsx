/* ============================================
   CRIMEGPT ALERT CENTER
   ============================================
   Smart notification hub with tabbed views,
   priority indicators, inline actions,
   escalation badges, and real-time updates.
   Branded as: CrimeGPT Alert Center
   ============================================ */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, BellOff, CheckCheck, Trash2, Shield, AlertTriangle,
  Clock, Zap, FileText, Eye, ChevronRight, Radio,
} from 'lucide-react';
import {
  getNotifications, subscribeNotifications, markNotificationRead,
  getWorkflowEvents, subscribeWorkflowEvents,
  resolveNotificationActions, resolveWorkflowEvent,
  getCurrentRole, requestPushPermission, getPushPermission,
} from '../store';
import type { Notification, WorkflowEvent, UserRole } from '../types';

/* ─── TYPES ─── */
type TabId = 'all' | 'unread' | 'actions' | 'escalations';

/* ─── CONSTANTS ─── */
const PRIORITY_CONFIG = {
  critical: { color: '#FF3B3B', bg: 'rgba(255,59,59,0.08)', label: 'Critical', glow: '0 0 8px rgba(255,59,59,0.5)' },
  high:     { color: '#FFB800', bg: 'rgba(255,184,0,0.08)', label: 'High',     glow: '0 0 8px rgba(255,184,0,0.4)' },
  normal:   { color: '#00D4FF', bg: 'rgba(0,212,255,0.08)', label: 'Normal',   glow: '0 0 6px rgba(0,212,255,0.3)' },
} as const;

const ACTION_BTN_STYLES: Record<string, { bg: string; hoverBg: string; color: string }> = {
  approve:         { bg: 'rgba(0,255,65,0.1)',  hoverBg: 'rgba(0,255,65,0.2)',  color: '#00FF41' },
  reject:          { bg: 'rgba(255,59,59,0.1)', hoverBg: 'rgba(255,59,59,0.2)', color: '#FF3B3B' },
  request_changes: { bg: 'rgba(255,184,0,0.1)', hoverBg: 'rgba(255,184,0,0.2)', color: '#FFB800' },
  view:            { bg: 'rgba(0,212,255,0.1)', hoverBg: 'rgba(0,212,255,0.2)', color: '#00D4FF' },
  navigate:        { bg: 'rgba(0,212,255,0.1)', hoverBg: 'rgba(0,212,255,0.2)', color: '#00D4FF' },
  acknowledge:     { bg: 'rgba(201,168,76,0.1)',hoverBg: 'rgba(201,168,76,0.2)',color: '#C9A84C' },
};

const CATEGORY_ICON: Record<string, string> = {
  workflow: '⚙️', approval: '✅', escalation: '🔺', evidence: '📎',
  document: '📄', review: '🔍', security: '🔒', deadline: '⏰',
  gap_alert: '⚠️', system: '🖥️',
};

/* ─── HELPERS ─── */
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function categoryLabel(cat?: string): string {
  if (!cat) return '';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ════════════════════════════════════════════
   ALERT CENTER COMPONENT
   ════════════════════════════════════════════ */
export default function AlertCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [notifs, setNotifs] = useState<Notification[]>(() => getNotifications());
  const [wfEvents, setWfEvents] = useState<WorkflowEvent[]>(() => getWorkflowEvents());
  const [pushPerm, setPushPerm] = useState<string>(() => getPushPermission());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const role = getCurrentRole();

  /* ─── Real-time subscriptions ─── */
  useEffect(() => {
    if (!open) return;
    const u1 = subscribeNotifications(() => setNotifs(getNotifications()));
    const u2 = subscribeWorkflowEvents(() => setWfEvents(getWorkflowEvents()));
    return () => { u1(); u2(); };
  }, [open]);

  /* ─── Computed lists ─── */
  const unreadNotifs = useMemo(() => notifs.filter(n => !n.read), [notifs]);
  const actionNotifs = useMemo(() => {
    const actionRoles: UserRole[] = ['sho', 'legal', 'admin'];
    return notifs.filter(n =>
      n.actions && n.actions.length > 0 &&
      !n.resolved && actionRoles.includes(role)
    );
  }, [notifs, role]);
  const escalationNotifs = useMemo(
    () => notifs.filter(n => n.category === 'escalation' || (n.escalatedFrom && n.escalatedFrom.length > 0)),
    [notifs],
  );

  /* ─── Filter by tab ─── */
  const filteredNotifs = useMemo(() => {
    switch (activeTab) {
      case 'unread': return unreadNotifs;
      case 'actions': return actionNotifs;
      case 'escalations': return escalationNotifs;
      default: return notifs;
    }
  }, [activeTab, notifs, unreadNotifs, actionNotifs, escalationNotifs]);

  /* ─── Handlers ─── */
  const handleMarkRead = (id: string) => { markNotificationRead(id); };

  const handleMarkAllRead = () => {
    for (const n of notifs) { if (!n.read) markNotificationRead(n.id); }
  };

  const handleClearResolved = () => {
    const resolved = notifs.filter(n => n.resolved);
    for (const n of resolved) { markNotificationRead(n.id); }
  };

  const handleAction = (actionType: string, payload: string | undefined, notif: Notification) => {
    markNotificationRead(notif.id);
    resolveNotificationActions(actionType, payload);
    if (notif.workflowEventId) resolveWorkflowEvent(notif.workflowEventId, 'current-user');
    if ((actionType === 'navigate' || actionType === 'view') && payload?.startsWith('/')) {
      onClose();
      navigate(payload);
    }
  };

  const handleEnablePush = async () => {
    const granted = await requestPushPermission();
    setPushPerm(granted ? 'granted' : 'denied');
  };

  /* ─── Role-based action filter ─── */
  const actionRoles: UserRole[] = ['sho', 'legal', 'admin'];
  const canAct = actionRoles.includes(role);

  /* ─── Tab config ─── */
  const tabs: Array<{ id: TabId; label: string; count: number }> = [
    { id: 'all',         label: 'All',              count: notifs.length },
    { id: 'unread',      label: 'Unread',           count: unreadNotifs.length },
    { id: 'actions',     label: 'Actions Required', count: actionNotifs.length },
    { id: 'escalations', label: 'Escalations',      count: escalationNotifs.length },
  ];

  /* ─── Inline styles ─── */
  const sTabBtn = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', fontSize: '0.74rem', fontWeight: active ? 600 : 400,
    color: active ? '#C9A84C' : '#8899AA',
    background: active ? 'rgba(201,168,76,0.08)' : 'transparent',
    border: 'none', borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
    cursor: 'pointer', transition: 'all 150ms', whiteSpace: 'nowrap' as const, fontFamily: 'inherit',
  });
  const sActionBtn = (type: string, isHovered: boolean): React.CSSProperties => {
    const s = ACTION_BTN_STYLES[type] || ACTION_BTN_STYLES.view;
    return {
      padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, fontFamily: 'inherit',
      color: s.color, background: isHovered ? s.hoverBg : s.bg,
      border: `1px solid ${s.color}33`, borderRadius: 4, cursor: 'pointer',
      transition: 'all 150ms', whiteSpace: 'nowrap' as const,
    };
  };

  if (!open) return null;

  const hasResolved = notifs.some(n => n.resolved);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 540, width: '100%',
          maxHeight: '82vh', display: 'flex', flexDirection: 'column',
          background: 'var(--surface-1)', border: '1px solid var(--border-default)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 24px rgba(201,168,76,0.08)',
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(135deg, rgba(201,168,76,0.04), rgba(0,212,255,0.02))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(201,168,76,0.15), rgba(201,168,76,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                <Bell size={17} style={{ color: '#C9A84C' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Alert Center
                  {unreadNotifs.length > 0 && (
                    <span style={{
                      fontSize: '0.65rem', padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(255,59,59,0.15)', color: '#FF3B3B', fontWeight: 700,
                    }}>{unreadNotifs.length}</span>
                  )}
                </h3>
                <span style={{
                  fontSize: '0.68rem', color: '#5E6E80', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
                }}>CrimeGPT • Smart Workflow</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {unreadNotifs.length > 0 && (
                <button
                  style={{
                    padding: '5px 10px', fontSize: '0.7rem', fontFamily: 'inherit',
                    color: '#C9A84C', background: 'rgba(201,168,76,0.08)',
                    border: '1px solid rgba(201,168,76,0.15)', borderRadius: 6,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <CheckCheck size={13} /> Read All
                </button>
              )}
              {hasResolved && (
                <button
                  style={{
                    padding: '5px 10px', fontSize: '0.7rem', fontFamily: 'inherit',
                    color: '#5E6E80', background: 'rgba(94,110,128,0.08)',
                    border: '1px solid rgba(94,110,128,0.15)', borderRadius: 6,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                  onClick={handleClearResolved}
                  title="Clear resolved notifications"
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
              <button style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#5E6E80', padding: 4, display: 'flex',
              }} onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ═══ TABS ═══ */}
          <div style={{
            display: 'flex', gap: 2, marginTop: 14,
            borderBottom: '1px solid var(--border-subtle)', overflowX: 'auto',
          }}>
            {tabs.map(tab => (
              <button key={tab.id} style={sTabBtn(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    marginLeft: 6, fontSize: '0.62rem', padding: '1px 6px', borderRadius: 8,
                    background: tab.id === 'escalations' && tab.count > 0 ? 'rgba(255,59,59,0.15)' : 'rgba(201,168,76,0.12)',
                    color: tab.id === 'escalations' && tab.count > 0 ? '#FF3B3B' : '#C9A84C',
                    fontWeight: 700,
                  }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ NOTIFICATION LIST ═══ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {filteredNotifs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <BellOff size={36} style={{ color: '#5E6E80', opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#5E6E80', fontSize: '0.88rem', margin: 0 }}>
                {activeTab === 'all' ? 'No notifications yet' :
                 activeTab === 'unread' ? 'All caught up!' :
                 activeTab === 'actions' ? 'No pending actions' :
                 'No escalations'}
              </p>
              <p style={{ color: '#3A4A5C', fontSize: '0.76rem', marginTop: 6 }}>
                Workflow events will appear here in real-time
              </p>
            </div>
          )}

          {filteredNotifs.map(notif => {
            const pCfg = PRIORITY_CONFIG[notif.priority || 'normal'];
            const isUnread = !notif.read;
            const isEscalation = notif.category === 'escalation';
            const isHov = hoveredId === notif.id;
            const visibleActions = (notif.actions || []).filter(a =>
              canAct || !['approve', 'reject', 'request_changes'].includes(a.type)
            );

            return (
              <div
                key={notif.id}
                style={{
                  padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                  background: isHov ? 'var(--surface-2)' : isUnread ? 'rgba(201,168,76,0.025)' : 'transparent',
                  cursor: 'pointer', transition: 'background 150ms', position: 'relative',
                }}
                onMouseEnter={() => setHoveredId(notif.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleMarkRead(notif.id)}
              >
                {/* Priority bar */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: pCfg.color, opacity: isUnread ? 1 : 0.3,
                  borderRadius: '0 2px 2px 0',
                  boxShadow: isUnread && notif.priority === 'critical' ? pCfg.glow : 'none',
                }} />

                <div style={{ paddingLeft: 10 }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      {/* Priority dot */}
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: pCfg.color,
                        boxShadow: isUnread && notif.priority === 'critical' ? pCfg.glow : 'none',
                        animation: isUnread && notif.priority === 'critical' ? 'pulse 2s ease-in-out infinite' : 'none',
                      }} />
                      <span style={{
                        fontWeight: isUnread ? 600 : 400, fontSize: '0.85rem',
                        color: 'var(--text-primary)', lineHeight: 1.3,
                      }}>{notif.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {isEscalation && (
                        <span style={{
                          fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(255,59,59,0.12)', color: '#FF3B3B',
                          fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}><AlertTriangle size={9} /> ESC</span>
                      )}
                      {notif.resolved && (
                        <span style={{
                          fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
                          background: 'rgba(0,255,65,0.1)', color: '#00FF41',
                          fontWeight: 600, textTransform: 'uppercase' as const,
                        }}>Resolved</span>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <p style={{
                    fontSize: '0.78rem', color: '#8899AA', marginTop: 4,
                    lineHeight: 1.5, marginLeft: 16,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                  }}>{notif.message}</p>

                  {/* Meta row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                    marginLeft: 16, flexWrap: 'wrap' as const,
                  }}>
                    {/* Time */}
                    <span style={{
                      fontSize: '0.68rem', color: '#5E6E80',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}><Clock size={10} />{timeAgo(notif.timestamp)}</span>

                    {/* Priority badge */}
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                      background: pCfg.bg, color: pCfg.color, fontWeight: 600,
                    }}>{pCfg.label}</span>

                    {/* Category */}
                    {notif.category && (
                      <span style={{
                        fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                        background: 'var(--surface-3)', color: '#8899AA',
                      }}>{CATEGORY_ICON[notif.category] || ''} {categoryLabel(notif.category)}</span>
                    )}

                    {/* FIR link */}
                    {notif.firNumber && (
                      <span style={{
                        fontSize: '0.65rem', color: '#C9A84C',
                        fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 2,
                      }}>
                        <FileText size={9} />{notif.firNumber}
                        <ChevronRight size={9} style={{ opacity: 0.5 }} />
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {visibleActions.length > 0 && !notif.resolved && (
                    <div style={{
                      display: 'flex', gap: 6, marginTop: 10, marginLeft: 16, flexWrap: 'wrap' as const,
                    }}>
                      {visibleActions.map((action, i) => (
                        <button
                          key={i}
                          style={sActionBtn(action.type, hoveredAction === `${notif.id}-${i}`)}
                          onClick={(e) => { e.stopPropagation(); handleAction(action.type, action.payload, notif); }}
                          onMouseEnter={() => setHoveredAction(`${notif.id}-${i}`)}
                          onMouseLeave={() => setHoveredAction(null)}
                        >
                          {action.type === 'approve' && <CheckCheck size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                          {action.type === 'reject' && <X size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                          {(action.type === 'view' || action.type === 'navigate') && <Eye size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#5E6E80' }}>
            <Radio size={11} style={{ color: '#00FF41' }} />
            <span>Real-time monitoring active</span>
            <span style={{ margin: '0 4px', opacity: 0.3 }}>|</span>
            <Shield size={11} />
            <span>{wfEvents.length} event{wfEvents.length !== 1 ? 's' : ''} tracked</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {pushPerm !== 'granted' && (
              <button
                style={{
                  fontSize: '0.68rem', padding: '4px 10px', fontFamily: 'inherit',
                  color: '#C9A84C', background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.15)', borderRadius: 4,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
                onClick={handleEnablePush}
              >
                <Zap size={11} /> Enable Desktop Alerts
              </button>
            )}
            {pushPerm === 'granted' && (
              <span style={{
                fontSize: '0.65rem', color: '#00FF41',
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00FF41' }} />
                Desktop alerts active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
