/**
 * Land Cover Classification Routes
 * Fetches multi-spectral data and calls ML service for classification
 */

import { Router, Request, Response } from 'express';
import { sentinelHubService } from '../services/sentinelHub';
import axios from 'axios';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * POST /api/v1/landcover/classify
 * Classify land cover for a satellite product
 */
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const { productId, acquisitionDate, bbox, resolution } = req.body;

    // Validate required fields
    if (!productId || !acquisitionDate || !bbox) {
      return res.status(400).json({
        success: false,
        message: 'productId, acquisitionDate, and bbox are required'
      });
    }

    if (!bbox.west || !bbox.south || !bbox.east || !bbox.north) {
      return res.status(400).json({
        success: false,
        message: 'bbox must contain west, south, east, north coordinates'
      });
    }

    console.log(`[Land Cover] Starting classification for product ${productId}`);

    // Fetch multi-spectral bands from Sentinel Hub
    const bandData = await sentinelHubService.processLandCoverBands(
      {
        west: bbox.west,
        south: bbox.south,
        east: bbox.east,
        north: bbox.north,
        crs: bbox.crs || 'EPSG:4326'
      },
      productId,
      acquisitionDate,
      resolution || 20
    );

    console.log(`[Land Cover] Retrieved ${bandData.bands.length} bands`);

    // Extract band arrays by index (order: B02, B03, B04, B08, B11, B12)
    const [blue, green, red, nir, swir1, swir2] = bandData.bands.map(b => b.data);

    // Prepare request for ML service
    const mlRequest = {
      blue,
      green,
      red,
      nir,
      swir1,
      swir2,
      bbox: {
        west: bbox.west,
        south: bbox.south,
        east: bbox.east,
        north: bbox.north
      },
      resolution: resolution || 20
    };

    // Call ML service (note: route is registered with /api/v1 prefix in main.py)
    console.log('[Land Cover] Calling ML service for classification...');
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/api/v1/land-cover/classify`,
      mlRequest,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 second timeout
      }
    );

    if (!mlResponse.data.success) {
      throw new Error('ML service classification failed');
    }

    console.log('[Land Cover] Classification complete');
    console.log('[Land Cover] Statistics:', mlResponse.data.statistics);

    return res.json({
      success: true,
      productId,
      acquisitionDate,
      classification: mlResponse.data.classification,
      statistics: mlResponse.data.statistics,
      classes: mlResponse.data.classes,
      metadata: {
        bbox,
        dimensions: {
          width: bandData.bands[0].data[0].length,
          height: bandData.bands[0].data.length
        },
        method: 'rule-based spectral classification',
        note: mlResponse.data.message
      }
    });

  } catch (error: any) {
    console.error('[Land Cover] Classification error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Land cover classification failed',
      error: error.message
    });
  }
});

export default router;
