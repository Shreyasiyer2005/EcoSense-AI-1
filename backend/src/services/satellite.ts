/**
 * Copernicus Data Space Ecosystem - Sentinel-2 Satellite Data Service
 *
 * Integrates with the Copernicus Data Space Ecosystem to search and retrieve
 * Sentinel-2 Level-2A (L2A) satellite imagery and metadata.
 *
 * Free tier: No cost for data access. Requires free account registration.
 * Rate limits: OAuth token requests limited. Reuse tokens within validity period.
 */

import axios, { AxiosInstance } from 'axios';

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

interface Sentinel2Product {
  Id: string;
  Name: string;
  ContentDate: {
    Start: string;
    End: string;
  };
  PublicationDate: string;
  ModificationDate: string;
  Online: boolean;
  ContentLength: number;
  Footprint: string; // GeoJSON geometry
  GeoFootprint: any; // GeoJSON object
  Attributes?: Array<{
    Name: string;
    Value: string;
  }>;
}

interface SearchOptions {
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  bbox?: [number, number, number, number]; // [west, south, east, north]
  startDate?: string; // ISO date
  endDate?: string;
  maxCloudCover?: number; // 0-100
  limit?: number;
}

interface SearchResult {
  success: boolean;
  products: Sentinel2Product[];
  count: number;
  message: string;
  query?: string;
}

/**
 * Copernicus Data Space Satellite Service
 *
 * Handles OAuth2 authentication and satellite data retrieval from
 * the Copernicus Data Space Ecosystem.
 */
class CopernicusSatelliteService {
  private client: AxiosInstance;
  private catalogClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private clientId: string = '';
  private clientSecret: string = '';
  private initialized: boolean = false;

  private readonly TOKEN_URL = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
  private readonly CATALOG_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1';

  constructor() {
    this.client = axios.create({
      timeout: 60000, // 60 seconds for OAuth token requests
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    this.catalogClient = axios.create({
      baseURL: this.CATALOG_URL,
      timeout: 90000, // 90 seconds for catalog searches (can be slow)
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Lazy initialization - load credentials on first use
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    this.clientId = process.env.COPERNICUS_CLIENT_ID || '';
    this.clientSecret = process.env.COPERNICUS_CLIENT_SECRET || '';
    this.initialized = true;

    // Debug log (development only, no secrets)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Copernicus] Service initialized (lazy)');
      console.log('[Copernicus] CLIENT_ID from env:', this.clientId ? `present (${this.clientId.length} chars)` : 'MISSING');
      console.log('[Copernicus] CLIENT_SECRET from env:', this.clientSecret ? `present (${this.clientSecret.length} chars)` : 'MISSING');
    }
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    this.ensureInitialized();
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Get OAuth2 access token (or reuse cached token if valid)
   * Includes retry logic for network issues
   */
  private async getAccessToken(): Promise<string> {
    this.ensureInitialized();

    // Reuse token if still valid (with 60 second buffer)
    if (this.accessToken && this.tokenExpiry) {
      const now = new Date();
      const bufferTime = 60 * 1000; // 60 seconds
      if (this.tokenExpiry.getTime() - now.getTime() > bufferTime) {
        return this.accessToken;
      }
    }

    if (!this.isConfigured()) {
      throw new Error('Copernicus credentials not configured. Set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in .env');
    }

    // Retry logic for token requests
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Copernicus] Requesting access token (attempt ${attempt}/${maxRetries})...`);

        const params = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        });

        const response = await this.client.post<OAuthTokenResponse>(
          this.TOKEN_URL,
          params.toString()
        );

        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 600; // Default 10 minutes
        this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

        console.log(`[Copernicus] Access token obtained, expires in ${expiresIn}s`);
        return this.accessToken;

      } catch (error: any) {
        lastError = error;
        console.error(`[Copernicus] Token fetch attempt ${attempt} failed:`, error.message);

        // Don't retry on authentication errors (401, 403)
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Authentication failed. Invalid Copernicus credentials.');
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`[Copernicus] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`Failed to authenticate with Copernicus Data Space after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Build OData filter query for Sentinel-2 L2A search
   */
  private buildSearchQuery(options: SearchOptions): string {
    const filters: string[] = [];

    // Filter for Sentinel-2 Level-2A products only
    filters.push("Collection/Name eq 'SENTINEL-2'");
    filters.push("contains(Name,'L2A')"); // Level-2A products

    // Date range filter - Use proper ISO 8601 format
    if (options.startDate) {
      // Ensure ISO format and use proper OData date-time format
      const startISO = new Date(options.startDate).toISOString();
      filters.push(`ContentDate/Start ge ${startISO}`);
    }
    if (options.endDate) {
      const endISO = new Date(options.endDate).toISOString();
      filters.push(`ContentDate/Start le ${endISO}`);
    }

    // Geographic filter (point or bbox)
    if (options.coordinates) {
      const { latitude, longitude } = options.coordinates;
      // Create a small bounding box around the point (approx 0.1 degree ~11km)
      const buffer = 0.05;
      const polygon = `POLYGON((${longitude - buffer} ${latitude - buffer},${longitude + buffer} ${latitude - buffer},${longitude + buffer} ${latitude + buffer},${longitude - buffer} ${latitude + buffer},${longitude - buffer} ${latitude - buffer}))`;
      filters.push(`OData.CSC.Intersects(area=geography'SRID=4326;${polygon}')`);
    } else if (options.bbox) {
      const [west, south, east, north] = options.bbox;
      const polygon = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
      filters.push(`OData.CSC.Intersects(area=geography'SRID=4326;${polygon}')`);
    }

    // Cloud cover filter (if available in attributes)
    // Note: Cloud cover is in product attributes, may require additional filtering post-search

    return filters.join(' and ');
  }

  /**
   * Search for Sentinel-2 L2A products
   */
  async searchProducts(options: SearchOptions): Promise<SearchResult> {
    this.ensureInitialized();

    if (!this.isConfigured()) {
      return {
        success: false,
        products: [],
        count: 0,
        message: 'Copernicus credentials not configured. Please set up OAuth client in Dashboard.'
      };
    }

    try {
      const token = await this.getAccessToken();

      const filter = this.buildSearchQuery(options);
      const top = options.limit || 20;
      const orderby = 'ContentDate/Start desc'; // Most recent first

      const queryParams = new URLSearchParams({
        $filter: filter,
        $top: top.toString(),
        $orderby: orderby,
        $expand: 'Attributes' // Get product attributes including cloud cover
      });

      const url = `/Products?${queryParams.toString()}`;
      console.log(`[Copernicus] Searching: ${url}`);

      const response = await this.catalogClient.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const products: Sentinel2Product[] = response.data.value || [];

      // Filter by cloud cover if specified
      let filteredProducts = products;
      if (options.maxCloudCover !== undefined && products.length > 0) {
        filteredProducts = products.filter(product => {
          if (!product.Attributes) return false;
          const cloudCoverAttr = product.Attributes.find(
            attr => attr.Name === 'cloudCover' || attr.Name === 'CLOUD_COVERAGE_PERCENTAGE'
          );
          if (!cloudCoverAttr) return true; // Include if no cloud cover info
          const cloudCover = parseFloat(cloudCoverAttr.Value);
          return cloudCover <= options.maxCloudCover!;
        });
      }

      console.log(`[Copernicus] Found ${filteredProducts.length} products (${products.length} before cloud filter)`);

      return {
        success: true,
        products: filteredProducts,
        count: filteredProducts.length,
        message: filteredProducts.length > 0
          ? `Found ${filteredProducts.length} Sentinel-2 L2A products`
          : 'No products found for the specified criteria',
        query: filter
      };

    } catch (error: any) {
      console.error('[Copernicus] Search failed:', error.message);

      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          products: [],
          count: 0,
          message: 'Connection timeout. The Copernicus Data Space service is slow or unreachable. Please try again.'
        };
      }

      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          products: [],
          count: 0,
          message: 'Cannot connect to Copernicus Data Space. Service may be down.'
        };
      }

      if (error.response?.status === 401) {
        return {
          success: false,
          products: [],
          count: 0,
          message: 'Authentication failed. Please check your Copernicus credentials.'
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          products: [],
          count: 0,
          message: 'Rate limit exceeded. Please try again later.'
        };
      }

      if (error.response?.status === 503) {
        return {
          success: false,
          products: [],
          count: 0,
          message: 'Copernicus Data Space service temporarily unavailable. Please try again later.'
        };
      }

      return {
        success: false,
        products: [],
        count: 0,
        message: `Search failed: ${error.message}. This may be due to network issues or service availability.`
      };
    }
  }

  /**
   * Get product metadata by ID
   */
  async getProduct(productId: string): Promise<Sentinel2Product | null> {
    this.ensureInitialized();

    if (!this.isConfigured()) {
      throw new Error('Copernicus credentials not configured');
    }

    try {
      const token = await this.getAccessToken();

      const response = await this.catalogClient.get(`/Products(${productId})`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        params: {
          $expand: 'Attributes'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error(`[Copernicus] Failed to get product ${productId}:`, error.message);
      return null;
    }
  }

  /**
   * Extract useful metadata from product
   */
  extractMetadata(product: Sentinel2Product) {
    const attributes = product.Attributes || [];

    const findAttr = (names: string[]) => {
      for (const name of names) {
        const attr = attributes.find(a => a.Name === name);
        if (attr) return attr.Value;
      }
      return null;
    };

    return {
      id: product.Id,
      name: product.Name,
      acquisitionDate: product.ContentDate.Start,
      publicationDate: product.PublicationDate,
      online: product.Online,
      size: product.ContentLength,
      footprint: product.Footprint,
      cloudCover: findAttr(['cloudCover', 'CLOUD_COVERAGE_PERCENTAGE']),
      processingLevel: findAttr(['processingLevel', 'PROCESSING_LEVEL']),
      platformName: findAttr(['platformName', 'SATELLITE_NAME']),
      orbitNumber: findAttr(['orbitNumber', 'ORBIT_NUMBER']),
      relativeOrbitNumber: findAttr(['relativeOrbitNumber', 'RELATIVE_ORBIT_NUMBER']),
      tileId: findAttr(['tileId', 'TILE_ID', 'GRANULE_ID']),
    };
  }
}

// Export singleton instance
export const satelliteService = new CopernicusSatelliteService();
export type { SearchOptions, SearchResult, Sentinel2Product };
