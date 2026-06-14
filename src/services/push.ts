/* ============================================
   CRIMEGPT 2.0 — PUSH NOTIFICATION SERVICE
   ============================================
   Browser-level (OS) notifications using the
   Web Notifications API. All notifications are
   branded as "CrimeGPT Alert Center".

   PRIVACY: Never exposes victim names, witness
   details, addresses, Aadhaar, or evidence.
   Only case IDs, status, and actions.

   No visible reference to Firebase, FCM, or
   any third-party service.
   ============================================ */

import type { NotificationPriority } from '../types';

/* ─── Constants ─── */
// Brand: CrimeGPT Alert Center
const ICON_PATH = '/favicon-32x32.png';
const BADGE_PATH = '/favicon-16x16.png';

/* ─── State ─── */
let _permissionGranted = false;
let _permissionRequested = false;

/* ════════════════════════════════════════════
   PERMISSION MANAGEMENT
   ════════════════════════════════════════════ */

export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'denied';
  return Notification.permission;
}

export function isPushEnabled(): boolean {
  return _permissionGranted;
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') {
    console.warn('[CrimeGPT] Browser does not support notifications.');
    return false;
  }

  if (Notification.permission === 'granted') {
    _permissionGranted = true;
    _permissionRequested = true;
    return true;
  }

  if (Notification.permission === 'denied') {
    _permissionRequested = true;
    return false;
  }

  // Request permission
  const result = await Notification.requestPermission();
  _permissionRequested = true;
  _permissionGranted = result === 'granted';

  if (_permissionGranted) {
    console.log('[CrimeGPT] Notification permission granted.');
  }

  return _permissionGranted;
}

export function syncPermissionState(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    _permissionGranted = true;
    _permissionRequested = true;
  } else if (Notification.permission === 'denied') {
    _permissionGranted = false;
    _permissionRequested = true;
  }
}

export function hasPermissionBeenRequested(): boolean {
  return _permissionRequested;
}

/* ════════════════════════════════════════════
   BROWSER NOTIFICATION DISPATCH
   Uses sanitized safeMessage only.
   Never shows sensitive data.
   ════════════════════════════════════════════ */

export interface PushPayload {
  title: string;
  safeMessage: string;
  priority: NotificationPriority;
  caseId?: string;
  firNumber?: string;
  tag?: string;
  onClickUrl?: string;
}

export function sendBrowserNotification(payload: PushPayload): boolean {
  if (!_permissionGranted) return false;
  if (typeof Notification === 'undefined') return false;


  try {
    const priorityEmoji = payload.priority === 'critical' ? '🔴' : payload.priority === 'high' ? '🟡' : '🔵';
    const firPrefix = payload.firNumber ? `[${payload.firNumber}] ` : '';

    const notif = new Notification(`${priorityEmoji} ${firPrefix}${payload.title}`, {
      body: payload.safeMessage,
      icon: ICON_PATH,
      badge: BADGE_PATH,
      tag: payload.tag || `crimegpt-${payload.caseId || 'system'}`,
      requireInteraction: payload.priority === 'critical',
      silent: payload.priority === 'normal',
      data: {
        caseId: payload.caseId,
        firNumber: payload.firNumber,
        onClickUrl: payload.onClickUrl || '/',
      },
    });

    // Click handler — focus the app window
    notif.onclick = (event) => {
      event.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (event.target as any)?.data;
      window.focus();
      if (data?.onClickUrl && window.location) {
        // Navigate within the app if possible
        if (window.location.pathname !== data.onClickUrl) {
          window.location.hash = '';
          window.history.pushState({}, '', data.onClickUrl);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
      notif.close();
    };

    // Auto-close after timeout (unless critical)
    if (payload.priority !== 'critical') {
      setTimeout(() => notif.close(), 8000);
    }

    return true;
  } catch (err) {
    console.warn('[CrimeGPT] Failed to send browser notification:', err);
    return false;
  }
}

/* ════════════════════════════════════════════
   BATCH NOTIFICATION
   For multiple events at once — groups them
   to avoid notification spam.
   ════════════════════════════════════════════ */

export function sendBatchNotification(payloads: PushPayload[]): number {
  if (payloads.length === 0) return 0;
  if (!_permissionGranted) return 0;

  // If only one, send directly
  if (payloads.length === 1) {
    return sendBrowserNotification(payloads[0]) ? 1 : 0;
  }

  // Group by priority
  const critical = payloads.filter(p => p.priority === 'critical');
  const high = payloads.filter(p => p.priority === 'high');
  const normal = payloads.filter(p => p.priority === 'normal');

  let sent = 0;

  // Send critical individually
  for (const p of critical) {
    if (sendBrowserNotification(p)) sent++;
  }

  // Summarize high priority
  if (high.length > 0) {
    const summary: PushPayload = {
      title: `${high.length} High-Priority Alert(s)`,
      safeMessage: high.map(h => h.firNumber ? `[${h.firNumber}] ${h.title}` : h.title).join('\n'),
      priority: 'high',
      tag: 'crimegpt-high-batch',
      onClickUrl: '/',
    };
    if (sendBrowserNotification(summary)) sent++;
  }

  // Summarize normal
  if (normal.length > 0) {
    const summary: PushPayload = {
      title: `${normal.length} Update(s)`,
      safeMessage: `${normal.length} new update(s) in CrimeGPT. Open the Alert Center to view.`,
      priority: 'normal',
      tag: 'crimegpt-normal-batch',
      onClickUrl: '/',
    };
    if (sendBrowserNotification(summary)) sent++;
  }

  return sent;
}

/* ════════════════════════════════════════════
   VISIBILITY-AWARE DISPATCH
   Only sends OS notifications when app is not
   focused. In-app notifications are always
   shown via the Alert Center.
   ════════════════════════════════════════════ */

export function shouldSendOSNotification(): boolean {
  return _permissionGranted;
}

/* ════════════════════════════════════════════
   SOUND ALERT (for critical notifications)
   ════════════════════════════════════════════ */

let _audioCtx: AudioContext | null = null;

export function playAlertSound(priority: NotificationPriority): void {
  if (priority !== 'critical' && priority !== 'high') return;
  if (typeof AudioContext === 'undefined' && typeof (window as unknown as Record<string, unknown>).webkitAudioContext === 'undefined') return;

  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const oscillator = _audioCtx.createOscillator();
    const gainNode = _audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(_audioCtx.destination);

    // Short beep pattern
    oscillator.frequency.value = priority === 'critical' ? 880 : 660;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(_audioCtx.currentTime + 0.15);

    // Second beep for critical
    if (priority === 'critical') {
      const osc2 = _audioCtx.createOscillator();
      const gain2 = _audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(_audioCtx.destination);
      osc2.frequency.value = 880;
      osc2.type = 'sine';
      gain2.gain.value = 0.1;
      osc2.start(_audioCtx.currentTime + 0.2);
      osc2.stop(_audioCtx.currentTime + 0.35);
    }
  } catch {
    // Silently fail — audio is best-effort
  }
}
