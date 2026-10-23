import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, MapPin, Database } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/api';
import type { LocationResult } from '../types/location';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const quickLocations = [
  { name: 'Coorg', pin: '571201', lat: 12.3375, lon: 75.7380 },
  { name: 'Madikeri', pin: '571201', lat: 12.4214, lon: 75.7387 },
  { name: 'Somwarpet', pin: '571236', lat: 12.5969, lon: 75.8433 },
  { name: 'Virajpet', pin: '571218', lat: 12.1967, lon: 75.8061 },
];

export default function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLocation = async (location: typeof quickLocations[0]) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.resolveLocation('coordinates', {
        latitude: location.lat,
        longitude: location.lon
      });
      if (result.results && result.results.length > 0) {
        setSelectedLocation(result.results[0]);
      }
    } catch (err) {
      setError('Failed to load location');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await apiService.resolveLocation('place', searchQuery);
      if (result.results && result.results.length > 0) {
        setSelectedLocation(result.results[0]);
      }
    } catch (err) {
      setError('Location not found');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : [12.3375, 75.7380]; // Default to Coorg

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero Section with Forest Background */}
      <div 
        className="relative bg-cover bg-center h-96"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.8)), url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop')`,
          backgroundPosition: 'center 40%'
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <h1 className="text-5xl font-bold text-white mb-4">
            Understand Your Environment.
          </h1>
          <h2 className="text-4xl font-bold text-eco-green-400 mb-6">
            Protect What Matters.
          </h2>
          <p className="text-xl text-eco-dark-200 max-w-3xl mb-8">
            Analyze land cover, vegetation changes and environmental health using satellite data and AI.
          </p>

          {/* Location Search Panel */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 max-w-4xl w-full">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Enter PIN Code, Location Name, or Coordinates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-eco-green-600 focus:ring-2 focus:ring-eco-green-200 outline-none text-gray-800"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-8 py-3 bg-eco-green-600 hover:bg-eco-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors shadow-lg"
              >
                {loading ? 'Searching...' : 'Analyze Area'}
              </button>
            </div>

            {/* Quick Locations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickLocations.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handleQuickLocation(loc)}
                  className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-eco-green-600 hover:bg-eco-green-50 transition-all text-gray-700"
                >
                  <MapPin className="w-6 h-6 text-eco-green-600 mb-2" />
                  <span className="font-semibold text-sm">{loc.name}</span>
                  <span className="text-xs text-gray-500">{loc.pin}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Map and Location Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Map */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-eco-green-50 to-white">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-eco-green-600" />
                  Selected Area - {selectedLocation?.state || 'Coorg Region'}
                </h3>
              </div>
              <div className="relative h-96">
                <MapContainer
                  center={mapCenter}
                  zoom={selectedLocation ? 12 : 10}
                  style={{ height: '100%', width: '100%' }}
                  key={`${mapCenter[0]}-${mapCenter[1]}`}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {selectedLocation && (
                    <Marker position={mapCenter}>
                      <Popup>
                        <div className="text-sm">
                          <strong>{selectedLocation.name}</strong>
                          <br />
                          {selectedLocation.state}, {selectedLocation.country}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              <div className="px-6 py-3 bg-gray-50 text-xs text-gray-600">
                © OpenStreetMap contributors
              </div>
            </div>

            {/* Area Information */}
            {selectedLocation && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-eco-green-600" />
                  Area Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-800">{selectedLocation.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coordinates</p>
                    <p className="font-mono text-sm text-gray-800">
                      {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State</p>
                    <p className="font-semibold text-gray-800">{selectedLocation.state || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Country</p>
                    <p className="font-semibold text-gray-800">{selectedLocation.country || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Results Placeholder */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis Results</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">NDVI & Vegetation</p>
                  <p className="text-xs text-gray-400">Available in Phase 4</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Land Cover (U-Net)</p>
                  <p className="text-xs text-gray-400">Available in Phase 5</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Environmental Stress</p>
                  <p className="text-xs text-gray-400">Available in Phase 6</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - AI Assistant and Insights */}
          <div className="space-y-6">
            {/* AI Environmental Assistant */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-eco-green-600 to-eco-green-700 text-white">
                <h3 className="text-lg font-semibold flex items-center">
                  <span className="mr-2">🤖</span>
                  AI Environmental Assistant
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Ask questions about vegetation changes, land cover, and conservation in the selected area.
                </p>
                <div className="space-y-2">
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-eco-green-50 rounded-lg text-sm text-gray-700 transition-colors">
                    💬 What changes are seen in vegetation?
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-eco-green-50 rounded-lg text-sm text-gray-700 transition-colors">
                    💬 Is there deforestation in this area?
                  </button>
                  <button className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-eco-green-50 rounded-lg text-sm text-gray-700 transition-colors">
                    💬 Suggest conservation actions
                  </button>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  AI agent will be available in Phase 6 with LLM integration
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-eco-green-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">
                    Select a location to view vegetation health and environmental indicators
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">
                    NDVI analysis requires satellite data retrieval (Phase 3)
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <p className="text-sm text-gray-700">
                    Land cover classification uses U-Net deep learning (Phase 5)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
