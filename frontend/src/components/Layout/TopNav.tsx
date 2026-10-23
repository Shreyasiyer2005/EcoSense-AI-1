import { Link } from 'react-router-dom';
import { Bell, User } from 'lucide-react';

export default function TopNav() {
  return (
    <nav className="bg-gradient-to-r from-eco-dark-900 via-eco-dark-800 to-eco-dark-900 border-b border-eco-green-800/30 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="h-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-eco-green-600 to-eco-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EcoSense AI</h1>
              <p className="text-xs text-eco-green-400">AI for a Greener Tomorrow</p>
            </div>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-eco-dark-100 hover:text-eco-green-400 transition-colors font-medium">
              Home
            </Link>
            <Link to="/analyze" className="text-eco-dark-100 hover:text-eco-green-400 transition-colors font-medium">
              Analyze
            </Link>
            <Link to="/explore" className="text-eco-dark-300 hover:text-eco-green-400 transition-colors font-medium">
              Explore
            </Link>
            <Link to="/reports" className="text-eco-dark-300 hover:text-eco-green-400 transition-colors font-medium">
              Reports
            </Link>
            <Link to="/ai-assistant" className="text-eco-dark-300 hover:text-eco-green-400 transition-colors font-medium">
              AI Assistant
            </Link>
            <Link to="/about" className="text-eco-dark-300 hover:text-eco-green-400 transition-colors font-medium">
              About
            </Link>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-eco-dark-300 hover:text-eco-green-400 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-eco-green-500 rounded-full"></span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-eco-dark-700 hover:bg-eco-dark-600 transition-colors">
              <User className="w-5 h-5 text-eco-green-400" />
              <span className="text-sm text-eco-dark-100 hidden sm:inline">User</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
