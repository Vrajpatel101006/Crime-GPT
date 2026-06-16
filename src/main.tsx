import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* ─── Register Service Worker ───
   Enables reliable OS-level notifications on mobile
   (Chrome Android + iOS Safari when added to home screen).
   The SW handles notificationclick and push events.
   ─────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[CrimeGPT] Service Worker registered, scope:', reg.scope);

      // Listen for navigation commands from the SW (notification click)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NAVIGATE' && event.data.url) {
          window.history.pushState({}, '', event.data.url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });
    } catch (err) {
      console.warn('[CrimeGPT] Service Worker registration failed:', err);
    }
  });
}
