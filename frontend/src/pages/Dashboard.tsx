import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, MapPin, Database, Satellite, Calendar, Cloud } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import apiService from '../services/api';
import type { LocationResult } from '../types/location';

// Fix for default marker icons in react-leaflet
import L from 'leaflet';

// Use CDN URLs for marker icons
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const quickLocations = [
  { name: 'Coorg', pin: '571201', lat: 12.3375, lon: 75.7380 },
  { name: 'Madikeri', pin: '571201', lat: 12.4214, lon: 75.7387 },
  { name: 'Somwarpet', pin: '571236', lat: 12.5969, lon: 75.8433 },
  { name: 'Virajpet', pin: '571218', lat: 12.1967, lon: 75.8061 },
];

interface SatelliteProduct {
  id: string;
  name: string;
  acquisitionDate: string;
  cloudCover: string | null;
  platformName: string | null;
  tileId: string | null;
  online: boolean;
}

export default function Dashboard() {
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [satelliteProducts, setSatelliteProducts] = useState<SatelliteProduct[]>([]);
  const [satelliteLoading, setSatelliteLoading] = useState(false);
  const [satelliteStatus, setSatelliteStatus] = useState<any>(null);

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
        // Automatically search for satellite data
        searchSatelliteData(result.results[0]);
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
        // Automatically search for satellite data
        searchSatelliteData(result.results[0]);
      }
    } catch (err) {
      setError('Location not found');
    } finally {
      setLoading(false);
    }
  };

  const searchSatelliteData = async (location: LocationResult) => {
    setSatelliteLoading(true);
    setSatelliteProducts([]);
    try {
      // Search for last 90 days with max 20% cloud cover
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await apiService.searchSatelliteProducts(
        location.latitude,
        location.longitude,
        {
          startDate,
          endDate,
          maxCloudCover: 20,
          limit: 10
        }
      );
      
      if (result.success && result.products) {
        setSatelliteProducts(result.products);
      }
    } catch (err) {
      console.error('Satellite search failed:', err);
    } finally {
      setSatelliteLoading(false);
    }
  };

  // Check satellite service status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await apiService.getSatelliteStatus();
        setSatelliteStatus(status);
      } catch (err) {
        console.error('Failed to check satellite status');
      }
    };
    checkStatus();
  }, []);

  const mapCenter: [number, number] = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : [12.3375, 75.7380]; // Default to Coorg

  const mapZoom = selectedLocation ? 13 : 10;

  return (
    <div className="ml-64">
      {/* Hero Section with Forest Background */}
      <div 
        className="relative bg-cover bg-center h-[400px] flex items-center"
        style={{
          backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(22, 101, 52, 0.6)), url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop')`,
          backgroundPosition: 'center 40%'
        }}
      >
        <div className="w-full flex flex-col items-center justify-center text-center px-6 py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Monitor Environmental Change
          </h1>
          <p className="text-lg md:text-xl text-gray-200 max-w-3xl mb-6">
            Real-time satellite analysis for Western Ghats conservation
          </p>

          {/* Location Search Panel */}
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-3xl w-full">
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
              <div className="flex-1 w-full">
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
                className="w-full sm:w-auto px-6 py-3 bg-eco-green-600 hover:bg-eco-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Quick Locations */}
            <div className="grid grid-cols-4 gap-2">
              {quickLocations.map((loc) => (
                <button
                  key={loc.name}
                  onClick={() => handleQuickLocation(loc)}
                  disabled={loading}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-gray-300 hover:border-eco-green-600 hover:bg-eco-green-50 transition-all text-gray-700 text-sm disabled:opacity-50"
                >
                  <MapPin className="w-4 h-4 text-eco-green-600" />
                  <span className="font-medium">{loc.name}</span>
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
      <div className="bg-gray-50 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          
          {selectedLocation ? (
            // Location Selected - Show Analysis Dashboard
            <div className="space-y-6">
              {/* Location Header */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedLocation.name}</h2>
                    <p className="text-gray-600">{selectedLocation.state}, {selectedLocation.country}</p>
                    <p className="text-sm text-gray-500 font-mono mt-1">
                      {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Change Location
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Map */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-800">Location Map</h3>
                      <p className="text-xs text-gray-600">Standard map tiles • Satellite imagery not yet integrated</p>
                    </div>
                    <div className="relative h-[450px]">
                      <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%' }}
                        key={`${mapCenter[0]}-${mapCenter[1]}`}
                        scrollWheelZoom={true}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={mapCenter}>
                          <Popup>
                            <div className="text-sm">
                              <strong>{selectedLocation.name}</strong>
                              <br />
                              {selectedLocation.state}, {selectedLocation.country}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>

                  {/* Satellite Products Section */}
                  <div className="mt-6">
                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Satellite className="w-5 h-5 text-eco-green-600" />
                          Sentinel-2 Satellite Imagery
                        </h3>
                        {satelliteStatus?.configured && (
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            Live Data
                          </div>
                        )}
                      </div>

                      {satelliteLoading && (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-eco-green-600"></div>
                          <p className="text-sm text-gray-600 mt-2">Searching Copernicus Data Space...</p>
                        </div>
                      )}

                      {!satelliteLoading && !satelliteStatus?.configured && (
                        <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                          <Satellite className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                          <p className="text-sm font-medium text-yellow-800 mb-2">Satellite Service Not Configured</p>
                          <p className="text-xs text-yellow-700 mb-3">
                            To access real Sentinel-2 imagery, configure Copernicus credentials
                          </p>
                          <a
                            href="https://dataspace.copernicus.eu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-yellow-800 underline hover:text-yellow-900"
                          >
                            Register for free access →
                          </a>
                        </div>
                      )}

                      {!satelliteLoading && satelliteStatus?.configured && satelliteProducts.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Satellite className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">No recent imagery found</p>
                          <p className="text-xs text-gray-500 mt-1">Try adjusting the date range or cloud cover filter</p>
                        </div>
                      )}

                      {!satelliteLoading && satelliteProducts.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 mb-3">
                            Found <strong>{satelliteProducts.length}</strong> Sentinel-2 L2A products (last 90 days, &lt;20% cloud)
                          </p>
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {satelliteProducts.map((product, index) => (
                              <div
                                key={product.id}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-eco-green-500 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Calendar className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm font-medium text-gray-800">
                                        {new Date(product.acquisitionDate).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                    {product.cloudCover && (
                                      <div className="flex items-center gap-2 mb-1">
                                        <Cloud className="w-4 h-4 text-gray-500" />
                                        <span className="text-xs text-gray-600">
                                          {parseFloat(product.cloudCover).toFixed(1)}% cloud cover
                                        </span>
                                      </div>
                                    )}
                                    {product.tileId && (
                                      <p className="text-xs text-gray-500 font-mono mt-1">
                                        {product.tileId}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {product.online && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                        Online
                                      </span>
                                    )}
                                    {index === 0 && (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Most Recent
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            <strong>Real data from Copernicus Data Space Ecosystem</strong><br />
                            Satellite imagery display and processing will be added in future phases
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Environmental Data Cards */}
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">NDVI Analysis</h3>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">📡</div>
                        <p className="text-sm text-gray-600">Satellite data required</p>
                        <p className="text-xs text-gray-500 mt-1">Will be available in Phase 3+</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Land Cover</h3>
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🗺️</div>
                        <p className="text-sm text-gray-600">U-Net model not trained</p>
                        <p className="text-xs text-gray-500 mt-1">Will be available in Phase 5</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Vegetation Change</h3>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🌲</div>
                        <p className="text-sm text-gray-600">Historical data required</p>
                        <p className="text-xs text-gray-500 mt-1">Will be available in Phase 4</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Environmental Risk</h3>
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">⚠️</div>
                        <p className="text-sm text-gray-600">Analysis not available</p>
                        <p className="text-xs text-gray-500 mt-1">Will be available in Phase 6</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - AI Assistant & Info */}
                <div className="space-y-6">
                  {/* AI Assistant */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-eco-green-600 to-eco-green-700 text-white">
                      <h3 className="font-semibold flex items-center gap-2">
                        <span>🤖</span>
                        AI Environmental Assistant
                      </h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        AI-powered insights will analyze vegetation health, detect changes, and suggest conservation actions.
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                          <span className="font-medium">Example:</span> "What vegetation changes occurred in the last 6 months?"
                        </div>
                        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                          <span className="font-medium">Example:</span> "Suggest conservation priorities for this area"
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                        <strong>Phase 6:</strong> LLM integration planned with Gemini/GPT-4
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4 text-eco-green-600" />
                      Location Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <span className="ml-2 text-gray-800 font-medium">{selectedLocation.type}</span>
                      </div>
                      {selectedLocation.importance && (
                        <div>
                          <span className="text-gray-600">Importance:</span>
                          <span className="ml-2 text-gray-800 font-medium">{selectedLocation.importance.toFixed(2)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <span className="ml-2 text-gray-800 font-medium capitalize">{selectedLocation.source}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-gray-200 text-xs text-gray-500">
                        {selectedLocation.attribution}
                      </div>
                    </div>
                  </div>

                  {/* Project Status */}
                  <div className="bg-gradient-to-br from-eco-green-50 to-white rounded-lg shadow p-4 border border-eco-green-200">
                    <h3 className="font-semibold text-gray-800 mb-3">Implementation Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Phase 2: Location Input ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-700">Phase 3: Satellite Data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-gray-700">Phase 4: NDVI Analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-gray-700">Phase 5: U-Net Classification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-gray-700">Phase 6: AI Integration</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No Location Selected - Show Welcome State
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-eco-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-eco-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Location to Begin</h2>
                <p className="text-gray-600 mb-6">
                  Choose a location from the quick options above or search for any place in Karnataka's Western Ghats region.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">✓ Currently Available</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Location search by name or PIN</li>
                      <li>• Coordinate-based lookup</li>
                      <li>• Interactive map visualization</li>
                      <li>• Geocoding with Nominatim</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">⏳ Coming Soon</h3>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Sentinel-2 satellite imagery</li>
                      <li>• NDVI vegetation analysis</li>
                      <li>• U-Net land cover classification</li>
                      <li>• AI environmental insights</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
