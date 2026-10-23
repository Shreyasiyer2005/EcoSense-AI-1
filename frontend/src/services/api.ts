import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const ML_SERVICE_URL = import.meta.env.VITE_ML_SERVICE_URL || 'http://localhost:8000';

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

  // Phase 2 and beyond: Add location, analysis, and other API methods here
}

const apiService = new ApiService();
export default apiService;
