/**
 * Sentinel Hub Process API Service
 *
 * Provides on-demand processing of Sentinel-2 imagery through the Copernicus
 * Data Space Ecosystem Sentinel Hub Process API.
 *
 * This service requests specific bands (B04, B08) for NDVI calculation without
 * downloading entire multi-gigabyte products.
 *
 * Free tier: 10,000 Processing Units (PU) per month, 300 PU per minute
 *
 * @see https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html
 */

import axios, { AxiosInstance } from 'axios';
import { satelliteService } from './satellite';
import { fromArrayBuffer } from 'geotiff';

interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
  crs: string; // e.g., 'EPSG:4326'
}

interface ProcessRequest {
  bbox: BBox;
  productId: string;
  acquisitionDate: string;
  bands: string[]; // e.g., ['B04', 'B08', 'SCL']
  width?: number;
  height?: number;
  resolution?: number; // meters per pixel
}

interface BandData {
  band: string;
  width: number;
  height: number;
  data: number[][]; // 2D array of pixel values
  dtype: string;
  nodata: number | null;
  bounds: BBox;
  crs: string;
}

interface ProcessResponse {
  success: boolean;
  bands: BandData[];
  metadata: {
    productId: string;
    acquisitionDate: string;
    bbox: BBox;
    resolution: number;
    width: number;
    height: number;
  };
  message?: string;
}

/**
 * Sentinel Hub Process API client for on-demand Sentinel-2 processing
 */
class SentinelHubService {
  private client: AxiosInstance;
  private readonly PROCESS_API_URL = 'https://sh.dataspace.copernicus.eu/api/v1/process';

  // Sentinel-2 band information
  private readonly BAND_RESOLUTIONS: Record<string, number> = {
    'B02': 10, // Blue
    'B03': 10, // Green
    'B04': 10, // Red
    'B08': 10, // NIR
    'B05': 20, // Red Edge 1
    'B06': 20, // Red Edge 2
    'B07': 20, // Red Edge 3
    'B8A': 20, // Narrow NIR
    'B11': 20, // SWIR 1
    'B12': 20, // SWIR 2
    'SCL': 20, // Scene Classification
    'CLD': 20, // Cloud probability
  };

  constructor() {
    this.client = axios.create({
      timeout: 120000, // 2 minutes for processing
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*' // Accept any content type (TIFF, PNG, JSON)
      }
    });
  }

  /**
   * Calculate optimal output dimensions based on bbox and resolution
   */
  private calculateDimensions(bbox: BBox, resolution: number): { width: number; height: number } {
    // Calculate approximate width and height in degrees
    const widthDeg = bbox.east - bbox.west;
    const heightDeg = bbox.north - bbox.south;

    // Convert to meters (approximate at equator, 111km per degree)
    const degToMeters = 111320; // meters per degree at equator
    const avgLat = (bbox.north + bbox.south) / 2;
    const latCorrection = Math.cos(avgLat * Math.PI / 180);

    const widthMeters = widthDeg * degToMeters * latCorrection;
    const heightMeters = heightDeg * degToMeters;

    // Calculate pixel dimensions
    const width = Math.ceil(widthMeters / resolution);
    const height = Math.ceil(heightMeters / resolution);

    // Limit to reasonable size (max 2048x2048 to avoid excessive processing)
    const maxDim = 2048;
    if (width > maxDim || height > maxDim) {
      const scale = Math.max(width, height) / maxDim;
      return {
        width: Math.ceil(width / scale),
        height: Math.ceil(height / scale)
      };
    }

    return { width, height };
  }

  /**
   * Build Sentinel Hub Process API evalscript for band retrieval
   */
  private buildEvalscript(bands: string[]): string {
    // Evalscript to return raw band values
    // Use AUTO for output to let SH determine best format
    const inputArray = JSON.stringify(bands);
    const sampleReturns = bands.map(b => `sample.${b}`).join(', ');

    return `//VERSION=3
function setup() {
  return {
    input: ${inputArray},
    output: { bands: ${bands.length}, sampleType: "AUTO" }
  };
}
function evaluatePixel(sample) {
  return [${sampleReturns}];
}`;
  }

  /**
   * Request band data from Sentinel Hub Process API
   *
   * NOTE: This uses a simplified approach. For production use, consider:
   * - Using the actual Sentinel Hub Processing API with proper authentication
   * - Handling large areas with tiling
   * - Caching processed results
   * - Using GeoTIFF output format for better geospatial handling
   */
  async processBands(request: ProcessRequest): Promise<ProcessResponse> {
    try {
      // Get OAuth token from satellite service
      const token = await (satelliteService as any).getAccessToken();

      if (!token) {
        throw new Error('Failed to obtain access token');
      }

      // Determine output resolution (use finest band resolution if not specified)
      const resolution = request.resolution || Math.min(
        ...request.bands.map(b => this.BAND_RESOLUTIONS[b] || 10)
      );

      // Calculate output dimensions
      const dimensions = request.width && request.height
        ? { width: request.width, height: request.height }
        : this.calculateDimensions(request.bbox, resolution);

      // Build evalscript
      const evalscript = this.buildEvalscript(request.bands);

      // Construct Process API request
      // Note: Use a time range window around the acquisition date to ensure data availability
      const date = new Date(request.acquisitionDate);
      const fromDate = new Date(date);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(date);
      toDate.setHours(23, 59, 59, 999);

      const processRequest = {
        input: {
          bounds: {
            bbox: [
              request.bbox.west,
              request.bbox.south,
              request.bbox.east,
              request.bbox.north
            ],
            properties: {
              crs: 'http://www.opengis.net/def/crs/EPSG/0/4326'
            }
          },
          data: [{
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: fromDate.toISOString().split('.')[0] + 'Z',
                to: toDate.toISOString().split('.')[0] + 'Z'
              }
            }
          }]
        },
        output: {
          width: dimensions.width,
          height: dimensions.height,
          responses: [{
            identifier: 'default',
            format: {
              type: 'image/tiff'
            }
          }]
        },
        evalscript
      };

      console.log('[Sentinel Hub] Processing request:', {
        url: this.PROCESS_API_URL,
        bbox: request.bbox,
        date: request.acquisitionDate,
        bands: request.bands,
        dimensions,
        resolution: `${resolution}m`
      });

      console.log('[Sentinel Hub] Evalscript:', evalscript);
      console.log('[Sentinel Hub] Full request body:', JSON.stringify(processRequest, null, 2));

      // Send request to Process API
      const response = await this.client.post(
        this.PROCESS_API_URL,
        processRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'arraybuffer'
        }
      );

      // Parse GeoTIFF response
      console.log('[Sentinel Hub] Received response:', {
        status: response.status,
        contentType: response.headers['content-type'],
        size: response.data.byteLength
      });

      // Check if response is actually JSON (error case or no data)
      const contentType = String(response.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const buffer = Buffer.from(response.data);
        const text = buffer.toString('utf-8');
        console.log('[Sentinel Hub] JSON response (raw):', text);

        // Parse JSON - could be null, error object, or other
        const jsonResponse = JSON.parse(text);
        console.log('[Sentinel Hub] JSON response (parsed):', jsonResponse);

        // Check for error object
        if (jsonResponse && jsonResponse.error) {
          throw new Error(`Sentinel Hub API error: ${JSON.stringify(jsonResponse.error)}`);
        }

        // If null or empty, likely no data available for that date/location
        if (jsonResponse === null || (Array.isArray(jsonResponse) && jsonResponse.length === 0)) {
          throw new Error('No imagery data available for the specified date and location. Try a different date or increase the time range.');
        }
      }

      // Parse the GeoTIFF using geotiff.js
      // Convert response.data to ArrayBuffer if it's a Buffer
      const arrayBuffer = response.data instanceof ArrayBuffer
        ? response.data
        : response.data.buffer.slice(
            response.data.byteOffset,
            response.data.byteOffset + response.data.byteLength
          );

      const tiff = await fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      const rasters = await image.readRasters();

      const width = image.getWidth();
      const height = image.getHeight();

      console.log('[Sentinel Hub] Parsed GeoTIFF:', {
        width,
        height,
        bands: request.bands.length,
        samplesPerPixel: rasters.length
      });

      // Extract band data as 2D arrays
      const bands: BandData[] = request.bands.map((bandName, idx) => {
        const raster = rasters[idx];

        // Convert to 2D array
        const data: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            row.push(raster[y * width + x]);
          }
          data.push(row);
        }

        return {
          band: bandName,
          width,
          height,
          data,
          dtype: 'uint16',
          nodata: 0,
          bounds: request.bbox,
          crs: request.bbox.crs || 'EPSG:4326'
        };
      });

      return {
        success: true,
        bands,
        metadata: {
          productId: request.productId,
          acquisitionDate: request.acquisitionDate,
          bbox: request.bbox,
          resolution,
          width,
          height
        }
      };

    } catch (error: any) {
      console.error('[Sentinel Hub] Processing failed:', error.message);

      if (error.response) {
        console.error('[Sentinel Hub] Response status:', error.response.status);
        console.error('[Sentinel Hub] Response headers:', error.response.headers);

        // Try to parse error response
        try {
          let errorData = error.response.data;
          if (errorData instanceof Buffer || errorData instanceof ArrayBuffer) {
            const buffer = errorData instanceof ArrayBuffer
              ? Buffer.from(errorData)
              : errorData;
            const errorText = buffer.toString('utf-8');
            console.error('[Sentinel Hub] Response body (decoded):', errorText);
            errorData = JSON.parse(errorText);
          }
          console.error('[Sentinel Hub] Response body (parsed):', errorData);
        } catch (parseError) {
          console.error('[Sentinel Hub] Could not parse error response');
        }
      }

      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please check Copernicus credentials.');
      }

      if (error.response?.status === 403) {
        throw new Error('Access denied. Check Processing Unit quota.');
      }

      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      if (error.response?.status === 400) {
        throw new Error(`Bad request: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`Sentinel Hub processing failed: ${error.message}`);
    }
  }

  /**
   * Process bands for NDVI calculation (B04 Red + B08 NIR + SCL quality mask)
   *
   * Note: SCL (Scene Classification Layer) is optional and used for cloud masking.
   * If SCL fails, we can still calculate NDVI without quality masking.
   */
  async processNDVIBands(
    bbox: BBox,
    productId: string,
    acquisitionDate: string,
    resolution?: number,
    includeSCL: boolean = true
  ): Promise<ProcessResponse> {
    const bands = includeSCL ? ['B04', 'B08', 'SCL'] : ['B04', 'B08'];

    return this.processBands({
      bbox,
      productId,
      acquisitionDate,
      bands, // Red, NIR, optionally Scene Classification
      resolution: resolution || 10 // 10m native resolution for B04/B08
    });
  }

  /**
   * Process multi-spectral bands for land cover classification
   * Fetches B02 (Blue), B03 (Green), B04 (Red), B08 (NIR), B11 (SWIR1), B12 (SWIR2)
   */
  async processLandCoverBands(
    bbox: BBox,
    productId: string,
    acquisitionDate: string,
    resolution?: number
  ): Promise<ProcessResponse> {
    const bands = ['B02', 'B03', 'B04', 'B08', 'B11', 'B12'];

    return this.processBands({
      bbox,
      productId,
      acquisitionDate,
      bands,
      resolution: resolution || 20 // Use 20m resolution for compatibility with SWIR bands
    });
  }

  /**
   * Get true-color (RGB) satellite image as PNG
   * Uses B04 (Red), B03 (Green), B02 (Blue) for natural color
   * Default resolution: 10m (native Sentinel-2 resolution for RGB bands)
   */
  async getTrueColorImage(params: {
    bbox: BBox;
    productId: string;
    acquisitionDate: string;
    width?: number;
    height?: number;
  }): Promise<Buffer> {
    const { bbox, productId, acquisitionDate, width, height } = params;

    // Get OAuth token from satellite service
    const token = await (satelliteService as any).getAccessToken();

    if (!token) {
      throw new Error('Failed to obtain access token');
    }

    // Calculate dimensions based on 10m resolution if not provided
    // For typical analysis areas (~0.1° x 0.1°), this gives ~1000x1000 pixels
    const dimensions = width && height
      ? { width, height }
      : this.calculateDimensions(bbox, 10); // 10m native resolution

    const imageWidth = dimensions.width;
    const imageHeight = dimensions.height;

    console.log('[SentinelHub RGB] Requesting image:', {
      bbox,
      date: acquisitionDate,
      dimensions: `${imageWidth}x${imageHeight}`,
      resolution: '10m'
    });

    // Create evalscript for true-color visualization
    const evalscript = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02"],
    output: { bands: 3, sampleType: "AUTO" }
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}
`;

    const requestBody = {
      input: {
        bounds: {
          bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: {
              from: `${acquisitionDate}T00:00:00Z`,
              to: `${acquisitionDate}T23:59:59Z`
            }
          }
        }]
      },
      output: {
        width: imageWidth,
        height: imageHeight,
        responses: [{
          identifier: 'default',
          format: { type: 'image/png' }
        }]
      },
      evalscript: evalscript
    };

    try {
      const response = await this.client.post(this.PROCESS_API_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'image/png'
        },
        responseType: 'arraybuffer',
        timeout: 60000
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('[SentinelHub] True-color image request failed:', error.message);
      throw new Error(`Failed to fetch true-color image: ${error.message}`);
    }
  }
}

// Export singleton instance
export const sentinelHubService = new SentinelHubService();
export type { ProcessRequest, ProcessResponse, BandData, BBox };