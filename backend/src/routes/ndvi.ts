/**
 * NDVI Analysis API Routes
 * Phase 4: Sentinel-2 imagery processing and NDVI calculation
 * Phase 8D.4: GeoTIFF export integration
 */

import express from 'express';
import { sentinelHubService } from '../services/sentinelHub';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const router = express.Router();

// Directory for storing generated GeoTIFF overlays
const OVERLAY_DIR = path.join(process.cwd(), 'overlays');

// Ensure overlay directory exists
(async () => {
  try {
    await fs.mkdir(OVERLAY_DIR, { recursive: true });
    console.log(`[NDVI] Overlay directory ready: ${OVERLAY_DIR}`);
  } catch (error) {
    console.error('[NDVI] Failed to create overlay directory:', error);
  }
})();

// Store for analysis jobs (in-memory for now, should use database in production)
interface AnalysisJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  productId: string;
  acquisitionDate: string;
  bbox: any;
  locationName?: string;
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  overlayPath?: string;  // Phase 8D.4: Path to generated GeoTIFF overlay
  overlayPngPath?: string;  // Phase 8D.5: Path to PNG overlay for CesiumJS
  overlayBounds?: {  // Phase 8D.5: Geographic bounds for overlay positioning
    west: number;
    south: number;
    east: number;
    north: number;
    crs: string;
  };
}

const analysisJobs = new Map<string, AnalysisJob>();

/**
 * POST /api/v1/ndvi/analyze
 * Request NDVI analysis for a Sentinel-2 observation
 *
 * Body:
 * {
 *   productId: string,
 *   acquisitionDate: string (ISO date),
 *   bbox: { west, south, east, north },
 *   locationName?: string
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { productId, acquisitionDate, bbox, locationName } = req.body;

    // Validation
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

    // Generate analysis ID (avoiding ambiguous characters: 0,O,I,l,1)
    const generateSafeId = () => {
      const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // No 0,1,i,l,o
      let id = '';
      for (let i = 0; i < 9; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return id;
    };
    const analysisId = `ndvi_${Date.now()}_${generateSafeId()}`;

    // Create analysis job
    const job: AnalysisJob = {
      id: analysisId,
      status: 'pending',
      productId,
      acquisitionDate,
      bbox: { ...bbox, crs: 'EPSG:4326' },
      locationName,
      createdAt: new Date()
    };

    analysisJobs.set(analysisId, job);

    console.log(`[NDVI] Analysis ${analysisId} created for product ${productId}`);

    // Start processing asynchronously
    processNDVI(analysisId).catch(error => {
      console.error(`[NDVI] Analysis ${analysisId} failed:`, error);
      const job = analysisJobs.get(analysisId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
      }
    });

    res.json({
      success: true,
      analysisId,
      status: 'pending',
      message: 'NDVI analysis started'
    });

  } catch (error: any) {
    console.error('[NDVI] Analysis request failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start NDVI analysis',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ndvi/status/:analysisId
 * Check analysis status
 */
router.get('/status/:analysisId', (req, res) => {
  try {
    const { analysisId } = req.params;
    const job = analysisJobs.get(analysisId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    res.json({
      success: true,
      analysisId: job.id,
      status: job.status,
      productId: job.productId,
      acquisitionDate: job.acquisitionDate,
      locationName: job.locationName,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error
    });

  } catch (error: any) {
    console.error('[NDVI] Status check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check analysis status',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ndvi/result/:analysisId
 * Get analysis result
 */
router.get('/result/:analysisId', (req, res) => {
  try {
    const { analysisId } = req.params;
    const job = analysisJobs.get(analysisId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Analysis is ${job.status}`,
        status: job.status,
        error: job.error
      });
    }

    res.json({
      success: true,
      analysisId: job.id,
      result: job.result,
      metadata: {
        productId: job.productId,
        acquisitionDate: job.acquisitionDate,
        locationName: job.locationName,
        processedAt: job.completedAt
      }
    });

  } catch (error: any) {
    console.error('[NDVI] Result retrieval failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis result',
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/ndvi/:analysisId
 * Delete analysis and cleanup resources
 */
router.delete('/:analysisId', (req, res) => {
  try {
    const { analysisId } = req.params;
    const deleted = analysisJobs.delete(analysisId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    console.log(`[NDVI] Analysis ${analysisId} deleted`);

    res.json({
      success: true,
      message: 'Analysis deleted'
    });

  } catch (error: any) {
    console.error('[NDVI] Deletion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete analysis',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/ndvi/compare
 * Request historical NDVI comparison between two observations
 *
 * Body:
 * {
 *   earlierProductId: string,
 *   earlierAcquisitionDate: string (ISO date),
 *   laterProductId: string,
 *   laterAcquisitionDate: string (ISO date),
 *   bbox: { west, south, east, north },
 *   locationName?: string,
 *   resolution?: number (meters, default 10)
 * }
 */
router.post('/compare', async (req, res) => {
  try {
    const {
      earlierProductId,
      earlierAcquisitionDate,
      laterProductId,
      laterAcquisitionDate,
      bbox,
      locationName,
      resolution
    } = req.body;

    // Validation
    if (!earlierProductId || !earlierAcquisitionDate || !laterProductId || !laterAcquisitionDate || !bbox) {
      return res.status(400).json({
        success: false,
        message: 'earlierProductId, earlierAcquisitionDate, laterProductId, laterAcquisitionDate, and bbox are required'
      });
    }

    if (!bbox.west || !bbox.south || !bbox.east || !bbox.north) {
      return res.status(400).json({
        success: false,
        message: 'bbox must contain west, south, east, north coordinates'
      });
    }

    // Validate date order
    const earlierDate = new Date(earlierAcquisitionDate);
    const laterDate = new Date(laterAcquisitionDate);

    if (earlierDate >= laterDate) {
      return res.status(400).json({
        success: false,
        message: 'earlierAcquisitionDate must be before laterAcquisitionDate'
      });
    }

    // Generate comparison ID (avoiding ambiguous characters: 0,O,I,l,1)
    // Use only: 2-9, a-z (excluding i,l,o)
    const generateSafeId = () => {
      const chars = '23456789abcdefghjkmnpqrstuvwxyz'; // No 0,1,i,l,o
      let id = '';
      for (let i = 0; i < 9; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return id;
    };
    const comparisonId = `ndvi_compare_${Date.now()}_${generateSafeId()}`;

    // Create comparison job
    const job: AnalysisJob = {
      id: comparisonId,
      status: 'pending',
      productId: `${earlierProductId}_vs_${laterProductId}`,
      acquisitionDate: `${earlierAcquisitionDate}_to_${laterAcquisitionDate}`,
      bbox: { ...bbox, crs: 'EPSG:4326' },
      locationName,
      createdAt: new Date()
    };

    analysisJobs.set(comparisonId, job);

    console.log(`[NDVI Compare] Comparison ${comparisonId} created`);

    // Start processing asynchronously
    processNDVIComparison(comparisonId, {
      earlierProductId,
      earlierAcquisitionDate,
      laterProductId,
      laterAcquisitionDate,
      bbox: { ...bbox, crs: 'EPSG:4326' },
      resolution: resolution || 10
    }).catch(error => {
      console.error(`[NDVI Compare] Comparison ${comparisonId} failed:`, error);
      const job = analysisJobs.get(comparisonId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
      }
    });

    res.json({
      success: true,
      comparisonId,
      status: 'pending',
      message: 'Historical NDVI comparison started'
    });

  } catch (error: any) {
    console.error('[NDVI Compare] Comparison request failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start historical comparison',
      error: error.message
    });
  }
});

/**
 * Process NDVI analysis
 */
async function processNDVI(analysisId: string): Promise<void> {
  const job = analysisJobs.get(analysisId);
  if (!job) throw new Error('Job not found');

  try {
    job.status = 'processing';
    console.log(`[NDVI] Processing analysis ${analysisId}`);

    // Step 1: Fetch band data from Sentinel Hub
    console.log(`[NDVI] Fetching bands for product ${job.productId}`);

    // Try with SCL first, fall back to without SCL if it fails
    let bandResult;
    try {
      bandResult = await sentinelHubService.processNDVIBands(
        job.bbox,
        job.productId,
        job.acquisitionDate,
        undefined,
        true // include SCL
      );
    } catch (error: any) {
      console.log(`[NDVI] Failed to fetch with SCL: ${error.message}`);
      console.log(`[NDVI] Retrying without SCL band`);

      bandResult = await sentinelHubService.processNDVIBands(
        job.bbox,
        job.productId,
        job.acquisitionDate,
        undefined,
        false // no SCL
      );
    }

    if (!bandResult.success) {
      throw new Error('Failed to fetch band data');
    }

    // Step 2: Extract Red (B04) and NIR (B08) bands
    const redBand = bandResult.bands.find(b => b.band === 'B04');
    const nirBand = bandResult.bands.find(b => b.band === 'B08');
    const sclBand = bandResult.bands.find(b => b.band === 'SCL');

    if (!redBand || !nirBand) {
      throw new Error('Red or NIR band not found in response');
    }

    console.log(`[NDVI] Bands fetched: ${redBand.width}x${redBand.height} pixels`);

    // Step 3: Send to Python ML service for NDVI calculation
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

    console.log(`[NDVI] Calculating NDVI via ML service`);
    const ndviResponse = await axios.post(`${mlServiceUrl}/ndvi/calculate`, {
      red_band: redBand.data,
      nir_band: nirBand.data,
      scl_mask: sclBand?.data,
      red_nodata: redBand.nodata,
      nir_nodata: nirBand.nodata,
      scale_input: true
    }, {
      timeout: 60000 // 1 minute timeout
    });

    const ndviResult = ndviResponse.data;

    // Step 4: Store result
    job.result = {
      statistics: ndviResult.statistics,
      metadata: {
        ...ndviResult.metadata,
        productId: job.productId,
        acquisitionDate: job.acquisitionDate,
        bbox: job.bbox,
        dimensions: {
          width: redBand.width,
          height: redBand.height
        },
        resolution: bandResult.metadata.resolution
      },
      interpretation: ndviResult.interpretation,
      vegetation_categories: ndviResult.vegetation_categories,
      environmental_analysis: ndviResult.environmental_analysis
    };

    job.status = 'completed';
    job.completedAt = new Date();

    console.log(`[NDVI] Analysis ${analysisId} completed successfully`);
    console.log(`[NDVI] Statistics:`, job.result.statistics);

  } catch (error: any) {
    console.error(`[NDVI] Processing failed for ${analysisId}:`, error.message);
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    throw error;
  }
}

/**
 * Process historical NDVI comparison
 */
async function processNDVIComparison(
  comparisonId: string,
  params: {
    earlierProductId: string;
    earlierAcquisitionDate: string;
    laterProductId: string;
    laterAcquisitionDate: string;
    bbox: any;
    resolution: number;
  }
): Promise<void> {
  const job = analysisJobs.get(comparisonId);
  if (!job) throw new Error('Job not found');

  // Performance timing
  const timings: Record<string, number> = {};
  const startTime = Date.now();

  try {
    job.status = 'processing';
    console.log(`[NDVI Compare] ========================================`);
    console.log(`[NDVI Compare] Processing comparison ${comparisonId}`);
    console.log(`[NDVI Compare] START TIME: ${new Date().toISOString()}`);
    console.log(`[NDVI Compare] ========================================`);

    // Step 1: Fetch band data for BOTH dates in PARALLEL
    console.log(`[NDVI Compare] Fetching earlier and later bands in parallel...`);
    const parallelStartTime = Date.now();

    const [earlierBandResult, laterBandResult] = await Promise.all([
      (async () => {
        try {
          return await sentinelHubService.processNDVIBands(
            params.bbox,
            params.earlierProductId,
            params.earlierAcquisitionDate,
            params.resolution,
            true
          );
        } catch (error: any) {
          console.log(`[NDVI Compare] Retrying earlier without SCL`);
          return await sentinelHubService.processNDVIBands(
            params.bbox,
            params.earlierProductId,
            params.earlierAcquisitionDate,
            params.resolution,
            false
          );
        }
      })(),
      (async () => {
        try {
          return await sentinelHubService.processBands({
            bbox: params.bbox,
            productId: params.laterProductId,
            acquisitionDate: params.laterAcquisitionDate,
            bands: ['B04', 'B08', 'SCL'],
            width: undefined,
            height: undefined
          });
        } catch (error: any) {
          console.log(`[NDVI Compare] Retrying later without SCL`);
          return await sentinelHubService.processBands({
            bbox: params.bbox,
            productId: params.laterProductId,
            acquisitionDate: params.laterAcquisitionDate,
            bands: ['B04', 'B08'],
            width: undefined,
            height: undefined
          });
        }
      })()
    ]);

    timings.parallelBandFetch = Date.now() - parallelStartTime;
    console.log(`[NDVI Compare] ⏱️  Parallel band fetch: ${timings.parallelBandFetch}ms`);

    if (!earlierBandResult.success || !laterBandResult.success) {
      throw new Error('Failed to fetch band data');
    }

    // Step 2: Ensure same dimensions for later date
    const width = earlierBandResult.metadata.width;
    const height = earlierBandResult.metadata.height;

    // If dimensions don't match, refetch later with correct dimensions
    if (laterBandResult.metadata.width !== width || laterBandResult.metadata.height !== height) {
      console.log(`[NDVI Compare] Dimension mismatch, refetching later bands with correct size`);
      const refetchStart = Date.now();

      try {
        const laterRefetch = await sentinelHubService.processBands({
          bbox: params.bbox,
          productId: params.laterProductId,
          acquisitionDate: params.laterAcquisitionDate,
          bands: ['B04', 'B08', 'SCL'],
          width,
          height
        });
        Object.assign(laterBandResult, laterRefetch);
      } catch (error: any) {
        console.log(`[NDVI Compare] Retry without SCL`);
        const laterRefetch = await sentinelHubService.processBands({
          bbox: params.bbox,
          productId: params.laterProductId,
          acquisitionDate: params.laterAcquisitionDate,
          bands: ['B04', 'B08'],
          width,
          height
        });
        Object.assign(laterBandResult, laterRefetch);
      }

      timings.laterRefetch = Date.now() - refetchStart;
      console.log(`[NDVI Compare] ⏱️  Later refetch: ${timings.laterRefetch}ms`);
    }

    // Extract bands
    const earlierRed = earlierBandResult.bands.find(b => b.band === 'B04');
    const earlierNir = earlierBandResult.bands.find(b => b.band === 'B08');
    const earlierScl = earlierBandResult.bands.find(b => b.band === 'SCL');

    const laterRed = laterBandResult.bands.find(b => b.band === 'B04');
    const laterNir = laterBandResult.bands.find(b => b.band === 'B08');
    const laterScl = laterBandResult.bands.find(b => b.band === 'SCL');

    if (!earlierRed || !earlierNir || !laterRed || !laterNir) {
      throw new Error('Required bands not found in response');
    }

    console.log(`[NDVI Compare] Bands fetched: ${width}x${height} pixels for both dates`);

    // Step 3: Send to ML service for comparison
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

    console.log(`[NDVI Compare] Computing comparison via ML service...`);
    const mlStartTime = Date.now();

    const compareResponse = await axios.post(`${mlServiceUrl}/ndvi/compare`, {
      earlier_red_band: earlierRed.data,
      earlier_nir_band: earlierNir.data,
      later_red_band: laterRed.data,
      later_nir_band: laterNir.data,
      earlier_scl_mask: earlierScl?.data,
      later_scl_mask: laterScl?.data,
      earlier_date: params.earlierAcquisitionDate,
      later_date: params.laterAcquisitionDate,
      red_nodata: earlierRed.nodata,
      nir_nodata: earlierNir.nodata,
      scale_input: true,
      preserve_arrays: true,
      bbox: earlierRed.bounds,
      spatial_resolution: earlierBandResult.metadata.resolution,
      earlier_crs: earlierRed.crs,
      later_crs: laterRed.crs
    }, {
      timeout: 120000
    });

    timings.mlProcessing = Date.now() - mlStartTime;
    console.log(`[NDVI Compare] ⏱️  ML processing: ${timings.mlProcessing}ms`);

    const compareResult = compareResponse.data;

    // Step 4: Generate overlays if data is available
    let overlayPath: string | undefined;
    let overlayPngPath: string | undefined;
    let overlayBounds: any;

    if (compareResult.spatial_metadata?.validated &&
        compareResult.comparison?.pixel_arrays?.classified_array) {

      const overlayStartTime = Date.now();

      try {
        console.log(`[NDVI Compare] Generating overlays...`);

        const overlayFilename = `${comparisonId}_ndvi_change.tif`;
        const pngFilename = `${comparisonId}_ndvi_change.png`;
        const overlayFullPath = path.join(OVERLAY_DIR, overlayFilename);

        // Generate GeoTIFF
        const exportResponse = await axios.post(`${mlServiceUrl}/ndvi/export-geotiff`, {
          classified_array: compareResult.comparison.pixel_arrays.classified_array,
          spatial_metadata: compareResult.spatial_metadata,
          output_filename: overlayFilename,
          compression: 'DEFLATE'
        }, {
          timeout: 60000,
          responseType: 'arraybuffer'
        });

        await fs.writeFile(overlayFullPath, Buffer.from(exportResponse.data));
        overlayPath = overlayFilename;

        // Generate PNG
        try {
          const pngFullPath = path.join(OVERLAY_DIR, pngFilename);
          const pngResponse = await axios.post(`${mlServiceUrl}/ndvi/convert-to-png`, {
            geotiff_path: overlayFullPath,
            output_filename: pngFilename
          }, {
            timeout: 30000,
            responseType: 'arraybuffer'
          });

          await fs.writeFile(pngFullPath, Buffer.from(pngResponse.data));

          const boundsHeader = pngResponse.headers['x-overlay-bounds'];
          overlayBounds = boundsHeader ? JSON.parse(boundsHeader) : {
            west: compareResult.spatial_metadata.bbox.west,
            south: compareResult.spatial_metadata.bbox.south,
            east: compareResult.spatial_metadata.bbox.east,
            north: compareResult.spatial_metadata.bbox.north,
            crs: compareResult.spatial_metadata.bbox.crs
          };
          overlayBounds.crs = pngResponse.headers['x-overlay-crs'] || 'EPSG:4326';

          overlayPngPath = pngFilename;
        } catch (pngError: any) {
          console.error(`[NDVI Compare] PNG conversion failed:`, pngError.message);
        }

        timings.overlayGeneration = Date.now() - overlayStartTime;
        console.log(`[NDVI Compare] ⏱️  Overlay generation: ${timings.overlayGeneration}ms`);

      } catch (exportError: any) {
        console.error(`[NDVI Compare] Overlay export failed:`, exportError.message);
      }
    }

    // Step 5: Store result
    job.result = {
      earlier: compareResult.earlier,
      later: compareResult.later,
      comparison: compareResult.comparison,
      spatial_metadata: compareResult.spatial_metadata,
      metadata: {
        earlierProductId: params.earlierProductId,
        laterProductId: params.laterProductId,
        bbox: earlierRed.bounds,
        crs: earlierRed.crs,
        dimensions: { width, height },
        resolution: earlierBandResult.metadata.resolution
      }
    };

    if (overlayPath) job.overlayPath = overlayPath;
    if (overlayPngPath) job.overlayPngPath = overlayPngPath;
    if (overlayBounds) job.overlayBounds = overlayBounds;

    job.status = 'completed';
    job.completedAt = new Date();

    // Calculate total time
    timings.total = Date.now() - startTime;

    console.log(`[NDVI Compare] ========================================`);
    console.log(`[NDVI Compare] ✅ Comparison ${comparisonId} COMPLETED`);
    console.log(`[NDVI Compare] TIMING SUMMARY:`);
    console.log(`[NDVI Compare]   - Parallel band fetch: ${timings.parallelBandFetch}ms`);
    if (timings.laterRefetch) console.log(`[NDVI Compare]   - Later refetch: ${timings.laterRefetch}ms`);
    console.log(`[NDVI Compare]   - ML processing: ${timings.mlProcessing}ms`);
    if (timings.overlayGeneration) console.log(`[NDVI Compare]   - Overlay generation: ${timings.overlayGeneration}ms`);
    console.log(`[NDVI Compare]   - TOTAL: ${timings.total}ms (${(timings.total / 1000).toFixed(1)}s)`);
    console.log(`[NDVI Compare] END TIME: ${new Date().toISOString()}`);
    console.log(`[NDVI Compare] ========================================`);

  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.error(`[NDVI Compare] ========================================`);
    console.error(`[NDVI Compare] ❌ Processing FAILED for ${comparisonId}`);
    console.error(`[NDVI Compare] Error: ${error.message}`);
    console.error(`[NDVI Compare] Time before failure: ${errorTime}ms (${(errorTime / 1000).toFixed(1)}s)`);
    console.error(`[NDVI Compare] ========================================`);
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    throw error;
  }
}

/**
 * GET /api/v1/ndvi/overlay/:analysisId
 * Download GeoTIFF overlay for a completed NDVI comparison
 * Phase 8D.4: GeoTIFF export endpoint
 */
router.get('/overlay/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const job = analysisJobs.get(analysisId);

    // Check if job exists
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Analysis is ${job.status}, overlay not available`,
        status: job.status
      });
    }

    // Check if overlay was generated
    if (!job.overlayPath) {
      return res.status(404).json({
        success: false,
        message: 'GeoTIFF overlay not available for this analysis. Spatial metadata may not have been validated or pixel arrays were not preserved.'
      });
    }

    // Build safe file path (prevent directory traversal)
    const overlayFilename = path.basename(job.overlayPath);
    const overlayFullPath = path.join(OVERLAY_DIR, overlayFilename);

    // Check if file exists
    if (!existsSync(overlayFullPath)) {
      console.error(`[NDVI] Overlay file not found: ${overlayFullPath}`);
      return res.status(404).json({
        success: false,
        message: 'GeoTIFF overlay file not found on server'
      });
    }

    // Get file stats
    const stats = await fs.stat(overlayFullPath);

    // Set appropriate headers for GeoTIFF download
    res.setHeader('Content-Type', 'image/tiff');
    res.setHeader('Content-Disposition', `attachment; filename="${overlayFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Stream file to response
    const fileStream = require('fs').createReadStream(overlayFullPath);
    fileStream.pipe(res);

    console.log(`[NDVI] GeoTIFF overlay downloaded: ${overlayFilename} (${stats.size} bytes)`);

  } catch (error: any) {
    console.error('[NDVI] Overlay download failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download GeoTIFF overlay',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/ndvi/overlay/:analysisId/png
 * Download PNG overlay for CesiumJS visualization
 * Phase 8D.5: PNG overlay endpoint
 */
router.get('/overlay/:analysisId/png', async (req, res) => {
  try {
    const { analysisId } = req.params;
    const job = analysisJobs.get(analysisId);

    // Check if job exists
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Analysis is ${job.status}, overlay not available`,
        status: job.status
      });
    }

    // Check if PNG overlay was generated
    if (!job.overlayPngPath) {
      return res.status(404).json({
        success: false,
        message: 'PNG overlay not available for this analysis.'
      });
    }

    // Build safe file path (prevent directory traversal)
    const pngFilename = path.basename(job.overlayPngPath);
    const pngFullPath = path.join(OVERLAY_DIR, pngFilename);

    // Check if file exists
    if (!existsSync(pngFullPath)) {
      console.error(`[NDVI] PNG overlay file not found: ${pngFullPath}`);
      return res.status(404).json({
        success: false,
        message: 'PNG overlay file not found on server'
      });
    }

    // Get file stats
    const stats = await fs.stat(pngFullPath);

    // Set appropriate headers for PNG download with bounds metadata
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${pngFilename}"`);
    res.setHeader('Content-Length', stats.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Include overlay bounds in response headers for CesiumJS
    if (job.overlayBounds) {
      res.setHeader('X-Overlay-West', job.overlayBounds.west.toString());
      res.setHeader('X-Overlay-South', job.overlayBounds.south.toString());
      res.setHeader('X-Overlay-East', job.overlayBounds.east.toString());
      res.setHeader('X-Overlay-North', job.overlayBounds.north.toString());
      res.setHeader('X-Overlay-CRS', job.overlayBounds.crs || 'EPSG:4326');
    }

    // Stream file to response
    const fileStream = require('fs').createReadStream(pngFullPath);
    fileStream.pipe(res);

    console.log(`[NDVI] PNG overlay downloaded: ${pngFilename} (${stats.size} bytes)`);

  } catch (error: any) {
    console.error('[NDVI] PNG overlay download failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download PNG overlay',
      error: error.message
    });
  }
});

export default router;
