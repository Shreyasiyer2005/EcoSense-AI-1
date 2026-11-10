/**
 * Satellite Data API Routes
 * Phase 3: Real Sentinel-2 satellite data integration
 */

import express from 'express';
import { satelliteService } from '../services/satellite';
import { sentinelHubService } from '../services/sentinelHub';

const router = express.Router();

// Add OPTIONS handler for CORS preflight requests
router.options('/rgb-image', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

router.options('/image/:productId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).end();
});

/**
 * GET /api/v1/satellite/status
 * Check if satellite service is configured and operational
 */
router.get('/status', async (req, res) => {
  try {
    const configured = satelliteService.isConfigured();

    res.json({
      success: true,
      configured,
      message: configured
        ? 'Copernicus Data Space credentials configured'
        : 'Copernicus credentials not configured. Set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET',
      provider: 'Copernicus Data Space Ecosystem',
      dataSource: 'Sentinel-2 Level-2A',
      freeAccess: true
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      configured: false,
      message: 'Failed to check satellite service status',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/satellite/search
 * Search for Sentinel-2 products for a given location and date range
 *
 * Body:
 * {
 *   latitude: number,
 *   longitude: number,
 *   startDate?: string (ISO format),
 *   endDate?: string (ISO format),
 *   maxCloudCover?: number (0-100),
 *   limit?: number (max results)
 * }
 */
router.post('/search', async (req, res) => {
  try {
    const { latitude, longitude, startDate, endDate, maxCloudCover, limit } = req.body;

    // Validation
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required'
      });
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Default to last 90 days if no date range specified
    const end = endDate || new Date().toISOString();
    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const searchOptions = {
      coordinates: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      startDate: start,
      endDate: end,
      maxCloudCover: maxCloudCover !== undefined ? parseInt(maxCloudCover) : undefined,
      limit: limit ? parseInt(limit) : 20
    };

    console.log('[Satellite API] Search request:', searchOptions);

    const result = await satelliteService.searchProducts(searchOptions);

    // Extract simplified metadata for frontend
    const products = result.products.map(p => satelliteService.extractMetadata(p));

    res.json({
      success: result.success,
      products,
      count: result.count,
      message: result.message,
      searchCriteria: {
        location: `${latitude}°N, ${longitude}°E`,
        dateRange: `${start.substring(0, 10)} to ${end.substring(0, 10)}`,
        maxCloudCover: searchOptions.maxCloudCover || 'Any',
        limit: searchOptions.limit
      },
      note: result.success && result.count > 0
        ? 'Real Sentinel-2 L2A products from Copernicus Data Space Ecosystem'
        : undefined
    });

  } catch (error: any) {
    console.error('[Satellite API] Search error:', error);
    res.status(500).json({
      success: false,
      products: [],
      count: 0,
      message: 'Failed to search satellite products',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/satellite/product/:id
 * Get detailed information about a specific product
 */
router.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await satelliteService.getProduct(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const metadata = satelliteService.extractMetadata(product);

    res.json({
      success: true,
      product: metadata,
      raw: product // Include full product data for debugging
    });

  } catch (error: any) {
    console.error('[Satellite API] Product fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

export default router;

/**
 * GET /api/v1/satellite/rgb-image
 * Get true-color RGB satellite image for comparison
 * Query params: productId, date, west, south, east, north, width, height
 */
router.get('/rgb-image', async (req, res) => {
  try {
    const { productId, date, west, south, east, north, width, height } = req.query;

    // Validation
    if (!productId || !date || !west || !south || !east || !north) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: productId, date, west, south, east, north'
      });
    }

    const bbox = {
      west: parseFloat(west as string),
      south: parseFloat(south as string),
      east: parseFloat(east as string),
      north: parseFloat(north as string),
      crs: 'EPSG:4326'
    };

    // Use explicit dimensions if provided, otherwise let sentinelHub calculate from 10m resolution
    const imageWidth = width ? parseInt(width as string) : undefined;
    const imageHeight = height ? parseInt(height as string) : undefined;

    console.log('[Satellite RGB] Fetching image:', {
      productId,
      date,
      bbox,
      dimensions: `${imageWidth}x${imageHeight}`
    });

    // Get true-color image from Sentinel Hub
    const imageBuffer = await sentinelHubService.getTrueColorImage({
      bbox,
      productId: productId as string,
      acquisitionDate: date as string,
      width: imageWidth,
      height: imageHeight
    });

    // Set CORS headers explicitly for image responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Acquisition-Date', date as string);
    res.setHeader('X-Product-Id', productId as string);
    res.send(imageBuffer);

  } catch (error: any) {
    console.error('[Satellite RGB] Image fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RGB satellite image',
      error: error.message
    });
  }
});


/**
 * GET /api/v1/satellite/image/:productId
 * Get true-color satellite image as PNG
 */
router.get('/image/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { bbox } = req.query;

    if (!bbox) {
      return res.status(400).json({
        success: false,
        message: 'bbox query parameter required (format: west,south,east,north)'
      });
    }

    // Parse bbox
    const bboxParts = (bbox as string).split(',').map(parseFloat);
    if (bboxParts.length !== 4 || bboxParts.some(isNaN)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bbox format. Expected: west,south,east,north'
      });
    }

    const [west, south, east, north] = bboxParts;

    // Fetch product details to get the actual product name and acquisition date
    const product = await satelliteService.getProduct(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Extract acquisition date from product
    const acquisitionDate = product.ContentDate.Start.split('T')[0]; // Get YYYY-MM-DD

    console.log('[Satellite Image] Fetching image for:', {
      productId,
      productName: product.Name,
      acquisitionDate,
      bbox: [west, south, east, north]
    });

    // Get true-color image from Sentinel Hub
    const imageBuffer = await sentinelHubService.getTrueColorImage({
      bbox: { west, south, east, north, crs: 'EPSG:4326' },
      productId,
      acquisitionDate,
      width: 512,
      height: 512
    });

    // Set CORS headers explicitly for image responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.setHeader('X-Acquisition-Date', acquisitionDate);
    res.setHeader('X-Product-Id', productId);
    res.send(imageBuffer);

  } catch (error: any) {
    console.error('[Satellite] Image fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch satellite image',
      error: error.message
    });
  }
});
