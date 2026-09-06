import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { initBrowserApiFallback } from './api/browserFallback'
import './assets/styles/globals.css'
import './assets/styles/animations.css'

// Initialize browser fallback if running in a standard web browser without Electron
initBrowserApiFallback()

// Apply saved theme
const savedTheme = localStorage.getItem('studyflow-theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
