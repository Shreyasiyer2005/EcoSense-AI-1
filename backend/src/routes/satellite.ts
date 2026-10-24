/**
 * Satellite Data API Routes
 * Phase 3: Real Sentinel-2 satellite data integration
 */

import express from 'express';
import { satelliteService } from '../services/satellite';

const router = express.Router();

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
