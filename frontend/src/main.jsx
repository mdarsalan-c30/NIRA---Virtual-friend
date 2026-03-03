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
window.addEventListener('error', (e) => {
  if (e.message.includes('MIME type') || (e.target && e.target.tagName === 'SCRIPT')) {
    const lastRefresh = localStorage.getItem('last_mime_refresh');
    const now = Date.now();

    // Only refresh if we haven't refreshed in the last 10 seconds (avoid infinite loops)
    if (!lastRefresh || (now - parseInt(lastRefresh)) > 10000) {
      console.warn('⚠️ Module load failure detected. Performing recovery refresh...');
      localStorage.setItem('last_mime_refresh', now.toString());
      window.location.reload(true); // true forces a reload from server if supported
    }
  }
}, true);
