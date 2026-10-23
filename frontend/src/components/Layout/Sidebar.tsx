import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MapPin, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  MessageSquare, 
  FileText, 
  Save, 
  Settings, 
  LogOut 
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  available: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, available: true },
  { name: 'Location Analysis', path: '/analyze', icon: MapPin, available: true },
  { name: 'Land Cover', path: '/land-cover', icon: Layers, available: false },
  { name: 'Vegetation Change', path: '/vegetation', icon: TrendingUp, available: false },
  { name: 'Environmental Stress', path: '/stress', icon: AlertTriangle, available: false },
  { name: 'AI Assistant', path: '/ai-assistant', icon: MessageSquare, available: false },
  { name: 'Reports', path: '/reports', icon: FileText, available: false },
  { name: 'Saved Analyses', path: '/saved', icon: Save, available: false },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gradient-to-b from-eco-dark-900 to-eco-dark-800 border-r border-eco-green-800/30 min-h-screen flex flex-col">
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
                    ? 'bg-eco-green-900/40 text-eco-green-400 shadow-lg shadow-eco-green-900/20'
                    : item.available
                    ? 'text-eco-dark-300 hover:bg-eco-dark-700 hover:text-eco-green-400'
                    : 'text-eco-dark-600 cursor-not-allowed'
                }`}
                onClick={(e) => !item.available && e.preventDefault()}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
                {!item.available && (
                  <span className="ml-auto text-xs text-eco-dark-600">Soon</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-eco-green-800/30 p-3 space-y-1">
        <Link
          to="/settings"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-eco-dark-300 hover:bg-eco-dark-700 hover:text-eco-green-400 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
        <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-eco-dark-300 hover:bg-eco-dark-700 hover:text-red-400 transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
