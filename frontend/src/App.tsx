import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import apiService from './services/api'
import LocationAnalysis from './pages/LocationAnalysis'

interface HealthStatus {
  backend: {
    status: string;
    service: string;
    version: string;
    timestamp?: string;
  } | null;
  mlService: {
    status: string;
    service: string;
  } | null;
  errors: string[];
}

function App() {
  const [health, setHealth] = useState<HealthStatus>({
    backend: null,
    mlService: null,
    errors: []
  });

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    const errors: string[] = [];
    let backendHealth = null;
    let mlHealth = null;

    try {
      backendHealth = await apiService.checkBackendHealth();
    } catch (err) {
      errors.push(`Backend: ${err instanceof Error ? err.message : 'Connection failed'}`);
    }

    try {
      mlHealth = await apiService.checkMLServiceHealth();
    } catch (err) {
      errors.push(`ML Service: ${err instanceof Error ? err.message : 'Connection failed'}`);
    }

    setHealth({
      backend: backendHealth,
      mlService: mlHealth,
      errors
    });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage health={health} checkHealth={checkHealth} />} />
        <Route path="/location-analysis" element={<LocationAnalysis />} />
      </Routes>
    </BrowserRouter>
  )
}

function HomePage({ health, checkHealth }: { health: HealthStatus, checkHealth: () => void }) {
  return (
    <div className="min-h-screen bg-eco-dark-900 text-eco-dark-100">
      {/* Header */}
      <header className="bg-eco-dark-800 border-b border-eco-green-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-eco-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-eco-green-500">EcoSense AI</h1>
                <p className="text-sm text-eco-dark-400">AI for a Greener Tomorrow</p>
              </div>
            </div>
            <div className="text-sm text-eco-dark-400">
              Phase 1: Foundation | <Link to="/location-analysis" className="text-eco-green-500 hover:text-eco-green-400">Phase 2: Location Analysis →</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Understand Your Environment.<br />
              <span className="text-eco-green-500">Protect What Matters.</span>
            </h2>
            <p className="text-lg text-eco-dark-300">
              AI-Based Environmental Change Detection Using Satellite Data and U-Net Deep Learning
            </p>
          </div>

          {/* System Health Status */}
          <div className="bg-eco-dark-800 rounded-lg p-6 border border-eco-dark-700">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-eco-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              System Health Check
            </h3>

            <div className="space-y-4">
              {/* Backend Status */}
              <div className="flex items-center justify-between p-4 bg-eco-dark-900 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${health.backend ? 'bg-eco-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium">Backend API</p>
                    <p className="text-sm text-eco-dark-400">
                      {health.backend ? `${health.backend.service} v${health.backend.version}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  health.backend ? 'bg-eco-green-900 text-eco-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {health.backend?.status || 'Offline'}
                </span>
              </div>

              {/* ML Service Status */}
              <div className="flex items-center justify-between p-4 bg-eco-dark-900 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${health.mlService ? 'bg-eco-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium">ML Service (Python)</p>
                    <p className="text-sm text-eco-dark-400">
                      {health.mlService ? health.mlService.service : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  health.mlService ? 'bg-eco-green-900 text-eco-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  {health.mlService?.status || 'Offline'}
                </span>
              </div>

              {/* Errors */}
              {health.errors.length > 0 && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <p className="font-medium text-red-400 mb-2">Connection Issues:</p>
                  <ul className="text-sm text-red-300 space-y-1">
                    {health.errors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={checkHealth}
              className="mt-6 w-full bg-eco-green-600 hover:bg-eco-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Refresh Status
            </button>
          </div>

          {/* Phase Navigation */}
          <div className="mt-8 bg-eco-dark-800 rounded-lg p-6 border border-eco-dark-700">
            <h3 className="text-lg font-semibold mb-4 text-eco-green-500">Phase 2: Location Analysis</h3>
            <p className="text-eco-dark-300 mb-4">
              New location input system with real geocoding integration is now available!
            </p>
            <Link
              to="/location-analysis"
              className="inline-flex items-center px-6 py-3 bg-eco-green-600 hover:bg-eco-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Try Location Analysis
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Phase 1 Info */}
          <div className="mt-8 bg-eco-dark-800 rounded-lg p-6 border border-eco-dark-700">
            <h3 className="text-lg font-semibold mb-4 text-eco-green-500">Phase 1: Foundation Complete</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium mb-2">✅ Completed:</p>
                <ul className="space-y-1 text-eco-dark-300">
                  <li>• Repository structure</li>
                  <li>• React + Vite + TypeScript frontend</li>
                  <li>• Node.js + Express backend</li>
                  <li>• Python + FastAPI ML service</li>
                  <li>• Tailwind CSS styling</li>
                  <li>• Health check endpoints</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">📋 Coming Next (Phase 2):</p>
                <ul className="space-y-1 text-eco-dark-300">
                  <li>• Location input (PIN/Place/Coords)</li>
                  <li>• Geocoding integration</li>
                  <li>• Map visualization</li>
                  <li>• Database persistence</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-eco-dark-800 border-t border-eco-dark-700 py-6 mt-12">
        <div className="container mx-auto px-6 text-center text-eco-dark-400 text-sm">
          <p>EcoSense AI - Environmental Change Detection Platform</p>
          <p className="mt-1">Information Science and Engineering Major Project</p>
        </div>
      </footer>
    </div>
  );
}

export default App
