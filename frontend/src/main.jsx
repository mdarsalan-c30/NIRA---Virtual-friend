import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("%c NYRA v1.3.3 (Brain v3.0) - SOUL & VOICE REBORN ", "background: #f472b6; color: white; font-weight: bold; padding: 2px 5px; borderRadius: 3px;");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('🚀 NYRA Service Worker Registered!', reg.scope))
      .catch(err => console.log('❌ Service Worker registration failed:', err));
  });
}
