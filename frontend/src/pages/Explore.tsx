/**
 * Explore Page - Global 3D map for location search and exploration
 */

import { useState } from 'react';
import { Search, MapPin, Globe2 } from 'lucide-react';
import CesiumGlobe from '../components/CesiumGlobe';
import { useNavigate } from 'react-router-dom';

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
}

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location>({
    name: 'Gonikoppal',
    latitude: 12.1833,
    longitude: 75.9276,
    country: 'India',
    region: 'Karnataka'
  });
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Use Nominatim geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
      );
      const data = await response.json();

      const results: Location[] = data.map((item: any) => ({
        name: item.display_name.split(',')[0],
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        country: item.display_name.split(',').pop()?.trim(),
        region: item.display_name
      }));

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchResults([]);
  };

  const handleAnalyze = () => {
    // Navigate to analyze page with location data
    navigate('/analyze', {
      state: {
        location: selectedLocation
      }
    });
  };

  return (
    <div className="bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#141d2a] min-h-screen pt-16 flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Search Header */}
      <div className="bg-gradient-to-r from-[#1a2332]/80 to-[#141d2a]/80 backdrop-blur-sm border-b border-green-500/20 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search any location (city, country, PIN, or coordinates)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-3 bg-[#0f1419] border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-800 border-b border-gray-800 last:border-b-0 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{result.name}</div>
                    <div className="text-sm text-gray-400 truncate">{result.region}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.latitude.toFixed(4)}°, {result.longitude.toFixed(4)}°
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Globe View */}
        <div className="flex-1 relative">
          <CesiumGlobe
            selectedLocation={selectedLocation}
            monitoringZones={[
              { name: 'Madikeri', latitude: 12.4214, longitude: 75.7387, pin: '571201' },
              { name: 'Virajpet', latitude: 12.1967, longitude: 75.8061, pin: '571218' },
              { name: 'Somwarpet', latitude: 12.5969, longitude: 75.8433, pin: '571236' },
              { name: 'Kushalnagar', latitude: 12.4599, longitude: 75.9594, pin: '571234' },
              { name: 'Gonikoppal', latitude: 12.1833, longitude: 75.9276, pin: '571213' },
            ]}
            onLocationClick={(zone) => {
              handleLocationSelect({
                name: zone.name,
                latitude: zone.latitude,
                longitude: zone.longitude,
                country: 'India',
                region: 'Karnataka, Coorg'
              });
            }}
            comparisonId={null}
            overlayVisible={false}
            onOverlayLoad={() => {}}
            onOverlayError={() => {}}
          />

          {/* Globe Info Overlay */}
          <div className="absolute top-4 left-4 bg-[#1a2332]/90 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="w-5 h-5 text-green-500" />
              <h3 className="text-white font-semibold">Explore the World</h3>
            </div>
            <p className="text-xs text-gray-400">
              Search and analyze environmental data globally
            </p>
          </div>
        </div>

        {/* Location Details Sidebar */}
        <div className="w-96 bg-[#1a2332] border-l border-gray-800 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-white mb-4">Selected Location</h2>

          {selectedLocation && (
            <div className="space-y-4">
              <div className="bg-[#0f1419] rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1">{selectedLocation.name}</h3>
                    {selectedLocation.country && (
                      <p className="text-sm text-gray-400">{selectedLocation.country}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Latitude:</span>
                    <span className="text-white font-mono">{selectedLocation.latitude.toFixed(6)}°N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Longitude:</span>
                    <span className="text-white font-mono">{selectedLocation.longitude.toFixed(6)}°E</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
              >
                Analyze This Location
              </button>

              <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Available Data</h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Sentinel-2 satellite imagery</li>
                  <li>• NDVI vegetation analysis</li>
                  <li>• Temporal change detection</li>
                  <li>• Environmental health metrics</li>
                </ul>
              </div>

              {/* Popular Locations */}
              <div className="pt-4 border-t border-gray-800">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Quick Access - Coorg Region</h4>
                <div className="space-y-2">
                  {[
                    { name: 'Madikeri', lat: 12.4214, lon: 75.7387 },
                    { name: 'Virajpet', lat: 12.1967, lon: 75.8061 },
                    { name: 'Somwarpet', lat: 12.5969, lon: 75.8433 },
                    { name: 'Kushalnagar', lat: 12.4599, lon: 75.9594 },
                    { name: 'Gonikoppal', lat: 12.1833, lon: 75.9276 },
                  ].map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => handleLocationSelect({
                        name: loc.name,
                        latitude: loc.lat,
                        longitude: loc.lon,
                        country: 'India',
                        region: 'Karnataka'
                      })}
                      className="w-full text-left px-3 py-2 bg-[#0f1419] hover:bg-gray-800 rounded text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
