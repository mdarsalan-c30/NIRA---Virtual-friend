import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("%c NYRA v1.2.6 - LIVE ", "background: #6366f1; color: white; font-weight: bold; padding: 2px 5px; borderRadius: 3px;");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
