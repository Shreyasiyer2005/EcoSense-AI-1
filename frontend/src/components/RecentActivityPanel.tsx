/**
 * Recent Activity Panel - Shows recent analysis activities
 */

import { MapPin, Satellite, TrendingUp, Clock } from 'lucide-react';

interface RecentActivityPanelProps {
  selectedLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  };
  lastComparison?: {
    earlierDate: string;
    laterDate: string;
    timestamp: string;
  };
  lastNDVI?: {
    averageValue: number;
    change: number;
    timestamp: string;
  };
}

interface Activity {
  type: 'location' | 'comparison' | 'ndvi' | 'segmentation';
  title: string;
  subtitle: string;
  timestamp: string;
  icon: any;
}

export default function RecentActivityPanel({
  selectedLocation,
  lastComparison,
  lastNDVI
}: RecentActivityPanelProps) {

  // Build activities from actual state
  const recentActivities: Activity[] = [];

  // Always show current location
  if (selectedLocation) {
    recentActivities.push({
      type: 'location',
      title: `${selectedLocation.name} selected`,
      subtitle: `${selectedLocation.latitude.toFixed(4)}°N, ${selectedLocation.longitude.toFixed(4)}°E`,
      timestamp: 'Current location',
      icon: MapPin
    });
  }

  // Show last comparison if available
  if (lastComparison) {
    recentActivities.push({
      type: 'comparison',
      title: 'Satellite comparison completed',
      subtitle: `${lastComparison.earlierDate} → ${lastComparison.laterDate}`,
      timestamp: lastComparison.timestamp,
      icon: Satellite
    });
  }

  // Show last NDVI if available
  if (lastNDVI) {
    const changeSign = lastNDVI.change >= 0 ? '+' : '';
    recentActivities.push({
      type: 'ndvi',
      title: 'NDVI analysis completed',
      subtitle: `Average NDVI: ${lastNDVI.averageValue.toFixed(2)} (${changeSign}${lastNDVI.change.toFixed(1)}%)`,
      timestamp: lastNDVI.timestamp,
      icon: TrendingUp
    });
  }

  // If no activities, show placeholder
  if (recentActivities.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
        </div>
        <div className="text-center py-8 text-gray-500 text-sm">
          <p>No recent activity</p>
          <p className="text-xs mt-1">Run an analysis to see results here</p>
        </div>
      </div>
    );
  }
  const getIconColor = (type: string) => {
    switch (type) {
      case 'location': return 'text-blue-500';
      case 'comparison': return 'text-purple-500';
      case 'ndvi': return 'text-green-500';
      case 'segmentation': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'location': return 'bg-blue-900/30';
      case 'comparison': return 'bg-purple-900/30';
      case 'ndvi': return 'bg-green-900/30';
      case 'segmentation': return 'bg-orange-900/30';
      default: return 'bg-gray-900/30';
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-white font-semibold text-sm">Recent Activity</h3>
      </div>

      <div className="space-y-2">
        {recentActivities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <div
              key={idx}
              className="bg-[#1a2332] border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${getIconBg(activity.type)}`}>
                  <Icon className={`w-4 h-4 ${getIconColor(activity.type)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white mb-0.5">
                    {activity.title}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {activity.subtitle}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {activity.timestamp}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
