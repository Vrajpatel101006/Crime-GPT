/* ============================================
   CRIMEGPT 2.0 — SERVICE WORKER
   ============================================
   Handles mobile push notifications and
   notification click events.

   Scope: /
   Cache: none (SPA handles its own caching)
   ============================================ */

/* ─── Install — activate immediately ─── */
self.addEventListener('install', (event) => {
  // Skip waiting so the SW activates right away
  event.waitUntil(self.skipWaiting());
});

/* ─── Activate — claim all open clients ─── */
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/* ─── Push event — triggered when a push message arrives ───
   This fires even when the app is in the background or closed
   (mobile OS-level notification).
   Payload shape: { title, body, icon, badge, tag, priority, onClickUrl }
   ────────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'CrimeGPT Alert', body: event.data.text() };
  }

  const priorityEmoji = payload.priority === 'critical' ? '🔴'
    : payload.priority === 'high' ? '🟡' : '🔵';
  const firPrefix = payload.firNumber ? `[${payload.firNumber}] ` : '';

  const options = {
    body: payload.body || payload.safeMessage || '',
    icon: '/favicon-32x32.png',
    badge: '/favicon-16x16.png',
    tag: payload.tag || 'crimegpt-system',
    requireInteraction: payload.priority === 'critical',
    silent: payload.priority === 'normal',
    vibrate: payload.priority === 'critical' ? [200, 100, 200, 100, 200] : [100],
    data: {
      onClickUrl: payload.onClickUrl || '/',
      caseId: payload.caseId || null,
      firNumber: payload.firNumber || null,
    },
    actions: payload.priority !== 'normal' ? [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ] : [],
  };

  event.waitUntil(
    self.registration.showNotification(
      `${priorityEmoji} ${firPrefix}${payload.title || 'CrimeGPT'}`,
      options
    )
  );
});

/* ─── Notification click — focus/open the app window ─── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const onClickUrl = event.notification.data?.onClickUrl || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If a window is already open, focus it and navigate
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing && 'focus' in existing) {
        existing.focus();
        existing.postMessage({ type: 'NAVIGATE', url: onClickUrl });
        return;
      }
      // Otherwise open a new window
      return self.clients.openWindow(onClickUrl);
    })
  );
});

/* ─── Message from app — used for navigation sync ─── */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
