import { useState } from 'react';
import apiService from '../services/api';
import { LocationType, LocationResponse, LocationResult } from '../types/location';

export default function LocationAnalysis() {
  const [locationType, setLocationType] = useState<LocationType>('place');
  const [inputValue, setInputValue] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<LocationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);
    setSelectedLocation(null);

    try {
      let value: any;

      switch (locationType) {
        case 'place':
        case 'pincode':
          if (!inputValue.trim()) {
            throw new Error(`Please enter a ${locationType === 'place' ? 'place name' : 'PIN code'}`);
          }
          value = inputValue.trim();
          break;

        case 'coordinates':
          const lat = parseFloat(latitude);
          const lon = parseFloat(longitude);
          if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Please enter valid numeric coordinates');
          }
          value = { latitude: lat, longitude: lon };
          break;

        case 'polygon':
          throw new Error('Polygon input not yet implemented in Phase 2');

        default:
          throw new Error('Invalid location type');
      }

      const result = await apiService.resolveLocation(locationType, value, 'IN');
      setResponse(result);

      // Auto-select if only one result
      if (result.results && result.results.length === 1) {
        setSelectedLocation(result.results[0]);
      }
    } catch (err: any) {
      console.error('Location resolution error:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Failed to resolve location'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (location: LocationResult) => {
    setSelectedLocation(location);
  };

  const handleReset = () => {
    setInputValue('');
    setLatitude('');
    setLongitude('');
    setResponse(null);
    setError(null);
    setSelectedLocation(null);
  };

  return (
    <div className="min-h-screen bg-eco-dark-900 text-eco-dark-100">
      {/* Header */}
      <header className="bg-eco-dark-800 border-b border-eco-green-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-eco-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-eco-green-500">EcoSense AI</h1>
                <p className="text-sm text-eco-dark-400">Location Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Select Analysis Location</h2>
            <p className="text-eco-dark-300">
              Enter a location to analyze environmental changes and vegetation health
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="bg-eco-dark-800 rounded-lg p-6 border border-eco-dark-700">
              <h3 className="text-xl font-semibold mb-6 text-eco-green-500">Location Input</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Type Selector */}
                <div>
                  <label className="block text-sm font-medium mb-3">Input Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'place', label: 'Place Name', icon: '🏘️' },
                      { value: 'pincode', label: 'PIN Code', icon: '📮' },
                      { value: 'coordinates', label: 'Coordinates', icon: '🌐' },
                      { value: 'polygon', label: 'Polygon', icon: '⬡', disabled: true }
                    ].map(({ value, label, icon, disabled }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => !disabled && setLocationType(value as LocationType)}
                        disabled={disabled}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          locationType === value
                            ? 'border-eco-green-600 bg-eco-green-900/20 text-eco-green-400'
                            : disabled
                            ? 'border-eco-dark-700 bg-eco-dark-900 text-eco-dark-500 cursor-not-allowed'
                            : 'border-eco-dark-700 bg-eco-dark-900 hover:border-eco-green-700 text-eco-dark-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-sm font-medium">{label}</div>
                        {disabled && <div className="text-xs text-eco-dark-500 mt-1">Phase 3</div>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Fields */}
                {locationType === 'place' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Place Name</label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., Coorg, Madikeri, Kodagu"
                      className="w-full px-4 py-3 bg-eco-dark-900 border border-eco-dark-700 rounded-lg focus:border-eco-green-600 focus:outline-none text-white placeholder-eco-dark-500"
                    />
                    <p className="mt-2 text-sm text-eco-dark-400">
                      Enter city, district, or region name
                    </p>
                  </div>
                )}

                {locationType === 'pincode' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Indian PIN Code</label>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., 571201"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-eco-dark-900 border border-eco-dark-700 rounded-lg focus:border-eco-green-600 focus:outline-none text-white placeholder-eco-dark-500"
                    />
                    <p className="mt-2 text-sm text-eco-dark-400">
                      Enter 6-digit Indian postal code
                    </p>
                  </div>
                )}

                {locationType === 'coordinates' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Latitude</label>
                      <input
                        type="text"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="e.g., 12.3375"
                        className="w-full px-4 py-3 bg-eco-dark-900 border border-eco-dark-700 rounded-lg focus:border-eco-green-600 focus:outline-none text-white placeholder-eco-dark-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Longitude</label>
                      <input
                        type="text"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="e.g., 75.7380"
                        className="w-full px-4 py-3 bg-eco-dark-900 border border-eco-dark-700 rounded-lg focus:border-eco-green-600 focus:outline-none text-white placeholder-eco-dark-500"
                      />
                    </div>
                    <p className="text-sm text-eco-dark-400">
                      Coorg example: 12.3375°N, 75.7380°E
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-eco-green-600 hover:bg-eco-green-700 disabled:bg-eco-dark-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resolving...
                      </span>
                    ) : (
                      'Find Location'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-eco-dark-700 hover:bg-eco-dark-600 text-white rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {/* Error Display */}
              {error && (
                <div className="mt-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-red-300 font-medium">Error</p>
                      <p className="text-red-400 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Panel */}
            <div className="bg-eco-dark-800 rounded-lg p-6 border border-eco-dark-700">
              <h3 className="text-xl font-semibold mb-6 text-eco-green-500">Results</h3>

              {!response && !error && (
                <div className="text-center py-12 text-eco-dark-400">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p>Enter a location to see results</p>
                </div>
              )}

              {response && response.results && response.results.length > 0 && (
                <div className="space-y-4">
                  <div className="p-3 bg-eco-green-900/20 border border-eco-green-800 rounded-lg">
                    <p className="text-eco-green-300 text-sm">{response.message}</p>
                    {response.note && (
                      <p className="text-eco-dark-400 text-xs mt-1">{response.note}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {response.results.map((result) => (
                      <div
                        key={result.id}
                        onClick={() => handleSelectLocation(result)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedLocation?.id === result.id
                            ? 'border-eco-green-600 bg-eco-green-900/20'
                            : 'border-eco-dark-700 bg-eco-dark-900 hover:border-eco-green-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-white mb-1">{result.name}</h4>
                            <div className="flex flex-wrap gap-2 text-xs text-eco-dark-400">
                              {result.state && <span>📍 {result.state}</span>}
                              {result.country && <span>🌍 {result.country}</span>}
                              {result.type && <span className="px-2 py-0.5 bg-eco-dark-800 rounded">{result.type}</span>}
                            </div>
                          </div>
                          {selectedLocation?.id === result.id && (
                            <svg className="w-6 h-6 text-eco-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t border-eco-dark-700">
                          <div>
                            <span className="text-eco-dark-500">Latitude:</span>
                            <span className="ml-2 text-eco-dark-200">{result.latitude.toFixed(4)}°</span>
                          </div>
                          <div>
                            <span className="text-eco-dark-500">Longitude:</span>
                            <span className="ml-2 text-eco-dark-200">{result.longitude.toFixed(4)}°</span>
                          </div>
                          {result.area_km2 && (
                            <div className="col-span-2">
                              <span className="text-eco-dark-500">Area:</span>
                              <span className="ml-2 text-eco-dark-200">{result.area_km2} km²</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedLocation && (
                    <div className="pt-4">
                      <button className="w-full bg-eco-green-600 hover:bg-eco-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
                        Continue to Analysis Setup
                        <span className="ml-2">→</span>
                      </button>
                      <p className="text-xs text-eco-dark-500 text-center mt-2">
                        Satellite analysis will be available in Phase 3
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-eco-dark-700">
                    <p className="text-xs text-eco-dark-500">
                      {response.results[0].attribution}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
