import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TopNav from './components/Layout/TopNav';
import Home from './pages/Home';
import MainDashboard from './pages/MainDashboard';
import Explore from './pages/Explore';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import About from './pages/About';
import { AssistantPanel } from './components/AssistantPanel';

function AppContent() {
  return (
    <div className="min-h-screen bg-[#0f1419]">
      <TopNav />
      <main className="flex-1 pt-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<MainDashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/ai-assistant" element={
            <div className="p-8 min-h-screen bg-[#0f1419]">
              <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)]">
                <AssistantPanel />
              </div>
            </div>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AppContent />
    </BrowserRouter>
  );
}

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center p-8 min-h-screen bg-[#0f1419]">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">404 - Page Not Found</h2>
        <p className="text-gray-400 mb-6">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
          Go Home
        </a>
      </div>
    </div>
  );
}

export default App;
