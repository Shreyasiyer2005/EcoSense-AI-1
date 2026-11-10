/**
 * Universal Location Search Bar
 * Supports PIN codes, place names, and coordinates
 * Provides geocoding and location resolution
 */

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X, AlertCircle } from 'lucide-react';
import apiService from '../services/api';

interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  bbox?: number[];
  type: string;
  country?: string;
  state?: string;
  importance?: number;
  source: string;
}

interface LocationSearchBarProps {
  onLocationSelect: (location: {
    name: string;
    latitude: number;
    longitude: number;
  }) => void;
  initialValue?: string;
  placeholder?: string;
}

export default function LocationSearchBar({
  onLocationSelect,
  initialValue = '',
  placeholder = 'Search by PIN code, place name, or coordinates...'
}: LocationSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const detectInputType = (input: string): 'pincode' | 'coordinates' | 'place' => {
    const trimmed = input.trim();

    // Check if it's a 6-digit PIN code
    if (/^\d{6}$/.test(trimmed)) {
      return 'pincode';
    }

    // Check if it's coordinates (lat,lon or lat lon)
    const coordPattern = /^-?\d+\.?\d*[,\s]+-?\d+\.?\d*$/;
    if (coordPattern.test(trimmed)) {
      return 'coordinates';
    }

    // Otherwise treat as place name
    return 'place';
  };

  const parseCoordinates = (input: string): { latitude: number; longitude: number } | null => {
    const trimmed = input.trim();
    const parts = trimmed.split(/[,\s]+/);

    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lon = parseFloat(parts[1]);

      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { latitude: lat, longitude: lon };
      }
    }

    return null;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a location to search');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const inputType = detectInputType(searchQuery);
      console.log('[LocationSearch] Input type detected:', inputType, 'Query:', searchQuery);

      let response;

      if (inputType === 'pincode') {
        response = await apiService.resolveLocation('pincode', searchQuery.trim());
      } else if (inputType === 'coordinates') {
        const coords = parseCoordinates(searchQuery);
        if (!coords) {
          throw new Error('Invalid coordinate format. Use: latitude,longitude (e.g., 12.2958,76.6394)');
        }
        response = await apiService.resolveLocation('coordinates', coords);
      } else {
        response = await apiService.resolveLocation('place', searchQuery.trim());
      }

      console.log('[LocationSearch] Response:', response);

      if (response.success && response.results && response.results.length > 0) {
        setResults(response.results);
        setShowResults(true);

        // If only one result, auto-select it
        if (response.results.length === 1) {
          handleLocationSelect(response.results[0]);
        }
      } else {
        setError(response.error || 'No locations found. Try a different search term.');
      }
    } catch (err: any) {
      console.error('[LocationSearch] Error:', err);
      setError(err.message || 'Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (location: LocationResult) => {
    console.log('[LocationSearch] Selected:', location);

    onLocationSelect({
      name: location.name.split(',')[0] || location.name, // Take first part of full name
      latitude: location.latitude,
      longitude: location.longitude
    });

    setSearchQuery(location.name);
    setShowResults(false);
    setError(null);
  };

  const handleClear = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div ref={searchRef} className="relative w-full">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2.5 bg-[#1a2332] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {/* Search Hints */}
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
        <span>Examples:</span>
        <code className="px-1.5 py-0.5 bg-gray-800 rounded">571213</code>
        <code className="px-1.5 py-0.5 bg-gray-800 rounded">Mysuru</code>
        <code className="px-1.5 py-0.5 bg-gray-800 rounded">12.2958,76.6394</code>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a2332] border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 px-3 py-2">
              Found {results.length} location{results.length > 1 ? 's' : ''}
            </div>
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleLocationSelect(result)}
                className="w-full px-3 py-3 text-left hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors truncate">
                      {result.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{result.latitude.toFixed(4)}°N, {result.longitude.toFixed(4)}°E</span>
                      {result.state && <span>• {result.state}</span>}
                      {result.type && <span>• {result.type}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
