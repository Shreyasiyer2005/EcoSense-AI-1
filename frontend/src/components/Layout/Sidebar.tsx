import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Layers,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Info
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  available: boolean;
}

const navItems: NavItem[] = [
  { name: 'Home', path: '/', icon: LayoutDashboard, available: true },
  { name: 'Explore', path: '/explore', icon: MapPin, available: true },
  { name: 'Analyze', path: '/analyze', icon: Layers, available: true },
  { name: 'Reports', path: '/reports', icon: FileText, available: true },
  { name: 'AI Assistant', path: '/ai-assistant', icon: MessageSquare, available: true },
  { name: 'About', path: '/about', icon: Info, available: true },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#0f1419] border-r border-gray-800 h-screen fixed left-0 top-16 flex flex-col overflow-y-auto">
      {/* Navigation Items */}
      <nav className="flex-1 py-6">
        <div className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.available ? item.path : '#'}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-green-900/40 text-green-400 shadow-lg shadow-green-900/20'
                    : item.available
                    ? 'text-gray-300 hover:bg-[#1a2332] hover:text-green-400'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                onClick={(e) => !item.available && e.preventDefault()}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
                {!item.available && (
                  <span className="ml-auto text-xs text-gray-600">Soon</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <Link
          to="/settings"
          className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
            location.pathname === '/settings'
              ? 'bg-green-900/40 text-green-400 shadow-lg shadow-green-900/20'
              : 'text-gray-300 hover:bg-[#1a2332] hover:text-green-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-[#1a2332] hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
