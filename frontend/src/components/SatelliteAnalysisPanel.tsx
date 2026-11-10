/**
 * Satellite Analysis Panel - Bottom section with proper workflow
 * Contains three tabs: Satellite Comparison, NDVI Analysis, Change Segmentation
 * Implements Run Analysis modal and date range selection
 */

import { useState } from 'react';
import { Play, Image, TrendingUp, Layers, Map, BarChart3 } from 'lucide-react';
import SatelliteComparisonTab from './SatelliteComparisonTab';
import NDVIAnalysisTab from './NDVIAnalysisTab';
import ChangeSegmentationTab from './ChangeSegmentationTab';
import LandCoverTab from './LandCoverTab';
import EnvironmentalChangeTab from './EnvironmentalChangeTab';
import DateRangePicker from './DateRangePicker';
import AnalysisProgressModal from './AnalysisProgressModal';
import apiService from '../services/api';
import { storageService } from '../services/storage';

interface SatelliteProduct {
  id: string;
  acquisitionDate: string;
  cloudCover: number;
  [key: string]: any;
}

interface SatelliteAnalysisPanelProps {
  selectedLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  satelliteProducts: any[];
  loading: boolean;
  onComparisonComplete: (comparisonId: string | null) => void;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}

export default function SatelliteAnalysisPanel({
  selectedLocation,
  satelliteProducts,
  loading,
  onComparisonComplete,
  bbox
}: SatelliteAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'comparison' | 'ndvi' | 'segmentation' | 'landcover' | 'envchange'>('comparison');

  // Date range state - default to 6 months ago and current date
  // This ensures dates are always valid for Sentinel-2
  const getDefaultDates = () => {
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    return {
      earlier: sixMonthsAgo.toISOString().split('T')[0],
      later: today.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [earlierDate, setEarlierDate] = useState<string>(defaultDates.earlier);
  const [laterDate, setLaterDate] = useState<string>(defaultDates.later);

  // Analysis state
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [earlierProduct, setEarlierProduct] = useState<any>(null);
  const [laterProduct, setLaterProduct] = useState<any>(null);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Land cover classification state (shared between LandCover and EnvChange tabs)
  const [landCoverClassifications, setLandCoverClassifications] = useState<{
    earlier: any | null;
    later: any | null;
    loading: boolean;
    error: string | null;
  }>({
    earlier: null,
    later: null,
    loading: false,
    error: null
  });

  // Find satellite products closest to selected dates
  // PARALLEL search for both dates to reduce analysis time
  const findProductsForDates = async (): Promise<{ earlier: SatelliteProduct; later: SatelliteProduct } | null> => {
    console.log('[SatelliteAnalysisPanel] ========================================');
    console.log('[SatelliteAnalysisPanel] PARALLEL PRODUCT SEARCH - START');
    console.log('[SatelliteAnalysisPanel] Target dates:', { earlierDate, laterDate });
    console.log('[SatelliteAnalysisPanel] Location:', {
      name: selectedLocation.name,
      lat: selectedLocation.latitude,
      lon: selectedLocation.longitude
    });

    const searchStartTime = Date.now();

    try {
      // PARALLEL SEARCH: Fetch both date ranges simultaneously
      const earlierStart = new Date(earlierDate);
      earlierStart.setDate(earlierStart.getDate() - 30);
      const earlierEnd = new Date(earlierDate);
      earlierEnd.setDate(earlierEnd.getDate() + 30);

      const laterStart = new Date(laterDate);
      laterStart.setDate(laterStart.getDate() - 30);
      const laterEnd = new Date(laterDate);
      laterEnd.setDate(laterEnd.getDate() + 30);

      console.log('[SatelliteAnalysisPanel] Searching BOTH dates in parallel...');

      // Execute searches in parallel using Promise.all
      const [earlierResult, laterResult] = await Promise.all([
        apiService.searchSatelliteProducts(
          selectedLocation.latitude,
          selectedLocation.longitude,
          {
            startDate: earlierStart.toISOString(),
            endDate: earlierEnd.toISOString(),
            maxCloudCover: 20, // Slightly relaxed for better availability
            limit: 10 // Reduced limit for faster response
          }
        ),
        apiService.searchSatelliteProducts(
          selectedLocation.latitude,
          selectedLocation.longitude,
          {
            startDate: laterStart.toISOString(),
            endDate: laterEnd.toISOString(),
            maxCloudCover: 20,
            limit: 10
          }
        )
      ]);

      const searchTime = Date.now() - searchStartTime;
      console.log(`[SatelliteAnalysisPanel] ⏱️  Parallel search completed in ${searchTime}ms`);

      console.log('[SatelliteAnalysisPanel] Earlier search:', {
        success: earlierResult.success,
        productCount: earlierResult.products?.length || 0
      });

      console.log('[SatelliteAnalysisPanel] Later search:', {
        success: laterResult.success,
        productCount: laterResult.products?.length || 0
      });

      if (!earlierResult.success || !laterResult.success) {
        const errorMsg = `Failed to find satellite products: ${earlierResult.message || laterResult.message || 'Unknown error'}`;
        console.error('[SatelliteAnalysisPanel]', errorMsg);
        throw new Error(errorMsg);
      }

      const allProducts = [
        ...(earlierResult.products || []),
        ...(laterResult.products || [])
      ];

      // Remove duplicates
      const seenIds = new Set<string>();
      const uniqueProducts: SatelliteProduct[] = allProducts.filter(p => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      console.log('[SatelliteAnalysisPanel] Unique products:', uniqueProducts.length);

      if (uniqueProducts.length === 0) {
        throw new Error('No suitable satellite products found. Try different dates or wait for better coverage.');
      }

      const earlierTimestamp = new Date(earlierDate).getTime();
      const laterTimestamp = new Date(laterDate).getTime();

      // Find closest products
      const earlierCandidates = uniqueProducts.filter(p => {
        const acqTime = new Date(p.acquisitionDate).getTime();
        const diffDays = Math.abs(acqTime - earlierTimestamp) / (24 * 60 * 60 * 1000);
        return diffDays <= 30;
      }).sort((a, b) => {
        const diffA = Math.abs(new Date(a.acquisitionDate).getTime() - earlierTimestamp);
        const diffB = Math.abs(new Date(b.acquisitionDate).getTime() - earlierTimestamp);
        return diffA - diffB;
      });

      const laterCandidates = uniqueProducts.filter(p => {
        const acqTime = new Date(p.acquisitionDate).getTime();
        const diffDays = Math.abs(acqTime - laterTimestamp) / (24 * 60 * 60 * 1000);
        return diffDays <= 30;
      }).sort((a, b) => {
        const diffA = Math.abs(new Date(a.acquisitionDate).getTime() - laterTimestamp);
        const diffB = Math.abs(new Date(b.acquisitionDate).getTime() - laterTimestamp);
        return diffA - diffB;
      });

      console.log('[SatelliteAnalysisPanel] Candidates after filtering:', {
        earlierCandidates: earlierCandidates.length,
        laterCandidates: laterCandidates.length,
        earlierTarget: earlierDate,
        laterTarget: laterDate
      });

      if (earlierCandidates.length > 0) {
        console.log('[SatelliteAnalysisPanel] Earlier candidates:',
          earlierCandidates.slice(0, 3).map(p => ({
            date: p.acquisitionDate.split('T')[0],
            cloud: p.cloudCover.toFixed(1) + '%',
            daysAway: (Math.abs(new Date(p.acquisitionDate).getTime() - earlierTimestamp) / (24 * 60 * 60 * 1000)).toFixed(1)
          }))
        );
      }

      if (laterCandidates.length > 0) {
        console.log('[SatelliteAnalysisPanel] Later candidates:',
          laterCandidates.slice(0, 3).map(p => ({
            date: p.acquisitionDate.split('T')[0],
            cloud: p.cloudCover.toFixed(1) + '%',
            daysAway: (Math.abs(new Date(p.acquisitionDate).getTime() - laterTimestamp) / (24 * 60 * 60 * 1000)).toFixed(1)
          }))
        );
      }

      const earlier = earlierCandidates[0];
      const later = laterCandidates[0];

      if (!earlier || !later) {
        // Log the actual unique products to help debug
        console.error('[SatelliteAnalysisPanel] ❌ Product selection failed');
        console.error('[SatelliteAnalysisPanel] Details:', {
          uniqueProductsCount: uniqueProducts.length,
          earlierCandidatesCount: earlierCandidates.length,
          laterCandidatesCount: laterCandidates.length,
          earlierDate,
          laterDate,
          availableProductDates: uniqueProducts.map(p => p.acquisitionDate.split('T')[0])
        });

        throw new Error(`Could not find suitable satellite products within 30 days of the selected dates. Found ${uniqueProducts.length} total products but ${!earlier ? 'no earlier products' : ''} ${!later ? 'no later products' : ''}. Available dates: ${uniqueProducts.map(p => p.acquisitionDate.split('T')[0]).join(', ')}. Try expanding the date range or selecting different dates.`);
      }

      if (earlier.id === later.id) {
        throw new Error('The same satellite product was found for both dates. Please select dates that are further apart.');
      }

      console.log('[SatelliteAnalysisPanel] ✅ Selected products:', {
        earlier: {
          id: earlier.id,
          date: earlier.acquisitionDate,
          cloudCover: earlier.cloudCover
        },
        later: {
          id: later.id,
          date: later.acquisitionDate,
          cloudCover: later.cloudCover
        }
      });

      return { earlier, later };

    } catch (error: any) {
      console.error('[SatelliteAnalysisPanel] ❌ Product search failed:', error);
      return null;
    }
  };

  const handleComparisonComplete = (id: string | null, result?: any) => {
    setComparisonId(id);
    setComparisonResult(result);
    onComparisonComplete(id);

    // Auto-save report when analysis completes successfully
    if (id && result) {
      try {
        console.log('[SatelliteAnalysisPanel] Auto-saving report for comparison:', id);

        storageService.saveReport({
          locationName: selectedLocation.name,
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          analysisDate: new Date().toISOString(),
          comparisonId: id,
          earlierDate: earlierDate,
          laterDate: laterDate,
          ndviMean: result.later?.statistics?.mean || 0,
          changeDetected: true,
          landCoverClasses: result.land_cover || null,
          status: 'completed'
        });

        // Send success notification
        storageService.addNotification({
          title: 'Analysis Complete',
          message: `NDVI analysis completed for ${selectedLocation.name}`,
          type: 'success'
        });

        console.log('[SatelliteAnalysisPanel] ✓ Report saved and notification sent');
      } catch (error) {
        console.error('[SatelliteAnalysisPanel] Failed to save report:', error);
        // Don't throw - analysis succeeded even if storage failed
      }
    }
  };

  // Handle land cover classification (shared between tabs)
  const handleLandCoverClassify = async () => {
    if (!earlierProduct || !laterProduct) {
      console.warn('[SatelliteAnalysisPanel] Cannot classify: products not available');
      return;
    }

    // Check if already classified for these products
    if (landCoverClassifications.earlier && landCoverClassifications.later) {
      console.log('[SatelliteAnalysisPanel] Using cached land cover classifications');
      return;
    }

    setLandCoverClassifications(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('[SatelliteAnalysisPanel] Starting land cover classification for both dates');

      // Classify both dates
      const [earlierResponse, laterResponse] = await Promise.all([
        apiService.classifyLandCover({
          productId: earlierProduct.id,
          acquisitionDate: earlierProduct.acquisitionDate,
          bbox,
          resolution: 20
        }),
        apiService.classifyLandCover({
          productId: laterProduct.id,
          acquisitionDate: laterProduct.acquisitionDate,
          bbox,
          resolution: 20
        })
      ]);

      console.log('[SatelliteAnalysisPanel] Land cover classifications complete');

      setLandCoverClassifications({
        earlier: earlierResponse,
        later: laterResponse,
        loading: false,
        error: null
      });

    } catch (err: any) {
      console.error('[SatelliteAnalysisPanel] Land cover classification failed:', err);
      setLandCoverClassifications(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Land cover classification failed'
      }));
    }
  };

  const handleRunAnalysis = () => {
    console.log('[SatelliteAnalysisPanel] Run Analysis button clicked', {
      location: selectedLocation.name,
      coordinates: { lat: selectedLocation.latitude, lon: selectedLocation.longitude },
      earlierDate,
      laterDate,
      existingProducts: satelliteProducts.length
    });

    // Open modal immediately - product search will happen inside
    setShowAnalysisModal(true);
  };

  const runCompleteAnalysis = async () => {
    console.log('[SatelliteAnalysisPanel] ========================================');
    console.log('[SatelliteAnalysisPanel] Starting complete analysis workflow');
    console.log('[SatelliteAnalysisPanel] Location:', {
      name: selectedLocation.name,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude
    });
    console.log('[SatelliteAnalysisPanel] Date range:', {
      earlierDate,
      laterDate,
      rangeInDays: Math.round((new Date(laterDate).getTime() - new Date(earlierDate).getTime()) / (24 * 60 * 60 * 1000))
    });
    console.log('[SatelliteAnalysisPanel] Existing products:', satelliteProducts.length);
    console.log('[SatelliteAnalysisPanel] ========================================');

    // Step 1: Find products for the selected dates
    const products = await findProductsForDates();

    if (!products) {
      const errorMsg = `Could not find suitable satellite products for ${selectedLocation.name} (${selectedLocation.latitude}, ${selectedLocation.longitude}) between ${earlierDate} and ${laterDate}. Please try different dates or check Copernicus availability.`;
      console.error('[SatelliteAnalysisPanel] Product search failed:', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('[SatelliteAnalysisPanel] Products selected:', {
      earlier: { id: products.earlier.id, date: products.earlier.acquisitionDate },
      later: { id: products.later.id, date: products.later.acquisitionDate }
    });

    // Store products for later use
    setEarlierProduct(products.earlier);
    setLaterProduct(products.later);

    // Step 2: Run NDVI analysis with the found products
    setIsAnalysisRunning(true);

    try {
      // Request NDVI comparison
      const result = await apiService.compareNDVI({
        earlierProductId: products.earlier.id,
        earlierAcquisitionDate: products.earlier.acquisitionDate.split('T')[0],
        laterProductId: products.later.id,
        laterAcquisitionDate: products.later.acquisitionDate.split('T')[0],
        bbox,
        locationName: selectedLocation.name,
        resolution: 10
      });

      if (!result.success) {
        throw new Error(result.message || 'NDVI comparison failed');
      }

      const comparisonId = result.comparisonId;
      console.log('[SatelliteAnalysisPanel] ==========================================');
      console.log('[SatelliteAnalysisPanel] NDVI comparison started');
      console.log('[SatelliteAnalysisPanel] Comparison ID:', comparisonId);
      console.log('[SatelliteAnalysisPanel] Comparison ID (char codes):', Array.from(String(comparisonId)).map((c: string) => `${c}(${c.charCodeAt(0)})`).join(' '));
      console.log('[SatelliteAnalysisPanel] ==========================================');

      // Poll for completion with timeout
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max
      const startTime = Date.now();

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const statusResponse = await apiService.getComparisonStatus(comparisonId);

          if (statusResponse.status === 'completed') {
            const resultResponse = await apiService.getComparisonResult(comparisonId);
            handleComparisonComplete(comparisonId, resultResponse);

            const totalTime = Date.now() - startTime;
            console.log('[SatelliteAnalysisPanel] ✅ Analysis complete:', {
              comparisonId,
              totalTime: `${(totalTime / 1000).toFixed(1)}s`,
              hasResult: !!resultResponse
            });

            return resultResponse;
          }

          if (statusResponse.status === 'failed') {
            throw new Error(statusResponse.error || 'Analysis failed');
          }

          // Log progress every 5 seconds
          if (attempts % 5 === 0) {
            console.log(`[SatelliteAnalysisPanel] Still processing... (${attempts}s elapsed)`);
          }
        } catch (pollError: any) {
          console.error('[SatelliteAnalysisPanel] Poll error:', pollError.message);
          // Continue polling unless it's a fatal error
          if (pollError.message.includes('404') || pollError.message.includes('not found')) {
            throw pollError;
          }
        }
      }

      throw new Error(`Analysis timeout after ${maxAttempts} seconds. The Copernicus or Sentinel Hub services may be slow. Please try again.`);

    } catch (error: any) {
      console.error('[SatelliteAnalysisPanel] Analysis failed:', error);
      throw error;
    } finally {
      setIsAnalysisRunning(false);
    }
  };

  const tabs = [
    { id: 'comparison', name: '1. Satellite Comparison', icon: Image },
    { id: 'ndvi', name: '2. NDVI Analysis', icon: TrendingUp },
    { id: 'segmentation', name: '3. Change Segmentation', icon: Layers },
    { id: 'landcover', name: '4. Land Cover', icon: Map },
    { id: 'envchange', name: '5. Environmental Change', icon: BarChart3 },
  ];

  const canRunAnalysis = earlierDate && laterDate && !isAnalysisRunning;

  return (
    <>
      <div className="h-full flex flex-col bg-[#0f1419] overflow-hidden">
        {/* Header with location and dates */}
        <div className="px-6 py-3 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-green-500" />
              <h3 className="text-base font-semibold text-white">
                Satellite Analysis - {selectedLocation.name}
              </h3>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={!canRunAnalysis || loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              title={!earlierDate || !laterDate ? 'Select dates first' : isAnalysisRunning ? 'Analysis in progress' : 'Run NDVI analysis'}
            >
              <Play className="w-4 h-4" />
              <span className="font-medium">Run Analysis</span>
            </button>
          </div>

          {/* Date Selection */}
          <DateRangePicker
            earlierDate={earlierDate}
            laterDate={laterDate}
            onEarlierDateChange={setEarlierDate}
            onLaterDateChange={setLaterDate}
            disabled={loading || isAnalysisRunning}
          />
        </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-green-500 border-b-2 border-green-500 bg-green-500/5'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.name}
            </button>
          );
        })}
      </div>

        {/* Tab Content - Takes remaining height with scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'comparison' && (
            <SatelliteComparisonTab
              earlierDate={earlierDate}
              laterDate={laterDate}
              earlierProduct={earlierProduct}
              laterProduct={laterProduct}
              satelliteProducts={satelliteProducts}
              loading={loading}
              bbox={bbox}
              locationName={selectedLocation.name}
              comparisonResult={comparisonResult}
              comparisonId={comparisonId}
            />
          )}
          {activeTab === 'ndvi' && (
            <NDVIAnalysisTab
              earlierDate={earlierDate}
              laterDate={laterDate}
              earlierProduct={earlierProduct}
              laterProduct={laterProduct}
              comparisonResult={comparisonResult}
              loading={isAnalysisRunning}
            />
          )}
          {activeTab === 'segmentation' && (
            <ChangeSegmentationTab
              locationName={selectedLocation.name}
              earlierProduct={earlierProduct}
              laterProduct={laterProduct}
              comparisonResult={comparisonResult}
              comparisonId={comparisonId}
              bbox={bbox}
            />
          )}
          {activeTab === 'landcover' && (
            <LandCoverTab
              earlierProduct={earlierProduct}
              laterProduct={laterProduct}
              bbox={bbox}
              locationName={selectedLocation.name}
              sharedClassifications={landCoverClassifications}
              onClassify={handleLandCoverClassify}
            />
          )}
          {activeTab === 'envchange' && (
            <EnvironmentalChangeTab
              earlierProduct={earlierProduct}
              laterProduct={laterProduct}
              bbox={bbox}
              locationName={selectedLocation.name}
              sharedClassifications={landCoverClassifications}
              onClassify={handleLandCoverClassify}
            />
          )}
        </div>
      </div>

      {/* Analysis Progress Modal */}
      <AnalysisProgressModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        locationName={selectedLocation.name}
        earlierDate={earlierDate}
        laterDate={laterDate}
        onAnalysisComplete={(_result) => {
          // Switch to NDVI Analysis tab to show results
          setActiveTab('ndvi');
        }}
        onRunAnalysis={runCompleteAnalysis}
      />
    </>
  );
}
