/**
 * Main Dashboard - Analyze Page (Redesigned)
 * Dedicated analysis workspace without globe or sidebars
 * Focus on satellite analysis with maximum screen space
 * Supports universal location search (PIN codes, place names, coordinates)
 */

import { useState, useEffect } from 'react';
import { MapPin, ArrowLeft } from 'lucide-react';
import SatelliteAnalysisPanel from '../components/SatelliteAnalysisPanel';
import LocationSearchBar from '../components/LocationSearchBar';
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom';

interface SelectedLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export default function MainDashboard() {
  const routerLocation = useRouterLocation();
  const navigate = useNavigate();

  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation>({
    name: 'Gonikoppal',
    latitude: 12.1833,
    longitude: 75.9276
  });

  const [satelliteProducts] = useState<any[]>([]);
  const [loading] = useState(false);

  // Check if location was passed from Explore page
  useEffect(() => {
    if (routerLocation.state?.location) {
      const loc = routerLocation.state.location;
      setSelectedLocation({
        name: loc.name,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
    }
  }, [routerLocation.state]);

  return (
    <div className="bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#141d2a] h-full overflow-hidden flex flex-col">
      {/* Fixed header space accounting */}
      <div className="h-16 flex-shrink-0"></div>

      {/* Header Bar with Location Search */}
      <div className="bg-[#1a2332] border-b border-gray-800 px-6 py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Explore</span>
            </button>

            <div className="h-auto w-px bg-gray-700 flex-shrink-0 self-stretch"></div>

            {/* Location Info and Search */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <MapPin className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">{selectedLocation.name}</h1>
                  <p className="text-xs text-gray-400">
                    {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                  </p>
                </div>
              </div>

              {/* Universal Location Search */}
              <LocationSearchBar
                onLocationSelect={(location) => {
                  console.log('[MainDashboard] Location selected:', location);
                  setSelectedLocation(location);
                }}
                initialValue=""
                placeholder="Search: PIN code, place name, or coordinates..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Analysis Ready</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Workspace - Full Width */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SatelliteAnalysisPanel
          selectedLocation={selectedLocation}
          satelliteProducts={satelliteProducts}
          loading={loading}
          onComparisonComplete={() => {}}
          bbox={{
            west: selectedLocation.longitude - 0.05,
            south: selectedLocation.latitude - 0.05,
            east: selectedLocation.longitude + 0.05,
            north: selectedLocation.latitude + 0.05
          }}
        />
      </div>
    </div>
  );
}
