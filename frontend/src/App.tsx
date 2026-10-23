import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopNav from './components/Layout/TopNav';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import LocationAnalysis from './pages/LocationAnalysis';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopNav />
        <div className="flex flex-1">
          <Sidebar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<LocationAnalysis />} />
            <Route path="/land-cover" element={<PlaceholderPage title="Land Cover Analysis" />} />
            <Route path="/vegetation" element={<PlaceholderPage title="Vegetation Change" />} />
            <Route path="/stress" element={<PlaceholderPage title="Environmental Stress" />} />
            <Route path="/ai-assistant" element={<PlaceholderPage title="AI Assistant" />} />
            <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
            <Route path="/saved" element={<PlaceholderPage title="Saved Analyses" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/explore" element={<PlaceholderPage title="Explore" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-600 mb-6">
          This feature will be available in upcoming phases.
        </p>
        <div className="inline-block px-6 py-3 bg-eco-green-100 text-eco-green-800 rounded-lg">
          Coming Soon
        </div>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">About EcoSense AI</h1>
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Project Overview</h2>
            <p className="text-gray-700 leading-relaxed">
              EcoSense AI is an intelligent environmental monitoring platform that uses satellite data 
              and deep learning to detect vegetation changes, analyze land cover, and assess environmental 
              health. Focused on the Western Ghats region of Karnataka, India, particularly Coorg (Kodagu), 
              this platform provides actionable insights for conservation and sustainable development.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Technology Stack</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-eco-green-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Frontend</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• React + TypeScript</li>
                  <li>• Vite Build Tool</li>
                  <li>• Tailwind CSS</li>
                  <li>• Leaflet Maps</li>
                </ul>
              </div>
              <div className="p-4 bg-eco-green-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Backend</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Node.js + Express</li>
                  <li>• Python + FastAPI</li>
                  <li>• PostgreSQL + PostGIS</li>
                  <li>• Nominatim Geocoding</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Key Features</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-eco-green-600 mr-2">✓</span>
                Location-based environmental analysis (PIN code, place name, coordinates)
              </li>
              <li className="flex items-start">
                <span className="text-eco-green-600 mr-2">✓</span>
                Sentinel-2 satellite imagery integration (Phase 3)
              </li>
              <li className="flex items-start">
                <span className="text-eco-green-600 mr-2">✓</span>
                NDVI vegetation health monitoring (Phase 4)
              </li>
              <li className="flex items-start">
                <span className="text-eco-green-600 mr-2">✓</span>
                U-Net deep learning land cover classification (Phase 5)
              </li>
              <li className="flex items-start">
                <span className="text-eco-green-600 mr-2">✓</span>
                AI-powered environmental insights (Phase 6)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">Academic Project</h2>
            <p className="text-gray-700 leading-relaxed">
              This is a major project for Information Science and Engineering, demonstrating 
              full-stack development, geospatial analysis, machine learning integration, and 
              real-world environmental application with scientific responsibility.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
