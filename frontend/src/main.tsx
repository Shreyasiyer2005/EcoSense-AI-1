import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'

// Cesium widgets CSS is loaded via vite-plugin-cesium in index.html
// Do not import it here as it causes 404 errors

// Configure Cesium base URL for GitHub Pages subpath
if (typeof window !== 'undefined' && (window as any).CESIUM_BASE_URL === undefined) {
  (window as any).CESIUM_BASE_URL = '/EcoSense-AI-1/cesium/';
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
