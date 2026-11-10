import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component, ErrorInfo, ReactNode } from 'react';
import TopNav from './components/Layout/TopNav';
import Home from './pages/Home';
import MainDashboard from './pages/MainDashboard';
import Explore from './pages/Explore';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import About from './pages/About';
import { AssistantPanel } from './components/AssistantPanel';

// Error Boundary to catch and display errors gracefully
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-red-950/20 border border-red-800/50 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              ⚠️ Application Error
            </h1>
            <p className="text-gray-300 mb-4">
              An error occurred while loading the application.
            </p>
            {this.state.error && (
              <div className="bg-black/40 rounded p-4 mb-4">
                <p className="text-sm text-red-300 font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <BrowserRouter basename="/EcoSense-AI-1" future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
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
