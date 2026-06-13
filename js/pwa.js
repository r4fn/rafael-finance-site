/* ─────────────────────────────────────────────────────────────
   pwa.js — recursos de Progressive Web App
   Registro do service worker e banner "Adicionar à tela inicial".
   ───────────────────────────────────────────────────────────── */

// ── Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('[SW] registrado'))
    .catch(err => console.warn('[SW] erro:', err));
}

// ── Banner "Adicionar à tela inicial" (Android Chrome) ──────
let deferredPrompt = null;
const banner = document.getElementById('install-banner');
const btnInstall = document.getElementById('btn-install');
const btnDismiss = document.getElementById('btn-dismiss');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  banner.style.display = 'flex';
});

btnInstall && btnInstall.addEventListener('click', () => {
  banner.style.display = 'none';
  if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
});

btnDismiss && btnDismiss.addEventListener('click', () => {
  banner.style.display = 'none';
});

window.addEventListener('appinstalled', () => {
  banner.style.display = 'none';
});
