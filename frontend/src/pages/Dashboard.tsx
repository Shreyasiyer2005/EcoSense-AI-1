import { useState, useEffect } from 'react';
// Leaflet imports kept for rollback - currently not rendered
// import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';
import { Search, MapPin, Database, Satellite, Calendar, Cloud, Globe, Loader } from 'lucide-react';
import apiService from '../services/api';
import type { LocationResult } from '../types/location';
import NDVIAnalysis from '../components/NDVIAnalysis';
import CesiumGlobe from '../components/CesiumGlobe';
import OverlayLegend from '../components/OverlayLegend';

/* Leaflet icon configuration - kept for rollback
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
*/

// Five official Coorg monitoring zones
const quickLocations = [
  { name: 'Madikeri', pin: '571201', lat: 12.4214, lon: 75.7387 },
  { name: 'Virajpet', pin: '571218', lat: 12.1967, lon: 75.8061 },
  { name: 'Somwarpet', pin: '571236', lat: 12.5969, lon: 75.8433 },
  { name: 'Kushalnagar', pin: '571234', lat: 12.4599, lon: 75.9594 },
  { name: 'Gonikoppal', pin: '571213', lat: 12.1833, lon: 75.9276 },
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

  // Phase 8D.5: NDVI overlay state
  const [activeComparisonId, setActiveComparisonId] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayLoaded, setOverlayLoaded] = useState(false);
  const [overlayError, setOverlayError] = useState<string | null>(null);

  const handleQuickLocation = async (location: typeof quickLocations[0]) => {
    setLoading(true);
    setError(null);

    // Phase 8D.5: Clear overlay when changing locations
    setActiveComparisonId(null);
    setOverlayLoaded(false);
    setOverlayError(null);

    try {
      // Use known monitoring zone data directly - do NOT reverse geocode
      const locationResult: LocationResult = {
        id: Date.now(), // Unique ID for this selection
        name: location.name,
        latitude: location.lat,
        longitude: location.lon,
        state: 'Karnataka',
        country: 'India',
        type: 'monitoring_zone',
        source: 'coorg_zones',
        attribution: 'EcoSense AI Monitoring Network'
      };
      setSelectedLocation(locationResult);
      // Automatically search for satellite data
      searchSatelliteData(locationResult);
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
    setSatelliteProducts([]); // Clear previous results
    setError(null); // Clear previous errors

    try {
      // Search for last 90 days with max 20% cloud cover
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      console.log('[Dashboard] Starting satellite search for:', location.name,
        `(${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E)`);

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

      console.log('[Dashboard] Satellite search response:', {
        success: result.success,
        count: result.count || result.products?.length || 0,
        message: result.message
      });

      if (result.success && result.products) {
        setSatelliteProducts(result.products);
        console.log(`[Dashboard] Set ${result.products.length} products in state`);
      } else {
        console.warn('[Dashboard] Search succeeded but no products:', result.message);
        setError(result.message || 'No satellite products found');
      }
    } catch (err: any) {
      console.error('[Dashboard] Satellite search failed:', err);

      // Extract detailed error information
      const errorDetails = {
        message: err.message || 'Unknown error',
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        timeout: err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      };

      console.error('[Dashboard] Error details:', errorDetails);

      // Set user-friendly error message
      let errorMessage = 'Failed to search satellite products';
      if (errorDetails.timeout) {
        errorMessage = 'Satellite search timed out. The service may be slow. Please try again.';
      } else if (errorDetails.status === 401) {
        errorMessage = 'Authentication failed. Check Copernicus credentials.';
      } else if (errorDetails.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait and try again.';
      } else if (errorDetails.data?.message) {
        errorMessage = errorDetails.data.message;
      } else if (errorDetails.message) {
        errorMessage = errorDetails.message;
      }

      setError(errorMessage);
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

  // Remove unused variables
  // const mapCenter: [number, number] = selectedLocation
  //   ? [selectedLocation.latitude, selectedLocation.longitude]
  //   : [12.3375, 75.7380]; // Default to Coorg
  // const mapZoom = selectedLocation ? 13 : 10;

  return (
    <div className="">
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
                {/* Left Column - 3D Globe */}
                <div className="lg:col-span-2">
                  <div className="bg-eco-dark-900 rounded-lg shadow-2xl overflow-hidden border border-eco-dark-700">
                    <div className="px-4 py-3 border-b border-eco-dark-700 bg-eco-dark-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-eco-green-400" />
                          <h3 className="font-semibold text-white">Interactive 3D Earth</h3>
                        </div>
                        <span className="text-xs text-eco-green-400 bg-eco-green-900 bg-opacity-30 px-2 py-1 rounded">
                          ⚡ CesiumJS
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Global satellite monitoring • Five Coorg zones marked</p>
                    </div>
                    <div className="relative h-[600px] bg-eco-dark-900">
                      <CesiumGlobe
                        selectedLocation={selectedLocation ? {
                          name: selectedLocation.name,
                          latitude: selectedLocation.latitude,
                          longitude: selectedLocation.longitude
                        } : undefined}
                        monitoringZones={quickLocations.map(loc => ({
                          name: loc.name,
                          latitude: loc.lat,
                          longitude: loc.lon,
                          pin: loc.pin
                        }))}
                        onLocationClick={(zone) => {
                          handleQuickLocation(quickLocations.find(l => l.name === zone.name)!);
                        }}
                        comparisonId={activeComparisonId}
                        overlayVisible={overlayVisible}
                        onOverlayLoad={setOverlayLoaded}
                        onOverlayError={setOverlayError}
                      />

                      {/* Phase 8D.5: NDVI Overlay Legend */}
                      {overlayLoaded && (
                        <div className="absolute bottom-4 right-4">
                          <OverlayLegend
                            visible={overlayVisible}
                            onVisibilityToggle={() => setOverlayVisible(!overlayVisible)}
                          />
                        </div>
                      )}

                      {/* Phase 8D.5: Overlay Error Notification */}
                      {overlayError && (
                        <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
                          <div className="flex items-start gap-2">
                            <span className="text-red-600">❌</span>
                            <div>
                              <p className="text-sm font-medium text-red-800">Overlay Load Failed</p>
                              <p className="text-xs text-red-700 mt-1">{overlayError}</p>
                              <button
                                onClick={() => setOverlayError(null)}
                                className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leaflet fallback - kept commented for rollback
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
                  */}

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

                      {satelliteLoading && (
                        <div className="text-center py-8">
                          <Loader className="w-12 h-12 text-eco-green-600 mx-auto mb-3 animate-spin" />
                          <p className="text-sm font-medium text-gray-800 mb-1">Searching Copernicus Data Space...</p>
                          <p className="text-xs text-gray-600">This may take up to 30 seconds</p>
                        </div>
                      )}

                      {!satelliteLoading && satelliteStatus?.configured && satelliteProducts.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Satellite className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-sm text-gray-600">No recent imagery found</p>
                          <p className="text-xs text-gray-500 mt-1">Try selecting a different location or check back later</p>
                          {error && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                              <strong>Error:</strong> {error}
                            </div>
                          )}
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
                    <div className="bg-white rounded-lg shadow p-4 col-span-2">
                      <NDVIAnalysis
                        satelliteProducts={satelliteProducts}
                        locationName={selectedLocation.name}
                        bbox={{
                          west: selectedLocation.longitude - 0.005,
                          south: selectedLocation.latitude - 0.005,
                          east: selectedLocation.longitude + 0.005,
                          north: selectedLocation.latitude + 0.005
                        }}
                        onComparisonComplete={(comparisonId) => {
                          setActiveComparisonId(comparisonId);
                          setOverlayError(null);
                        }}
                      />
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Land Cover Classification</h3>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🗺️</div>
                        <p className="text-sm text-gray-600 font-medium">Not Implemented</p>
                        <p className="text-xs text-gray-500 mt-1">U-Net model training required</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">Multi-Temporal Change</h3>
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      </div>
                      <div className="text-center py-8">
                        <div className="text-4xl mb-2">🌲</div>
                        <p className="text-sm text-gray-600 font-medium">Not Implemented</p>
                        <p className="text-xs text-gray-500 mt-1">Time series analysis required</p>
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
                        Local AI Environmental Assistant
                      </h3>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Conversational AI assistant powered by local Ollama integration. Ask questions about NDVI results, vegetation health, or environmental monitoring.
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                          <span className="font-medium">Example:</span> "Explain this NDVI value and what it means for vegetation"
                        </div>
                        <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
                          <span className="font-medium">Example:</span> "What factors affect vegetation health in this region?"
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 text-lg">✓</span>
                          <div className="flex-1">
                            <p className="font-semibold text-green-900 mb-1">Active Integration</p>
                            <p className="text-green-800 text-xs">
                              <strong>Model:</strong> qwen2.5:3b (Ollama)<br/>
                              <strong>Features:</strong> NDVI interpretation, environmental Q&A<br/>
                              <strong>Cost:</strong> ₹0 (local inference)
                            </p>
                          </div>
                        </div>
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
                        <span className="text-gray-700">Location Input ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Satellite Data Search ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">NDVI Analysis ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Historical Comparison ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">AI Assistant (Ollama) ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">3D Globe Visualization ✓</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <span className="text-gray-700">U-Net Land Cover (Not Trained)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No Location Selected - Show Interactive Globe
            <div className="space-y-6">
              <div className="bg-eco-dark-900 rounded-lg shadow-2xl overflow-hidden border border-eco-dark-700">
                <div className="px-4 py-3 border-b border-eco-dark-700 bg-eco-dark-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-eco-green-400" />
                      <h3 className="font-semibold text-white">Interactive 3D Earth - Coorg Region</h3>
                    </div>
                    <span className="text-xs text-eco-green-400 bg-eco-green-900 bg-opacity-30 px-2 py-1 rounded">
                      ⚡ CesiumJS
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Explore the five monitoring zones in Karnataka's Western Ghats</p>
                </div>
                <div className="relative h-[700px] bg-eco-dark-900">
                  <CesiumGlobe
                    selectedLocation={undefined}
                    monitoringZones={quickLocations.map(loc => ({
                      name: loc.name,
                      latitude: loc.lat,
                      longitude: loc.lon,
                      pin: loc.pin
                    }))}
                    onLocationClick={(zone) => {
                      handleQuickLocation(quickLocations.find(l => l.name === zone.name)!);
                    }}
                  />
                </div>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <div className="w-16 h-16 bg-eco-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-eco-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a Location to Begin Analysis</h2>
                  <p className="text-gray-600 mb-6">
                    Click a green marker on the 3D globe above, use the quick options at the top, or search for any location in Karnataka's Western Ghats region.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">✓ Currently Available</h3>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Interactive 3D Earth visualization</li>
                        <li>• Five Coorg monitoring zones</li>
                        <li>• Location search by name or PIN</li>
                        <li>• Sentinel-2 satellite imagery search</li>
                        <li>• Real NDVI vegetation analysis</li>
                        <li>• AI environmental assistant</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">⏳ Coming Soon</h3>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li>• Satellite imagery overlay on globe</li>
                        <li>• NDVI heatmap visualization</li>
                        <li>• Temporal change detection maps</li>
                        <li>• Global location search</li>
                        <li>• Environmental stress predictions</li>
                      </ul>
                    </div>
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
