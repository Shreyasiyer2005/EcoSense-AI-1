import { Link } from 'react-router-dom';
import { Bell, User, Settings, X, Check, CheckCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storageService, Notification } from '../../services/storage';

export default function TopNav() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    const allNotifications = storageService.getNotifications();
    setNotifications(allNotifications);
    setUnreadCount(storageService.getUnreadCount());
  };

  const handleMarkAsRead = (id: string) => {
    storageService.markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = () => {
    storageService.markAllNotificationsRead();
    loadNotifications();
  };

  const handleClearAll = () => {
    if (confirm('Clear all notifications?')) {
      storageService.clearNotifications();
      loadNotifications();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <nav className="bg-[#0f1419] border-b border-gray-800 fixed top-0 left-0 right-0 z-50 h-16">
      <div className="h-full px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">EcoSense AI</h1>
              <p className="text-xs text-green-400">AI for a Greener Tomorrow</p>
            </div>
          </Link>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              Home
            </Link>
            <Link to="/explore" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              Explore
            </Link>
            <Link to="/analyze" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              Analyze
            </Link>
            <Link to="/reports" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              Reports
            </Link>
            <Link to="/ai-assistant" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              AI Assistant
            </Link>
            <Link to="/about" className="text-gray-100 hover:text-green-400 transition-colors font-medium">
              About
            </Link>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-300 hover:text-green-400 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-[#1a2332] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {notifications.length > 0 && (
                        <>
                          <button
                            onClick={handleMarkAllRead}
                            className="text-xs text-green-400 hover:text-green-300"
                            title="Mark all as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleClearAll}
                            className="text-xs text-gray-400 hover:text-gray-300"
                            title="Clear all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No notifications yet</p>
                        <p className="text-xs mt-1">You'll see updates here when analyses complete</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-700/50 hover:bg-gray-900/50 transition-colors ${
                            !notification.read ? 'bg-green-900/10' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-white font-medium text-sm">{notification.title}</h4>
                                {!notification.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="text-green-400 hover:text-green-300 flex-shrink-0"
                                    title="Mark as read"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-400 text-xs mt-1 line-clamp-2">{notification.message}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500">{formatTime(notification.timestamp)}</span>
                                {notification.actionUrl && (
                                  <Link
                                    to={notification.actionUrl}
                                    onClick={() => setShowNotifications(false)}
                                    className="text-xs text-green-400 hover:text-green-300"
                                  >
                                    View →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <Link
              to="/settings"
              className="p-2 text-gray-300 hover:text-green-400 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* User */}
            <button className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#1a2332] hover:bg-gray-800 transition-colors">
              <User className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-100 hidden sm:inline">User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay to close notifications */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </nav>
  );
}
