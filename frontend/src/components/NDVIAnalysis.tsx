/**
 * NDVI Analysis Component
 * Phase 4: Real NDVI calculation from Sentinel-2 imagery
 */

import { useState } from 'react';
import { Leaf, TrendingUp, Activity, AlertCircle, CheckCircle, Loader, RefreshCw, ArrowRight, GitCompare, Calendar } from 'lucide-react';
import apiService from '../services/api';
import type { NDVIResultResponse, NDVIAnalysisRequest, HistoricalNDVIResultResponse, NDVICompareRequest } from '../types/ndvi';
import SatelliteComparison from './SatelliteComparison';
import EnvironmentalSummary from './EnvironmentalSummary';

interface NDVIAnalysisProps {
  satelliteProducts: any[];
  locationName: string;
  bbox: { west: number; south: number; east: number; north: number };
  onComparisonComplete?: (comparisonId: string) => void;  // Phase 8D.5: Callback for overlay
}

type AnalysisMode = 'single' | 'compare';

export default function NDVIAnalysis({ satelliteProducts, locationName, bbox, onComparisonComplete }: NDVIAnalysisProps) {
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [earlierProduct, setEarlierProduct] = useState<any>(null);
  const [laterProduct, setLaterProduct] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'failed'>('idle');
  const [result, setResult] = useState<NDVIResultResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<HistoricalNDVIResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleAnalyze = async (product: any) => {
    setSelectedProduct(product);
    setStatus('analyzing');
    setError(null);
    setResult(null);
    setProgress('Starting NDVI analysis...');

    try {
      // Step 1: Start analysis
      const request: NDVIAnalysisRequest = {
        productId: product.id,
        acquisitionDate: product.acquisitionDate.split('T')[0], // YYYY-MM-DD
        bbox,
        locationName
      };

      const analyzeResponse = await apiService.analyzeNDVI(request);

      if (!analyzeResponse.success) {
        throw new Error(analyzeResponse.message || 'Failed to start analysis');
      }

      const newAnalysisId = analyzeResponse.analysisId;
      setProgress('Retrieving satellite imagery...');

      // Step 2: Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max

      const pollStatus = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error('Analysis timeout - please try again');
        }

        attempts++;
        const statusResponse = await apiService.getNDVIStatus(newAnalysisId);

        if (statusResponse.status === 'completed') {
          setProgress('Retrieving results...');
          const resultResponse = await apiService.getNDVIResult(newAnalysisId);
          setResult(resultResponse);
          setStatus('completed');
          setProgress('');
        } else if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || 'Analysis failed');
        } else if (statusResponse.status === 'processing') {
          setProgress('Computing NDVI from satellite bands...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return pollStatus();
        } else {
          // still pending
          await new Promise(resolve => setTimeout(resolve, 1000));
          return pollStatus();
        }
      };

      await pollStatus();

    } catch (err: any) {
      console.error('NDVI analysis failed:', err);
      setError(err.message || 'Failed to analyze NDVI');
      setStatus('failed');
      setProgress('');
    }
  };

  const handleRetry = () => {
    if (mode === 'single' && selectedProduct) {
      handleAnalyze(selectedProduct);
    } else if (mode === 'compare' && earlierProduct && laterProduct) {
      handleCompare();
    }
  };

  const handleCompare = async () => {
    if (!earlierProduct || !laterProduct) return;

    setStatus('analyzing');
    setError(null);
    setComparisonResult(null);
    setProgress('Starting historical comparison...');

    try {
      const request: NDVICompareRequest = {
        earlierProductId: earlierProduct.id,
        earlierAcquisitionDate: earlierProduct.acquisitionDate.split('T')[0],
        laterProductId: laterProduct.id,
        laterAcquisitionDate: laterProduct.acquisitionDate.split('T')[0],
        bbox,
        locationName,
        resolution: 10
      };

      const compareResponse = await apiService.compareNDVI(request);

      if (!compareResponse.success) {
        throw new Error(compareResponse.message || 'Failed to start comparison');
      }

      const comparisonId = compareResponse.comparisonId;
      setProgress('Retrieving satellite imagery for both dates...');

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 120; // 2 minutes max

      const pollStatus = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error('Comparison timeout - please try again');
        }

        attempts++;
        const statusResponse = await apiService.getComparisonStatus(comparisonId);

        if (statusResponse.status === 'completed') {
          setProgress('Retrieving comparison results...');
          const resultResponse = await apiService.getComparisonResult(comparisonId);
          setComparisonResult(resultResponse);
          setStatus('completed');
          setProgress('');

          // Phase 8D.5: Notify parent component of completed comparison
          if (onComparisonComplete) {
            onComparisonComplete(comparisonId);
          }
        } else if (statusResponse.status === 'failed') {
          throw new Error(statusResponse.error || 'Comparison failed');
        } else if (statusResponse.status === 'processing') {
          setProgress('Computing NDVI and temporal changes...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return pollStatus();
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return pollStatus();
        }
      };

      await pollStatus();

    } catch (err: any) {
      console.error('Historical comparison failed:', err);
      setError(err.message || 'Failed to compare NDVI');
      setStatus('failed');
      setProgress('');
    }
  };

  const handleModeChange = (newMode: AnalysisMode) => {
    setMode(newMode);
    setStatus('idle');
    setResult(null);
    setComparisonResult(null);
    setError(null);
    setSelectedProduct(null);
    setEarlierProduct(null);
    setLaterProduct(null);

    // Phase 8D.5: Clear overlay when changing modes
    if (onComparisonComplete) {
      onComparisonComplete(null as any);  // Clear comparison
    }
  };

  const getNDVIColor = (mean: number): string => {
    if (mean < 0.2) return 'bg-red-100 border-red-300 text-red-800';
    if (mean < 0.4) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (mean < 0.6) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (mean < 0.8) return 'bg-lime-100 border-lime-300 text-lime-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getNDVILabel = (value: number): string => {
    if (value < 0) return 'Water/Snow';
    if (value < 0.2) return 'Bare Soil';
    if (value < 0.4) return 'Sparse Vegetation';
    if (value < 0.6) return 'Moderate Vegetation';
    if (value < 0.8) return 'Dense Vegetation';
    return 'Very Dense Vegetation';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-eco-green-600" />
          NDVI Vegetation Analysis
        </h3>
        {status === 'completed' && (
          <CheckCircle className="w-5 h-5 text-green-600" />
        )}
        {status === 'analyzing' && (
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
        )}
      </div>

      {/* Mode Selector - Phase 6 */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => handleModeChange('single')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'single'
              ? 'bg-eco-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Single Date
          </div>
        </button>
        <button
          onClick={() => handleModeChange('compare')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            mode === 'compare'
              ? 'bg-eco-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <GitCompare className="w-4 h-4" />
            Historical Compare
          </div>
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
        <p className="font-medium text-blue-900 mb-2">NDVI (Normalized Difference Vegetation Index)</p>
        <p className="text-blue-800 mb-2">
          Measures vegetation greenness using satellite bands. Higher values indicate denser, healthier vegetation.
        </p>
        <div className="grid grid-cols-3 gap-1 text-[10px]">
          <div className="bg-red-100 text-red-800 px-1 py-0.5 rounded">0.0-0.2 Bare</div>
          <div className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">0.2-0.4 Sparse</div>
          <div className="bg-lime-100 text-lime-800 px-1 py-0.5 rounded">0.4-0.6 Moderate</div>
          <div className="bg-green-100 text-green-800 px-1 py-0.5 rounded">0.6-0.8 Dense</div>
          <div className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded col-span-2">0.8-1.0 Very Dense</div>
        </div>
        <p className="text-blue-700 mt-2 italic">
          Note: NDVI indicates vegetation presence, not ecosystem health or deforestation status.
        </p>
      </div>

      {/* Historical Comparison Product Selection - Phase 6 */}
      {mode === 'compare' && status === 'idle' && satelliteProducts.length >= 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <strong>Historical Comparison:</strong> Select two observations from different dates to compare vegetation changes over time.
            The system will compute NDVI for both dates and calculate pixel-by-pixel differences.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earlier Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Earlier Observation
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {satelliteProducts.slice().reverse().map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setEarlierProduct(product)}
                    disabled={laterProduct && new Date(product.acquisitionDate) >= new Date(laterProduct.acquisitionDate)}
                    className={`w-full text-left p-2 border rounded transition-colors ${
                      earlierProduct?.id === product.id
                        ? 'border-eco-green-500 bg-eco-green-50'
                        : laterProduct && new Date(product.acquisitionDate) >= new Date(laterProduct.acquisitionDate)
                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-eco-green-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-800">
                      {new Date(product.acquisitionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {product.cloudCover && (
                      <div className="text-[10px] text-gray-600">
                        {parseFloat(product.cloudCover).toFixed(1)}% cloud
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Later Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Later Observation
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                {satelliteProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setLaterProduct(product)}
                    disabled={earlierProduct && new Date(product.acquisitionDate) <= new Date(earlierProduct.acquisitionDate)}
                    className={`w-full text-left p-2 border rounded transition-colors ${
                      laterProduct?.id === product.id
                        ? 'border-eco-green-500 bg-eco-green-50'
                        : earlierProduct && new Date(product.acquisitionDate) <= new Date(earlierProduct.acquisitionDate)
                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-eco-green-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-medium text-gray-800">
                      {new Date(product.acquisitionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {product.cloudCover && (
                      <div className="text-[10px] text-gray-600">
                        {parseFloat(product.cloudCover).toFixed(1)}% cloud
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {earlierProduct && laterProduct && (
            <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-xs text-gray-600">
                {new Date(earlierProduct.acquisitionDate).toLocaleDateString()}
              </div>
              <ArrowRight className="w-4 h-4 text-eco-green-600" />
              <div className="text-xs text-gray-600">
                {new Date(laterProduct.acquisitionDate).toLocaleDateString()}
              </div>
              <button
                onClick={handleCompare}
                className="ml-4 px-4 py-2 bg-eco-green-600 hover:bg-eco-green-700 text-white text-sm rounded-lg transition-colors font-medium"
              >
                Compare NDVI
              </button>
            </div>
          )}
        </div>
      )}

      {/* Single Date Product Selection */}
      {mode === 'single' && status === 'idle' && satelliteProducts.length > 0 && (
        <div>
          <p className="text-sm text-gray-700 mb-3 font-medium">
            Select a satellite observation to analyze:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {satelliteProducts.slice(0, 5).map((product) => (
              <button
                key={product.id}
                onClick={() => handleAnalyze(product)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-eco-green-500 hover:bg-eco-green-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {new Date(product.acquisitionDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {product.cloudCover && (
                      <div className="text-xs text-gray-600">
                        {parseFloat(product.cloudCover).toFixed(1)}% cloud cover
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-eco-green-100 text-eco-green-800 px-2 py-1 rounded">
                    Analyze →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analyzing State */}
      {status === 'analyzing' && (
        <div className="text-center py-8">
          <Loader className="w-12 h-12 text-eco-green-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-gray-800 mb-1">Analyzing Satellite Imagery</p>
          <p className="text-xs text-gray-600">{progress}</p>
          <div className="mt-4 text-xs text-gray-500">
            Processing Sentinel-2 bands B04 (Red) and B08 (NIR)...
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'failed' && (
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-red-800 mb-2">Analysis Failed</p>
          <p className="text-xs text-red-700 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-eco-green-600 hover:bg-eco-green-700 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Analysis
          </button>
        </div>
      )}

      {/* Results State */}
      {status === 'completed' && mode === 'single' && result && (
        <div className="space-y-4">
          {/* Main NDVI Value */}
          <div className={`p-4 border-2 rounded-lg ${getNDVIColor(result.result.statistics.mean)}`}>
            <div className="text-center">
              <div className="text-xs font-medium uppercase mb-1">Mean NDVI</div>
              <div className="text-4xl font-bold mb-1">
                {result.result.statistics.mean.toFixed(3)}
              </div>
              <div className="text-sm font-semibold">
                {result.result.interpretation}
              </div>
            </div>
          </div>

          {/* Vegetation Categories Distribution */}
          {result.result.vegetation_categories?.has_data && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Vegetation Coverage Distribution
              </h4>
              <div className="space-y-2">
                {result.result.vegetation_categories.categories.map((category, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-700 truncate">
                          {category.name}
                        </span>
                        <span className="text-gray-600 ml-2 whitespace-nowrap">
                          {category.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${category.percentage}%`,
                            backgroundColor: category.color
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {category.range} NDVI • {category.pixel_count.toLocaleString()} pixels
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {result.result.vegetation_categories.dominant_category && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <strong>Dominant:</strong> {result.result.vegetation_categories.dominant_category.name} ({result.result.vegetation_categories.dominant_category.percentage.toFixed(1)}% of area)
                </div>
              )}
            </div>
          )}

          {/* Environmental Analysis Summary */}
          {result.result.environmental_analysis && (
            <div className="p-4 bg-gradient-to-br from-eco-green-50 to-blue-50 border border-eco-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-eco-green-600" />
                Environmental Analysis
              </h4>
              <p className="text-xs text-gray-700 leading-relaxed mb-3">
                {result.result.environmental_analysis.summary}
              </p>

              {result.result.environmental_analysis.insights.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {result.result.environmental_analysis.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-eco-green-600 mt-0.5">•</span>
                      <span className="flex-1">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">Range</span>
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {result.result.statistics.min.toFixed(3)} - {result.result.statistics.max.toFixed(3)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {getNDVILabel(result.result.statistics.min)} to {getNDVILabel(result.result.statistics.max)}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">Median</span>
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {result.result.statistics.median.toFixed(3)}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {getNDVILabel(result.result.statistics.median)}
              </div>
            </div>
          </div>

          {/* Limitations & Context */}
          {result.result.environmental_analysis?.limitations && (
            <details className="group">
              <summary className="cursor-pointer p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-900 font-medium hover:bg-yellow-100 transition-colors">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Data Limitations & Context
                  <span className="text-[10px] text-yellow-700 group-open:hidden">(click to expand)</span>
                </span>
              </summary>
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-1.5">
                {result.result.environmental_analysis.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] text-yellow-900">
                    <span className="text-yellow-600 mt-0.5">⚠</span>
                    <span className="flex-1">{limitation}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-yellow-300 text-[10px] text-yellow-800 italic">
                  {result.result.environmental_analysis.confidence_note}
                </div>
              </div>
            </details>
          )}

          {/* Metadata */}
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600">Valid Pixels:</span>
                <span className="ml-1 font-medium text-gray-800">
                  {result.result.statistics.count.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Std Dev:</span>
                <span className="ml-1 font-medium text-gray-800">
                  {result.result.statistics.std.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Observation:</span>
                <span className="ml-1 font-medium text-gray-800">
                  {new Date(result.metadata.acquisitionDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Resolution:</span>
                <span className="ml-1 font-medium text-gray-800">
                  {result.result.metadata.resolution}m
                </span>
              </div>
            </div>
          </div>

          {/* Data Source Notice */}
          <div className="p-2 bg-green-50 border border-green-200 rounded text-[10px] text-green-800">
            <strong>✓ Real Data:</strong> Computed from Sentinel-2 B04 (Red) and B08 (NIR) bands via Copernicus Data Space Ecosystem
          </div>

          {/* Analyze Another */}
          <button
            onClick={() => {
              setStatus('idle');
              setSelectedProduct(null);
              setResult(null);
              setError(null);
            }}
            className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Analyze Another Observation
          </button>
        </div>
      )}

      {/* Historical Comparison Results - Phase 6 */}
      {status === 'completed' && mode === 'compare' && comparisonResult && (
        <div className="space-y-4">
          {/* Satellite Image Comparison */}
          {earlierProduct && laterProduct && (
            <SatelliteComparison
              earlierProduct={{
                id: earlierProduct.id,
                acquisitionDate: earlierProduct.acquisitionDate,
                cloudCoverage: earlierProduct.cloudCover ? parseFloat(earlierProduct.cloudCover) : 0
              }}
              laterProduct={{
                id: laterProduct.id,
                acquisitionDate: laterProduct.acquisitionDate,
                cloudCoverage: laterProduct.cloudCover ? parseFloat(laterProduct.cloudCover) : 0
              }}
              bbox={bbox}
              locationName={locationName}
            />
          )}

          {/* Comparison Summary Card */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-eco-green-50 border-2 border-blue-300 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <GitCompare className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-gray-800">Historical NDVI Comparison</h4>
            </div>

            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-600 mb-1">Earlier</div>
                <div className="font-medium text-gray-800">
                  {new Date(comparisonResult.result.earlier.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {comparisonResult.result.earlier.statistics.mean.toFixed(3)}
                </div>
                <div className="text-xs text-gray-600">Mean NDVI</div>
              </div>

              <ArrowRight className="w-6 h-6 text-blue-600 mx-4" />

              <div className="flex-1 text-center">
                <div className="text-xs text-gray-600 mb-1">Later</div>
                <div className="font-medium text-gray-800">
                  {new Date(comparisonResult.result.later.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-1">
                  {comparisonResult.result.later.statistics.mean.toFixed(3)}
                </div>
                <div className="text-xs text-gray-600">Mean NDVI</div>
              </div>
            </div>

            {comparisonResult.result.comparison.has_data && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="text-center">
                  <div className="text-xs text-gray-600 mb-1">Mean Change</div>
                  <div className={`text-2xl font-bold ${
                    comparisonResult.result.comparison.statistics.mean > 0
                      ? 'text-green-600'
                      : comparisonResult.result.comparison.statistics.mean < 0
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}>
                    {comparisonResult.result.comparison.statistics.mean > 0 ? '+' : ''}
                    {comparisonResult.result.comparison.statistics.mean.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {Math.abs(comparisonResult.result.comparison.statistics.mean) < 0.05
                      ? 'Minimal change'
                      : comparisonResult.result.comparison.statistics.mean > 0
                      ? 'Greening trend'
                      : 'Browning trend'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change Distribution */}
          {comparisonResult.result.comparison.has_data && (
            <div className="p-4 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Change Distribution
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Strong Decrease</span>
                      <span className="text-gray-600 ml-2 whitespace-nowrap">
                        {comparisonResult.result.comparison.change_categories.strong_decrease.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-red-500 transition-all"
                        style={{
                          width: `${comparisonResult.result.comparison.change_categories.strong_decrease.percentage}%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      NDVI drop &gt;0.2 • {comparisonResult.result.comparison.change_categories.strong_decrease.count.toLocaleString()} pixels
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Moderate Decrease</span>
                      <span className="text-gray-600 ml-2 whitespace-nowrap">
                        {comparisonResult.result.comparison.change_categories.moderate_decrease.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-orange-400 transition-all"
                        style={{
                          width: `${comparisonResult.result.comparison.change_categories.moderate_decrease.percentage}%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      NDVI drop 0.1-0.2 • {comparisonResult.result.comparison.change_categories.moderate_decrease.count.toLocaleString()} pixels
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Stable</span>
                      <span className="text-gray-600 ml-2 whitespace-nowrap">
                        {comparisonResult.result.comparison.change_categories.stable.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-gray-400 transition-all"
                        style={{
                          width: `${comparisonResult.result.comparison.change_categories.stable.percentage}%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      NDVI change ±0.1 • {comparisonResult.result.comparison.change_categories.stable.count.toLocaleString()} pixels
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-lime-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Moderate Increase</span>
                      <span className="text-gray-600 ml-2 whitespace-nowrap">
                        {comparisonResult.result.comparison.change_categories.moderate_increase.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-lime-400 transition-all"
                        style={{
                          width: `${comparisonResult.result.comparison.change_categories.moderate_increase.percentage}%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      NDVI gain 0.1-0.2 • {comparisonResult.result.comparison.change_categories.moderate_increase.count.toLocaleString()} pixels
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">Strong Increase</span>
                      <span className="text-gray-600 ml-2 whitespace-nowrap">
                        {comparisonResult.result.comparison.change_categories.strong_increase.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${comparisonResult.result.comparison.change_categories.strong_increase.percentage}%`
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      NDVI gain &gt;0.2 • {comparisonResult.result.comparison.change_categories.strong_increase.count.toLocaleString()} pixels
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Insights */}
          {comparisonResult.result.comparison.has_data && (
            <div className="p-4 bg-gradient-to-br from-eco-green-50 to-blue-50 border border-eco-green-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-eco-green-600" />
                Temporal Analysis
              </h4>
              <p className="text-xs text-gray-700 leading-relaxed mb-3">
                {comparisonResult.result.comparison.summary}
              </p>

              {comparisonResult.result.comparison.insights.length > 0 && (
                <div className="space-y-1.5">
                  {comparisonResult.result.comparison.insights.map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                      <span className="text-eco-green-600 mt-0.5">•</span>
                      <span className="flex-1">{insight}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comparison Warning */}
          {comparisonResult.result.comparison.warning && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-yellow-900">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Important Context</div>
                  <div>{comparisonResult.result.comparison.warning}</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Limitations */}
          {comparisonResult.result.comparison.limitations && (
            <details className="group">
              <summary className="cursor-pointer p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-900 font-medium hover:bg-yellow-100 transition-colors">
                <span className="inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Comparison Limitations & Context
                  <span className="text-[10px] text-yellow-700 group-open:hidden">(click to expand)</span>
                </span>
              </summary>
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-1.5">
                {comparisonResult.result.comparison.limitations.map((limitation, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[10px] text-yellow-900">
                    <span className="text-yellow-600 mt-0.5">⚠</span>
                    <span className="flex-1">{limitation}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Metadata */}
          {comparisonResult.result.comparison.has_data && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">Overlapping Pixels:</span>
                  <span className="ml-1 font-medium text-gray-800">
                    {comparisonResult.result.comparison.overlap_count.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Overlap:</span>
                  <span className="ml-1 font-medium text-gray-800">
                    {comparisonResult.result.comparison.overlap_percentage.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Resolution:</span>
                  <span className="ml-1 font-medium text-gray-800">
                    {comparisonResult.result.metadata.resolution}m
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Dimensions:</span>
                  <span className="ml-1 font-medium text-gray-800">
                    {comparisonResult.result.metadata.dimensions.width}×{comparisonResult.result.metadata.dimensions.height}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Overlap Message */}
          {!comparisonResult.result.comparison.has_data && (
            <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-900 text-sm mb-1">
                    Cannot Compare Images
                  </div>
                  <div className="text-xs text-orange-800 leading-relaxed">
                    {comparisonResult.result.comparison.message || 'No overlapping valid pixels between the two dates. This may be due to different cloud cover patterns or masked areas.'}
                  </div>
                  {comparisonResult.result.comparison.limitations && (
                    <div className="mt-2 space-y-1">
                      {comparisonResult.result.comparison.limitations.map((limitation, idx) => (
                        <div key={idx} className="text-[10px] text-orange-700">• {limitation}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Environmental Summary */}
          {comparisonResult.result.comparison.has_data && (
            <EnvironmentalSummary
              ndviMean={comparisonResult.result.later.statistics.mean}
              ndviChange={comparisonResult.result.comparison.statistics.mean}
              earlierDate={comparisonResult.result.earlier.date}
              laterDate={comparisonResult.result.later.date}
            />
          )}

          {/* Data Source Notice */}
          <div className="p-2 bg-green-50 border border-green-200 rounded text-[10px] text-green-800">
            <strong>✓ Real Data:</strong> Historical comparison computed from genuine Sentinel-2 observations via Copernicus Data Space Ecosystem
          </div>

          {/* Compare Another */}
          <button
            onClick={() => {
              setStatus('idle');
              setEarlierProduct(null);
              setLaterProduct(null);
              setComparisonResult(null);
              setError(null);
            }}
            className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Compare Different Dates
          </button>
        </div>
      )}

      {/* No Products */}
      {satelliteProducts.length === 0 && status === 'idle' && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No satellite observations available. Select a location with recent Sentinel-2 data.
        </div>
      )}

      {/* Insufficient Products for Comparison */}
      {mode === 'compare' && satelliteProducts.length < 2 && satelliteProducts.length > 0 && status === 'idle' && (
        <div className="text-center py-6">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-orange-800 mb-2">Insufficient Observations</p>
          <p className="text-xs text-orange-700">
            Historical comparison requires at least 2 satellite observations. Only {satelliteProducts.length} available.
          </p>
          <button
            onClick={() => handleModeChange('single')}
            className="mt-4 px-4 py-2 bg-eco-green-600 hover:bg-eco-green-700 text-white text-sm rounded-lg transition-colors"
          >
            Switch to Single Date Analysis
          </button>
        </div>
      )}
    </div>
  );
}
