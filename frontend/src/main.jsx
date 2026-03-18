import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("%c NYRA v1.3.4 (Brain v4.0) - SOUL RESTORED 🌸 ", "background: #ff00ff; color: white; font-weight: bold; padding: 2px 5px; borderRadius: 3px;");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('🚀 NYRA Service Worker Registered!', reg.scope);

        // Check for updates
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New content available! Please refresh.');
              // Optional: Provide a UI toast to the user
              // For now, we'll let the activate event handles claim or silent update
            }
          };
        };
      })
      .catch(err => console.log('❌ Service Worker registration failed:', err));
  });
}

// Handle "Failed to load module script" errors (MIME type mismatch on stale cache)
window.addEventListener('error', async (e) => {
  if (e.message.includes('MIME type') || (e.target && e.target.tagName === 'SCRIPT')) {
    const lastRefresh = localStorage.getItem('last_mime_refresh');
    const now = Date.now();

    // Only attempt recovery if we haven't tried in the last 15 seconds
    if (!lastRefresh || (now - parseInt(lastRefresh)) > 15000) {
      console.warn('⚠️ NYRA Core failure detected. Executing self-healing recovery...');
      localStorage.setItem('last_mime_refresh', now.toString());

      try {
        // 1. Unregister all service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }
        // 2. Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
        }
      } catch (err) {
        console.error('Self-healing failed:', err);
      }

      // 3. Force a complete reload from the server
      window.location.reload(true);
    }
  }
}, true);
