import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

import { AssistantQuery, AssistantResponse } from '../types/assistant';

class ApiService {
  private backendClient: AxiosInstance;
  private mlClient: AxiosInstance;

  constructor() {
    this.backendClient = axios.create({
      baseURL: BACKEND_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.mlClient = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async checkBackendHealth() {
    const response = await this.backendClient.get('/health');
    return response.data;
  }

  async checkMLServiceHealth() {
    const response = await this.mlClient.get('/health');
    return response.data;
  }

  // Location API methods
  async resolveLocation(type: string, value: any, country: string = 'IN') {
    const response = await this.backendClient.post('/api/v1/locations/resolve', {
      type,
      value,
      country
    });
    return response.data;
  }

  async validateCoordinates(lat: number, lon: number) {
    const response = await this.backendClient.get('/api/v1/locations/validate/coordinates', {
      params: { lat, lon }
    });
    return response.data;
  }

  async getLocationSuggestions(query: string, country: string = 'IN') {
    const response = await this.backendClient.get('/api/v1/locations/suggestions', {
      params: { q: query, country }
    });
    return response.data;
  }

  // Phase 2 and beyond: Add analysis and other API methods here

  // Phase 3: Satellite Data API
  async getSatelliteStatus() {
    const response = await this.backendClient.get('/api/v1/satellite/status');
    return response.data;
  }

  async searchSatelliteProducts(
    latitude: number,
    longitude: number,
    options?: {
      startDate?: string;
      endDate?: string;
      maxCloudCover?: number;
      limit?: number;
    }
  ) {
    // Satellite searches can take 6-9 seconds due to Copernicus API response time
    // Use longer timeout specifically for this endpoint
    const response = await this.backendClient.post('/api/v1/satellite/search', {
      latitude,
      longitude,
      ...options
    }, {
      timeout: 30000 // 30 second timeout for satellite search (vs default 10s)
    });
    return response.data;
  }

  async getSatelliteProduct(productId: string) {
    const response = await this.backendClient.get(`/api/v1/satellite/product/${productId}`);
    return response.data;
  }

  // Phase 4: NDVI Analysis API
  async analyzeNDVI(request: {
    productId: string;
    acquisitionDate: string;
    bbox: { west: number; south: number; east: number; north: number };
    locationName?: string;
  }) {
    const response = await this.backendClient.post('/api/v1/ndvi/analyze', request, {
      timeout: 120000 // 2 minutes for analysis
    });
    return response.data;
  }

  async getNDVIStatus(analysisId: string) {
    const response = await this.backendClient.get(`/api/v1/ndvi/status/${analysisId}`);
    return response.data;
  }

  async getNDVIResult(analysisId: string) {
    const response = await this.backendClient.get(`/api/v1/ndvi/result/${analysisId}`);
    return response.data;
  }

  async deleteNDVIAnalysis(analysisId: string) {
    const response = await this.backendClient.delete(`/api/v1/ndvi/${analysisId}`);
    return response.data;
  }

  // Phase 6: Historical NDVI Comparison API
  async compareNDVI(request: {
    earlierProductId: string;
    earlierAcquisitionDate: string;
    laterProductId: string;
    laterAcquisitionDate: string;
    bbox: { west: number; south: number; east: number; north: number };
    locationName?: string;
    resolution?: number;
  }) {
    const response = await this.backendClient.post('/api/v1/ndvi/compare', request, {
      timeout: 180000 // 3 minutes for historical comparison
    });
    return response.data;
  }

  async getComparisonStatus(comparisonId: string) {
    const response = await this.backendClient.get(`/api/v1/ndvi/status/${comparisonId}`);
    return response.data;
  }

  async getComparisonResult(comparisonId: string) {
    const response = await this.backendClient.get(`/api/v1/ndvi/result/${comparisonId}`);
    return response.data;
  }

  // Phase 7: AI Assistant API
  async queryAssistant(query: AssistantQuery): Promise<AssistantResponse> {
    const response = await this.backendClient.post('/api/v1/assistant/query', query, {
      timeout: 120000 // 2 minutes for Ollama responses
    });
    return response.data;
  }

  async getAssistantCapabilities() {
    const response = await this.backendClient.get('/api/v1/assistant/capabilities');
    return response.data;
  }

  /**
   * Land Cover Classification
   */
  async classifyLandCover(params: {
    productId: string;
    acquisitionDate: string;
    bbox: { west: number; south: number; east: number; north: number };
    resolution?: number;
  }) {
    const response = await this.backendClient.post('/api/v1/landcover/classify', params, {
      timeout: 90000 // 90 seconds for classification
    });
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
