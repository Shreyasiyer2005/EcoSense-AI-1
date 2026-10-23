import { Router, Request, Response } from 'express';
import {
  geocodePlaceName,
  reverseGeocode,
  resolvePinCode,
  validateCoordinates,
  validatePolygon
} from '../services/geocoding';

const router = Router();

interface LocationRequest {
  type: 'pincode' | 'place' | 'coordinates' | 'polygon';
  value: string | { latitude: number; longitude: number } | any;
  country?: string;
}

/**
 * POST /api/v1/locations/resolve
 * Resolve a location input to geographic coordinates and boundaries
 */
router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { type, value, country = 'IN' }: LocationRequest = req.body;

    if (!type || !value) {
      return res.status(400).json({
        error: 'Missing required fields: type and value'
      });
    }

    switch (type) {
      case 'place': {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return res.status(400).json({
            error: 'Place name must be a non-empty string'
          });
        }

        const results = await geocodePlaceName(value.trim(), country);

        if (results.length === 0) {
          return res.status(404).json({
            error: `No results found for "${value}"`,
            suggestion: 'Try a different spelling or more specific location'
          });
        }

        return res.json({
          success: true,
          type: 'place',
          inputValue: value,
          results: results.map((r, idx) => ({
            id: idx,
            name: r.name,
            latitude: r.latitude,
            longitude: r.longitude,
            bbox: r.bbox,
            type: r.type,
            country: r.country,
            state: r.state,
            importance: r.importance,
            source: r.source,
            attribution: r.attribution
          })),
          message: results.length > 1 
            ? 'Multiple locations found. Please select one.'
            : 'Location resolved successfully'
        });
      }

      case 'coordinates': {
        if (typeof value !== 'object' || !value.latitude || !value.longitude) {
          return res.status(400).json({
            error: 'Coordinates must include latitude and longitude'
          });
        }

        const { latitude, longitude } = value;
        const validation = validateCoordinates(latitude, longitude);

        if (!validation.valid) {
          return res.status(400).json({
            error: validation.error
          });
        }

        // Reverse geocode to get location name
        const locationInfo = await reverseGeocode(latitude, longitude);

        return res.json({
          success: true,
          type: 'coordinates',
          inputValue: { latitude, longitude },
          results: [{
            id: 0,
            name: locationInfo?.name || `Location at ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E`,
            latitude,
            longitude,
            bbox: locationInfo?.bbox,
            type: locationInfo?.type || 'point',
            country: locationInfo?.country,
            state: locationInfo?.state,
            source: 'coordinates',
            attribution: locationInfo?.attribution || '© OpenStreetMap contributors'
          }],
          message: 'Coordinates validated successfully'
        });
      }

      case 'pincode': {
        if (typeof value !== 'string' || value.trim().length === 0) {
          return res.status(400).json({
            error: 'PIN code must be a non-empty string'
          });
        }

        try {
          const results = await resolvePinCode(value.trim(), country);

          if (results.length === 0) {
            return res.status(404).json({
              error: `PIN code ${value} not found`,
              suggestion: 'Verify the PIN code or try using place name or coordinates'
            });
          }

          return res.json({
            success: true,
            type: 'pincode',
            inputValue: value,
            results: results.map((r, idx) => ({
              id: idx,
              name: r.name,
              latitude: r.latitude,
              longitude: r.longitude,
              bbox: r.bbox,
              type: r.type,
              country: r.country,
              state: r.state,
              source: r.source,
              attribution: r.attribution
            })),
            message: results.length > 1
              ? 'Multiple areas found for this PIN code. Please select one.'
              : 'PIN code resolved successfully',
            note: 'PIN code coverage may be limited in geocoding databases'
          });
        } catch (error) {
          return res.status(404).json({
            error: error instanceof Error ? error.message : 'PIN code resolution failed',
            suggestion: 'Try using the place name or coordinates instead'
          });
        }
      }

      case 'polygon': {
        if (typeof value !== 'object') {
          return res.status(400).json({
            error: 'Polygon must be a valid GeoJSON object'
          });
        }

        const validation = validatePolygon(value);

        if (!validation.valid) {
          return res.status(400).json({
            error: validation.error,
            suggestion: 'Ensure polygon is valid GeoJSON with closed coordinates'
          });
        }

        // Extract centroid for display
        const coordinates = value.type === 'Feature' 
          ? value.geometry.coordinates 
          : value.coordinates;
        
        const ring = coordinates[0];
        const lats = ring.map((c: number[]) => c[1]);
        const lons = ring.map((c: number[]) => c[0]);
        const centroidLat = (Math.max(...lats) + Math.min(...lats)) / 2;
        const centroidLon = (Math.max(...lons) + Math.min(...lons)) / 2;

        // Try to get name for centroid
        const locationInfo = await reverseGeocode(centroidLat, centroidLon);

        return res.json({
          success: true,
          type: 'polygon',
          inputValue: value,
          results: [{
            id: 0,
            name: locationInfo?.name || `Custom polygon area`,
            latitude: centroidLat,
            longitude: centroidLon,
            bbox: [
              Math.min(...lats),
              Math.max(...lats),
              Math.min(...lons),
              Math.max(...lons)
            ],
            type: 'polygon',
            area_km2: validation.area?.toFixed(2),
            country: locationInfo?.country,
            state: locationInfo?.state,
            source: 'polygon',
            attribution: '© OpenStreetMap contributors'
          }],
          message: 'Polygon validated successfully'
        });
      }

      default:
        return res.status(400).json({
          error: `Invalid location type: ${type}`,
          validTypes: ['pincode', 'place', 'coordinates', 'polygon']
        });
    }
  } catch (error) {
    console.error('[Location Resolution] Error:', error);
    
    return res.status(500).json({
      error: 'Location resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Please try again or contact support if the problem persists'
    });
  }
});

/**
 * GET /api/v1/locations/validate/coordinates
 * Validate coordinates without full resolution
 */
router.get('/validate/coordinates', (req: Request, res: Response) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({
      error: 'Missing required parameters: lat and lon'
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  const validation = validateCoordinates(latitude, longitude);

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.error
    });
  }

  return res.json({
    valid: true,
    latitude,
    longitude,
    message: 'Coordinates are valid'
  });
});

/**
 * GET /api/v1/locations/suggestions
 * Get location suggestions for autocomplete (future enhancement)
 */
router.get('/suggestions', async (req: Request, res: Response) => {
  const { q, country = 'IN' } = req.query;

  if (!q || typeof q !== 'string' || q.length < 3) {
    return res.status(400).json({
      error: 'Query parameter "q" must be at least 3 characters'
    });
  }

  try {
    const results = await geocodePlaceName(q, country as string);
    
    return res.json({
      success: true,
      query: q,
      suggestions: results.slice(0, 5).map(r => ({
        name: r.name,
        type: r.type,
        state: r.state,
        country: r.country
      }))
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to fetch suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
