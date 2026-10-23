import axios, { AxiosError } from 'axios';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'EcoSenseAI/1.0 (Academic Project)';
const REQUEST_DELAY_MS = 1000; // Nominatim requires 1 request per second

// Simple in-memory cache
const geocodeCache = new Map<string, any>();
let lastRequestTime = 0;

interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: {
    postcode?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  bbox?: [number, number, number, number]; // [minLat, maxLat, minLon, maxLon]
  type: string;
  country?: string;
  state?: string;
  importance?: number;
  source: 'nominatim' | 'coordinates' | 'pin_fallback';
  attribution: string;
}

/**
 * Enforce rate limiting for Nominatim API
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Geocode a place name using Nominatim
 */
export async function geocodePlaceName(placeName: string, countryCode: string = 'IN'): Promise<GeocodeResult[]> {
  const cacheKey = `place:${placeName}:${countryCode}`;
  
  if (geocodeCache.has(cacheKey)) {
    console.log(`[Geocoding] Cache hit for: ${placeName}`);
    return geocodeCache.get(cacheKey);
  }

  await enforceRateLimit();

  try {
    const response = await axios.get<NominatimResult[]>(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: placeName,
        countrycodes: countryCode.toLowerCase(),
        format: 'json',
        addressdetails: 1,
        limit: 5
      },
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    const results: GeocodeResult[] = response.data.map((result: NominatimResult) => ({
      name: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      bbox: result.boundingbox ? [
        parseFloat(result.boundingbox[0]),
        parseFloat(result.boundingbox[1]),
        parseFloat(result.boundingbox[2]),
        parseFloat(result.boundingbox[3])
      ] : undefined,
      type: result.type,
      country: result.address?.country,
      state: result.address?.state,
      importance: result.importance,
      source: 'nominatim',
      attribution: '© OpenStreetMap contributors'
    }));

    geocodeCache.set(cacheKey, results);
    return results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`Geocoding service error: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Reverse geocode coordinates to get location name
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  const cacheKey = `reverse:${latitude}:${longitude}`;
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  await enforceRateLimit();

  try {
    const response = await axios.get<NominatimResult>(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });

    if (!response.data) {
      return null;
    }

    const result: GeocodeResult = {
      name: response.data.display_name,
      latitude: parseFloat(response.data.lat),
      longitude: parseFloat(response.data.lon),
      bbox: response.data.boundingbox ? [
        parseFloat(response.data.boundingbox[0]),
        parseFloat(response.data.boundingbox[1]),
        parseFloat(response.data.boundingbox[2]),
        parseFloat(response.data.boundingbox[3])
      ] : undefined,
      type: response.data.type,
      country: response.data.address?.country,
      state: response.data.address?.state,
      importance: response.data.importance,
      source: 'nominatim',
      attribution: '© OpenStreetMap contributors'
    };

    geocodeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[Reverse Geocoding] Error:', error);
    return null;
  }
}

/**
 * Resolve Indian PIN code
 * Strategy: Try Nominatim first, then provide centroid with bounded area
 */
export async function resolvePinCode(pinCode: string, countryCode: string = 'IN'): Promise<GeocodeResult[]> {
  const cacheKey = `pin:${pinCode}:${countryCode}`;
  
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // Validate Indian PIN code format (6 digits)
  if (countryCode === 'IN' && !/^\d{6}$/.test(pinCode)) {
    throw new Error('Invalid Indian PIN code format. Expected 6 digits.');
  }

  await enforceRateLimit();

  try {
    // Try Nominatim with postal code query
    const response = await axios.get<NominatimResult[]>(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        postalcode: pinCode,
        countrycodes: countryCode.toLowerCase(),
        format: 'json',
        addressdetails: 1,
        limit: 5
      },
      headers: {
        'User-Agent': USER_AGENT
      },
      timeout: 10000
    });

    if (response.data && response.data.length > 0) {
      const results: GeocodeResult[] = response.data.map((result: NominatimResult) => ({
        name: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        bbox: result.boundingbox ? [
          parseFloat(result.boundingbox[0]),
          parseFloat(result.boundingbox[1]),
          parseFloat(result.boundingbox[2]),
          parseFloat(result.boundingbox[3])
        ] : undefined,
        type: result.type,
        country: result.address?.country,
        state: result.address?.state,
        importance: result.importance,
        source: 'nominatim',
        attribution: '© OpenStreetMap contributors'
      }));

      geocodeCache.set(cacheKey, results);
      return results;
    }

    // If Nominatim doesn't return results, indicate PIN code needs manual verification
    throw new Error(`PIN code ${pinCode} not found in geocoding database. Please verify the code or use place name/coordinates.`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
    }
    throw error;
  }
}

/**
 * Validate coordinates are within valid ranges
 */
export function validateCoordinates(latitude: number, longitude: number): { valid: boolean; error?: string } {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { valid: false, error: 'Latitude and longitude must be numbers' };
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Invalid coordinate values' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }

  return { valid: true };
}

/**
 * Validate and parse GeoJSON polygon
 */
export function validatePolygon(geojson: any): { valid: boolean; error?: string; area?: number } {
  try {
    if (!geojson || typeof geojson !== 'object') {
      return { valid: false, error: 'Invalid GeoJSON format' };
    }

    if (geojson.type !== 'Polygon' && geojson.type !== 'Feature') {
      return { valid: false, error: 'GeoJSON must be a Polygon or Feature with Polygon geometry' };
    }

    const coordinates = geojson.type === 'Feature' 
      ? geojson.geometry?.coordinates 
      : geojson.coordinates;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
      return { valid: false, error: 'Invalid polygon coordinates' };
    }

    const ring = coordinates[0];
    if (!Array.isArray(ring) || ring.length < 4) {
      return { valid: false, error: 'Polygon must have at least 4 coordinates (closed ring)' };
    }

    // Check if polygon is closed
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return { valid: false, error: 'Polygon must be closed (first and last coordinates must match)' };
    }

    // Validate all coordinates
    for (const coord of ring) {
      if (!Array.isArray(coord) || coord.length < 2) {
        return { valid: false, error: 'Invalid coordinate format' };
      }
      const [lon, lat] = coord;
      const validation = validateCoordinates(lat, lon);
      if (!validation.valid) {
        return { valid: false, error: `Invalid coordinate: ${validation.error}` };
      }
    }

    // Calculate approximate area (simple bounding box for now)
    const lats = ring.map((c: number[]) => c[1]);
    const lons = ring.map((c: number[]) => c[0]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lonRange = Math.max(...lons) - Math.min(...lons);
    const approximateArea = latRange * lonRange * 111 * 111; // Very rough km² estimate

    // Enforce maximum area limit (1000 km²)
    if (approximateArea > 1000) {
      return { valid: false, error: 'Polygon area exceeds maximum allowed size (1000 km²)' };
    }

    return { valid: true, area: approximateArea };
  } catch (error) {
    return { valid: false, error: `Polygon validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Clear geocoding cache (useful for testing)
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  console.log('[Geocoding] Cache cleared');
}
