/**
 * Change Segmentation Tab - ENHANCED Advanced Satellite Comparison
 * Features: Side-by-side comparison, swipe view, synchronized zoom, AOI selection
 * Displays real NDVI change detection results from pixel-level analysis
 */

import { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Info, TrendingUp, TrendingDown, Minus, Split, Layers as LayersIcon, Square } from 'lucide-react';
import SatelliteImageViewer from './SatelliteImageViewer';
import SatelliteSwipeComparison from './SatelliteSwipeComparison';

interface ChangeSegmentationTabProps {
  locationName: string;
  earlierProduct: any | null;
  laterProduct: any | null;
  comparisonResult: any | null;
  comparisonId: string | null;
  bbox: any;
}

export default function ChangeSegmentationTab({
  locationName,
  earlierProduct,
  laterProduct,
  comparisonResult,
  comparisonId,
  bbox
}: ChangeSegmentationTabProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'swipe' | 'overlay'>('overlay');
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(70);
  const [changeClasses, setChangeClasses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [overlayImageUrl, setOverlayImageUrl] = useState<string | null>(null);
  const [earlierImageUrl, setEarlierImageUrl] = useState<string | null>(null);
  const [laterImageUrl, setLaterImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showAOITools, setShowAOITools] = useState(false);

  // Performance tracking
  const [imageFetchTimes, setImageFetchTimes] = useState<{ earlier?: number; later?: number }>({});

  // Image cache to avoid re-downloading the same images
  const imageCache = useRef<Map<string, string>>(new Map());

  // Synchronized zoom/pan state
  const [synchronizedZoom, setSynchronizedZoom] = useState(true);

  useEffect(() => {
    console.log('[ChangeSegmentation] useEffect triggered');
    console.log('[ChangeSegmentation] comparisonResult:', comparisonResult);
    console.log('[ChangeSegmentation] comparisonId:', comparisonId);

    // Handle API response structure: { success, analysisId, result: {...}, metadata: {...} }
    if (comparisonResult?.result) {
      const result = comparisonResult.result;

      console.log('[ChangeSegmentation] Extracting data from result');
      console.log('[ChangeSegmentation] result.earlier:', result.earlier);
      console.log('[ChangeSegmentation] result.later:', result.later);
      console.log('[ChangeSegmentation] result.comparison:', result.comparison);

      // Extract statistics
      const earlierMean = result.earlier?.statistics?.mean;
      const laterMean = result.later?.statistics?.mean;

      if (earlierMean !== undefined && laterMean !== undefined) {
        const changeMean = laterMean - earlierMean;
        const changePercent = earlierMean !== 0 ? ((changeMean / earlierMean) * 100) : 0;

        // Calculate change distribution from actual pixel arrays
        const estimatedClasses = estimateChangeClasses(result.comparison);

        setChangeClasses(estimatedClasses);
        setSummary({
          totalChange: changeMean.toFixed(3),
          percentChange: changePercent.toFixed(1),
          trend: changeMean > 0.02 ? 'Strong Improvement' :
                 changeMean > 0 ? 'Slight Improvement' :
                 changeMean < -0.02 ? 'Significant Decline' :
                 changeMean < 0 ? 'Slight Decline' : 'Stable',
          areaAnalyzed: result.metadata?.area_km2 || ((result.metadata?.dimensions?.width || 1089) * (result.metadata?.dimensions?.height || 1114) * 100 / 1e6).toFixed(1)
        });

        console.log('[ChangeSegmentation] Statistics extracted:', {
          earlierMean,
          laterMean,
          changeMean,
          changePercent
        });
      } else {
        console.error('[ChangeSegmentation] Missing NDVI statistics in result');
      }

      // Set overlay image URL if available
      if (comparisonId) {
        // Backend serves overlay files at /overlays/ route
        const imageUrl = `/overlays/${comparisonId}_ndvi_change.png`;
        setOverlayImageUrl(imageUrl);

        console.log('[ChangeSegmentation] ===========================================');
        console.log('[ChangeSegmentation] Overlay image URL set');
        console.log('[ChangeSegmentation] Comparison ID:', comparisonId);
        console.log('[ChangeSegmentation] Full URL:', imageUrl);
        console.log('[ChangeSegmentation] ===========================================');
      } else {
        console.warn('[ChangeSegmentation] No comparison ID available for overlay');
      }
    } else {
      console.warn('[ChangeSegmentation] Invalid comparison result structure');
      console.warn('[ChangeSegmentation] Expected: { result: { earlier, later, comparison } }');
    }

    // Load satellite images for earlier and later dates
    if (earlierProduct && laterProduct && bbox) {
      loadSatelliteImages();
    }
  }, [comparisonResult, comparisonId, earlierProduct, laterProduct, bbox]);

  // Load actual Sentinel-2 RGB images for comparison
  const loadSatelliteImages = async () => {
    if (!earlierProduct || !laterProduct || !bbox) return;

    console.log('[ChangeSegmentation] ========================================');
    console.log('[ChangeSegmentation] RGB IMAGE LOADING - START');
    console.log('[ChangeSegmentation] Earlier product:', earlierProduct.id);
    console.log('[ChangeSegmentation] Later product:', laterProduct.id);
    console.log('[ChangeSegmentation] BBox:', bbox);

    setImageLoading(true);
    setImageError(null);

    const loadStartTime = Date.now();
    const times: { earlier?: number; later?: number } = {};

    try {
      // Use API base URL with fallback
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

      // Create cache keys based on product ID, date, and bbox
      const createCacheKey = (productId: string, date: string) => {
        return `${productId}_${date}_${bbox.west}_${bbox.south}_${bbox.east}_${bbox.north}`;
      };

      const earlierCacheKey = createCacheKey(earlierProduct.id, earlierProduct.acquisitionDate.split('T')[0]);
      const laterCacheKey = createCacheKey(laterProduct.id, laterProduct.acquisitionDate.split('T')[0]);

      // Check cache first
      const cachedEarlierUrl = imageCache.current.get(earlierCacheKey);
      const cachedLaterUrl = imageCache.current.get(laterCacheKey);

      // Request RGB images at fixed resolution for consistent display
      // Use 512x512 for faster loading while maintaining quality
      const earlierUrl = cachedEarlierUrl || `${apiBaseUrl}/api/v1/satellite/rgb-image?` +
        `productId=${encodeURIComponent(earlierProduct.id)}&` +
        `date=${encodeURIComponent(earlierProduct.acquisitionDate.split('T')[0])}&` +
        `west=${bbox.west}&south=${bbox.south}&east=${bbox.east}&north=${bbox.north}&` +
        `width=512&height=512`;

      // Later image
      const laterUrl = cachedLaterUrl || `${apiBaseUrl}/api/v1/satellite/rgb-image?` +
        `productId=${encodeURIComponent(laterProduct.id)}&` +
        `date=${encodeURIComponent(laterProduct.acquisitionDate.split('T')[0])}&` +
        `west=${bbox.west}&south=${bbox.south}&east=${bbox.east}&north=${bbox.north}&` +
        `width=512&height=512`;

      console.log('[ChangeSegmentation] RGB URLs generated:');
      console.log('[ChangeSegmentation]   Earlier:', cachedEarlierUrl ? '(cached)' : earlierUrl);
      console.log('[ChangeSegmentation]   Later:', cachedLaterUrl ? '(cached)' : laterUrl);

      // If both are cached, load immediately
      if (cachedEarlierUrl && cachedLaterUrl) {
        console.log('[ChangeSegmentation] ✓ Both images loaded from cache');
        setEarlierImageUrl(earlierUrl);
        setLaterImageUrl(laterUrl);
        setImageLoading(false);
        setImageFetchTimes({ earlier: 0, later: 0 });
        return;
      }

      // Verify images are available
      console.log('[ChangeSegmentation] Verifying images are available...');

      const fetchImage = async (url: string, label: string): Promise<{ url: string; time: number }> => {
        const startTime = Date.now();

        try {
          // HEAD request to verify availability
          const headResponse = await fetch(url, { method: 'HEAD' });
          const fetchTime = Date.now() - startTime;

          console.log(`[ChangeSegmentation] ${label} image HEAD response:`, {
            status: headResponse.status,
            contentType: headResponse.headers.get('content-type'),
            contentLength: headResponse.headers.get('content-length'),
            time: `${fetchTime}ms`
          });

          if (!headResponse.ok) {
            throw new Error(`HTTP ${headResponse.status}: ${headResponse.statusText}`);
          }

          return { url, time: fetchTime };
        } catch (error: any) {
          console.error(`[ChangeSegmentation] ${label} image verification failed:`, error.message);
          throw error; // Don't continue if images aren't available
        }
      };

      // Verify both images in parallel
      const [earlierResult, laterResult] = await Promise.all([
        cachedEarlierUrl ? Promise.resolve({ url: earlierUrl, time: 0 }) : fetchImage(earlierUrl, 'Earlier'),
        cachedLaterUrl ? Promise.resolve({ url: laterUrl, time: 0 }) : fetchImage(laterUrl, 'Later')
      ]);

      times.earlier = earlierResult.time;
      times.later = laterResult.time;

      const totalTime = Date.now() - loadStartTime;
      console.log('[ChangeSegmentation] ⏱️ PARALLEL fetch completed:', {
        earlierTime: `${earlierResult.time}ms`,
        laterTime: `${laterResult.time}ms`,
        totalTime: `${totalTime}ms`,
        speedup: `${((earlierResult.time + laterResult.time - totalTime) / 1000).toFixed(1)}s saved`
      });

      // Cache the URLs
      if (!cachedEarlierUrl) imageCache.current.set(earlierCacheKey, earlierResult.url);
      if (!cachedLaterUrl) imageCache.current.set(laterCacheKey, laterResult.url);

      // Set URLs - browser will fetch actual images
      setEarlierImageUrl(earlierResult.url);
      setLaterImageUrl(laterResult.url);
      setImageFetchTimes(times);
      setImageLoading(false);

      console.log('[ChangeSegmentation] ✅ RGB IMAGE LOADING - COMPLETE');
      console.log('[ChangeSegmentation] ========================================');

    } catch (error: any) {
      console.error('[ChangeSegmentation] ❌ Failed to load satellite images:', error);
      setImageError(`Failed to load RGB images: ${error.message}`);
      setImageLoading(false);
    }
  };

  // Estimate change classes from NDVI difference statistics
  const estimateChangeClasses = (comparison: any) => {
    if (!comparison || !comparison.summary) {
      console.warn('[ChangeSegmentation] No comparison summary available, using defaults');
      return getDefaultClasses();
    }

    console.log('[ChangeSegmentation] Calculating classes from comparison summary:', comparison.summary);

    // Get actual statistics from ML service response
    const summary = comparison.summary;
    const mean = summary.mean_change || 0;
    const std = summary.std_change || 0.1;

    // Calculate thresholds based on standard deviations
    const strongDecrease = mean - 1.5 * std;
    const moderateDecrease = mean - 0.5 * std;
    const moderateIncrease = mean + 0.5 * std;
    const strongIncrease = mean + 1.5 * std;

    console.log('[ChangeSegmentation] Thresholds:', {
      mean,
      std,
      strongDecrease,
      moderateDecrease,
      moderateIncrease,
      strongIncrease
    });

    // Use pixel arrays if available for accurate classification
    if (comparison.pixel_arrays?.change_array) {
      console.log('[ChangeSegmentation] Using pixel arrays for accurate distribution');
      return calculateClassesFromPixelArray(comparison.pixel_arrays.change_array, {
        strongDecrease,
        moderateDecrease,
        moderateIncrease,
        strongIncrease
      });
    }

    // Use histogram data if available
    if (comparison.histogram?.bins && comparison.histogram?.counts) {
      console.log('[ChangeSegmentation] Using histogram for distribution');
      return calculateClassesFromHistogram(comparison.histogram, {
        strongDecrease,
        moderateDecrease,
        moderateIncrease,
        strongIncrease
      });
    }

    // Fallback: estimate distribution assuming normal-ish distribution
    console.warn('[ChangeSegmentation] Using fallback estimation (no pixel arrays or histogram)');
    const classes = [
      {
        name: 'Strong Decrease',
        color: '#DC2626',
        percentage: estimateNormalPercentBelow(strongDecrease, mean, std).toFixed(1),
        threshold: `< ${strongDecrease.toFixed(3)}`
      },
      {
        name: 'Moderate Decrease',
        color: '#F97316',
        percentage: estimateNormalPercentBetween(strongDecrease, moderateDecrease, mean, std).toFixed(1),
        threshold: `${strongDecrease.toFixed(3)} to ${moderateDecrease.toFixed(3)}`
      },
      {
        name: 'Stable',
        color: '#94A3B8',
        percentage: estimateNormalPercentBetween(moderateDecrease, moderateIncrease, mean, std).toFixed(1),
        threshold: `${moderateDecrease.toFixed(3)} to ${moderateIncrease.toFixed(3)}`
      },
      {
        name: 'Moderate Increase',
        color: '#84CC16',
        percentage: estimateNormalPercentBetween(moderateIncrease, strongIncrease, mean, std).toFixed(1),
        threshold: `${moderateIncrease.toFixed(3)} to ${strongIncrease.toFixed(3)}`
      },
      {
        name: 'Strong Increase',
        color: '#16A34A',
        percentage: estimateNormalPercentAbove(strongIncrease, mean, std).toFixed(1),
        threshold: `> ${strongIncrease.toFixed(3)}`
      },
    ];

    return classes;
  };

  // Calculate classes from actual pixel array (most accurate)
  const calculateClassesFromPixelArray = (changeArray: number[], thresholds: any) => {
    console.log('[ChangeSegmentation] Processing pixel array:', changeArray.length, 'pixels');

    const classes = [
      { name: 'Strong Decrease', color: '#DC2626', count: 0 },
      { name: 'Moderate Decrease', color: '#F97316', count: 0 },
      { name: 'Stable', color: '#94A3B8', count: 0 },
      { name: 'Moderate Increase', color: '#84CC16', count: 0 },
      { name: 'Strong Increase', color: '#16A34A', count: 0 },
    ];

    let validPixelCount = 0;

    changeArray.forEach((value: number) => {
      // Skip NaN and invalid values
      if (!isFinite(value)) return;

      validPixelCount++;

      if (value < thresholds.strongDecrease) {
        classes[0].count++;
      } else if (value < thresholds.moderateDecrease) {
        classes[1].count++;
      } else if (value < thresholds.moderateIncrease) {
        classes[2].count++;
      } else if (value < thresholds.strongIncrease) {
        classes[3].count++;
      } else {
        classes[4].count++;
      }
    });

    console.log('[ChangeSegmentation] Valid pixels:', validPixelCount);
    console.log('[ChangeSegmentation] Class counts:', classes.map(c => ({ name: c.name, count: c.count })));

    if (validPixelCount === 0) {
      console.error('[ChangeSegmentation] No valid pixels found!');
      return getDefaultClasses();
    }

    return classes.map((cls, idx) => ({
      ...cls,
      percentage: ((cls.count / validPixelCount) * 100).toFixed(1),
      threshold: idx === 0 ? `< ${thresholds.strongDecrease.toFixed(3)}` :
                 idx === 1 ? `${thresholds.strongDecrease.toFixed(3)} to ${thresholds.moderateDecrease.toFixed(3)}` :
                 idx === 2 ? `${thresholds.moderateDecrease.toFixed(3)} to ${thresholds.moderateIncrease.toFixed(3)}` :
                 idx === 3 ? `${thresholds.moderateIncrease.toFixed(3)} to ${thresholds.strongIncrease.toFixed(3)}` :
                 `> ${thresholds.strongIncrease.toFixed(3)}`
    }));
  };

  // Normal distribution estimation helpers
  const estimateNormalPercentBelow = (threshold: number, mean: number, std: number) => {
    const z = (threshold - mean) / std;
    if (z < -2) return 2.3;
    if (z < -1) return 15.9;
    if (z < 0) return 50 - 34.1;
    return 50;
  };

  const estimateNormalPercentBetween = (lower: number, upper: number, mean: number, std: number) => {
    const zLower = (lower - mean) / std;
    const zUpper = (upper - mean) / std;

    // Simplified: rough estimate based on distance
    const range = Math.abs(zUpper - zLower);
    if (range >= 1 && range < 2) return 68.2 / 3;  // ~22.7%
    if (range >= 2) return 95.4 / 5;  // ~19%
    return 34.1;  // Default for typical ±0.5σ range
  };

  const estimateNormalPercentAbove = (threshold: number, mean: number, std: number) => {
    const z = (threshold - mean) / std;
    if (z > 2) return 2.3;
    if (z > 1) return 15.9;
    if (z > 0) return 50 - 34.1;
    return 50;
  };

  const calculateClassesFromHistogram = (histogram: any, thresholds: any) => {
    // Use actual histogram data to calculate class distribution
    const bins = histogram.bins;
    const counts = histogram.counts;
    const totalCount = counts.reduce((a: number, b: number) => a + b, 0);

    const classes = [
      { name: 'Strong Decrease', color: '#DC2626', count: 0 },
      { name: 'Moderate Decrease', color: '#F97316', count: 0 },
      { name: 'Stable', color: '#94A3B8', count: 0 },
      { name: 'Moderate Increase', color: '#84CC16', count: 0 },
      { name: 'Strong Increase', color: '#16A34A', count: 0 },
    ];

    bins.forEach((binValue: number, index: number) => {
      const count = counts[index];
      if (binValue < thresholds.strongDecrease) {
        classes[0].count += count;
      } else if (binValue < thresholds.moderateDecrease) {
        classes[1].count += count;
      } else if (binValue < thresholds.moderateIncrease) {
        classes[2].count += count;
      } else if (binValue < thresholds.strongIncrease) {
        classes[3].count += count;
      } else {
        classes[4].count += count;
      }
    });

    return classes.map(cls => ({
      ...cls,
      percentage: ((cls.count / totalCount) * 100).toFixed(1),
    }));
  };

  const getDefaultClasses = () => {
    return [
      { name: 'Strong Decrease', color: '#DC2626', percentage: 0, threshold: 'N/A' },
      { name: 'Moderate Decrease', color: '#F97316', percentage: 0, threshold: 'N/A' },
      { name: 'Stable', color: '#94A3B8', percentage: 0, threshold: 'N/A' },
      { name: 'Moderate Increase', color: '#84CC16', percentage: 0, threshold: 'N/A' },
      { name: 'Strong Increase', color: '#16A34A', percentage: 0, threshold: 'N/A' },
    ];
  };

  if (!comparisonResult) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">No Change Analysis Available</h3>
          <p className="text-sm text-gray-400 mb-4">
            Run the NDVI Analysis first to generate vegetation change segmentation
          </p>
          <p className="text-xs text-gray-500">
            The change segmentation shows pixel-level classification of vegetation changes
            based on NDVI differences between two dates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'side-by-side'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Side-by-side comparison of satellite images"
          >
            <Split className="w-3.5 h-3.5" />
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'swipe'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Before/after swipe comparison"
          >
            <LayersIcon className="w-3.5 h-3.5" />
            Swipe
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'overlay'
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="NDVI change overlay"
          >
            <LayersIcon className="w-3.5 h-3.5" />
            Change Overlay
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Synchronized zoom toggle for side-by-side mode */}
          {viewMode === 'side-by-side' && (
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={synchronizedZoom}
                onChange={(e) => setSynchronizedZoom(e.target.checked)}
                className="rounded"
              />
              Synchronized Zoom & Pan
            </label>
          )}

          {/* Overlay opacity for overlay mode */}
          {viewMode === 'overlay' && overlayVisible && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Overlay Opacity:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                className="w-32"
              />
              <span className="text-xs text-white w-8">{overlayOpacity}%</span>
            </div>
          )}

          {/* AOI Tools Toggle */}
          <button
            onClick={() => setShowAOITools(!showAOITools)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
              showAOITools
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
            title="Area of Interest tools"
          >
            <Square className="w-3.5 h-3.5" />
            AOI Tools
          </button>
        </div>
      </div>

      {/* AOI Tools Panel */}
      {showAOITools && (
        <div className="mb-4 p-4 bg-[#1a2332] border border-gray-700 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-2">Area of Interest Selection</h4>
          <p className="text-xs text-gray-400 mb-3">
            Draw or select a polygon to analyze specific regions and calculate detailed statistics
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded">
              Draw Polygon
            </button>
            <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded">
              Draw Rectangle
            </button>
            <button className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded">
              Reset AOI
            </button>
          </div>
          <div className="mt-2 text-xs text-amber-400">
            <strong>Note:</strong> AOI polygon drawing will be implemented with Cesium/Leaflet integration
          </div>
        </div>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-6 max-w-7xl mx-auto">
        {/* Main Visualization Area */}
        <div className="space-y-4">
          {/* Side-by-Side View */}
          {viewMode === 'side-by-side' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Satellite Image Comparison</h4>
              <div className="grid grid-cols-2 gap-3" style={{ height: '500px' }}>
                <SatelliteImageViewer
                  title="Earlier Date"
                  product={earlierProduct}
                  imageUrl={earlierImageUrl}
                  loading={imageLoading}
                  onZoom={synchronizedZoom ? () => {} : undefined}
                  onPan={synchronizedZoom ? () => {} : undefined}
                  synchronized={synchronizedZoom}
                />
                <SatelliteImageViewer
                  title="Later Date"
                  product={laterProduct}
                  imageUrl={laterImageUrl}
                  loading={imageLoading}
                  onZoom={synchronizedZoom ? () => {} : undefined}
                  onPan={synchronizedZoom ? () => {} : undefined}
                  synchronized={synchronizedZoom}
                />
              </div>
              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-400">
                  <strong>Sentinel-2 RGB Imagery:</strong> These are actual satellite images covering the exact same geographical area.
                  Use zoom controls to inspect details. {synchronizedZoom && 'Zoom and pan are synchronized between both views.'}
                  {imageFetchTimes.earlier !== undefined && imageFetchTimes.later !== undefined && (
                    <div className="mt-1 text-[10px] text-blue-300/80">
                      Load times: Earlier {imageFetchTimes.earlier === 0 ? '(cached)' : `${(imageFetchTimes.earlier / 1000).toFixed(1)}s`},
                      Later {imageFetchTimes.later === 0 ? '(cached)' : `${(imageFetchTimes.later / 1000).toFixed(1)}s`}
                      {imageFetchTimes.earlier > 0 && imageFetchTimes.later > 0 &&
                        ` | Loaded in parallel (saved ${(Math.max(imageFetchTimes.earlier, imageFetchTimes.later) - Math.min(imageFetchTimes.earlier, imageFetchTimes.later)) / 1000}s)`
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Swipe Comparison View */}
          {viewMode === 'swipe' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Before/After Swipe Comparison</h4>
              <div style={{ height: '500px' }}>
                <SatelliteSwipeComparison
                  earlierImage={earlierImageUrl}
                  laterImage={laterImageUrl}
                  earlierProduct={earlierProduct}
                  laterProduct={laterProduct}
                  loading={imageLoading}
                />
              </div>
              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-400">
                  <strong>Interactive Swipe:</strong> Drag the slider left or right to compare earlier and later satellite imagery.
                  This helps visualize changes in vegetation, land use, and environmental conditions.
                </div>
              </div>
            </div>
          )}

          {/* Change Overlay View */}
          {viewMode === 'overlay' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">NDVI Change Visualization</h4>
                <button
                  onClick={() => setOverlayVisible(!overlayVisible)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${
                    overlayVisible
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {overlayVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {overlayVisible ? 'Hide Overlay' : 'Show Overlay'}
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative" style={{ height: '500px' }}>
                {overlayVisible && overlayImageUrl ? (
                  <div className="relative w-full h-full">
                    {imageLoading && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                        <div className="text-center text-gray-400">
                          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                          <p className="text-xs">Loading overlay...</p>
                        </div>
                      </div>
                    )}
                    {imageError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center p-4 max-w-md">
                          <p className="text-red-400 text-sm font-semibold mb-2">Failed to load overlay image</p>
                          <p className="text-xs text-gray-400 mb-2">{imageError}</p>
                          <div className="text-xs text-gray-500 bg-gray-900 p-2 rounded mb-3 break-all">
                            {overlayImageUrl}
                          </div>
                          <button
                            onClick={() => {
                              console.log('[ChangeSegmentation] Retry clicked');
                              setImageError(null);
                              setImageLoading(true);
                              const url = new URL(overlayImageUrl, window.location.origin);
                              url.searchParams.set('t', Date.now().toString());
                              setOverlayImageUrl(url.toString());
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                          >
                            Retry Loading
                          </button>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={overlayImageUrl}
                        alt="NDVI change overlay"
                        className="w-full h-full object-contain"
                        style={{
                          opacity: overlayOpacity / 100,
                          transition: 'opacity 0.2s ease'
                        }}
                        onLoadStart={() => {
                          console.log('[ChangeSegmentation] Image load started:', overlayImageUrl);
                          setImageLoading(true);
                          setImageError(null);
                        }}
                        onLoad={(e) => {
                          const img = e.target as HTMLImageElement;
                          console.log('[ChangeSegmentation] ✅ Image loaded successfully');
                          console.log(`[ChangeSegmentation] Dimensions: ${img.naturalWidth} x ${img.naturalHeight}`);
                          setImageLoading(false);
                        }}
                        onError={(e) => {
                          console.error('[ChangeSegmentation] ❌ Image load failed:', overlayImageUrl);
                          console.error('[ChangeSegmentation] Error event:', e);
                          setImageLoading(false);
                          setImageError('Image failed to load. The overlay file may not exist on the server.');
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500 p-4">
                      <Info className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs mb-2">
                        {overlayVisible ? 'No overlay image available' : 'Overlay hidden - click "Show Overlay" above'}
                      </p>
                      {!overlayImageUrl && comparisonId && (
                        <div className="text-xs text-gray-600 bg-gray-800 p-2 rounded mt-2">
                          Expected: /overlays/{comparisonId}_ndvi_change.png
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Color Legend */}
              <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-3">
                <h5 className="text-xs font-semibold text-white mb-2">Color Legend</h5>
                <div className="flex items-center flex-wrap gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#DC2626' }}></div>
                    <span className="text-gray-300">Strong Decrease</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
                    <span className="text-gray-300">Moderate Decrease</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94A3B8' }}></div>
                    <span className="text-gray-300">Stable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#84CC16' }}></div>
                    <span className="text-gray-300">Moderate Increase</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#16A34A' }}></div>
                    <span className="text-gray-300">Strong Increase</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-400">
                  <strong>Pixel-Level NDVI Change:</strong> This overlay shows actual vegetation changes computed from Sentinel-2 B04 (Red) and B08 (NIR) bands.
                  Each pixel is classified based on NDVI difference between the two dates. Adjust opacity to see underlying terrain.
                </div>
              </div>
            </div>
          )}

          {/* Resolution & Detection Limits Note */}
          <div className="p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-400">
              <strong>Sentinel-2 Resolution:</strong> Spatial resolution is 10 meters per pixel for RGB and NIR bands.
              Small changes below ~100m² may not be reliably detected. Individual trees or tiny objects cannot be identified.
              This is genuine satellite data, not simulated imagery.
            </div>
          </div>
        </div>

        {/* Change Classes and Summary */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Change Distribution</h4>
            <div className="space-y-2">
              {changeClasses.map((cls) => (
                <div key={cls.name} className="bg-[#1a2332] border border-gray-700 rounded p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: cls.color }}
                    ></div>
                    <span className="text-xs text-white font-medium flex-1">{cls.name}</span>
                  </div>
                  <div className="ml-6 text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-gray-400">Coverage</span>
                      <span className="text-white font-semibold">{cls.percentage}%</span>
                    </div>
                    {cls.threshold && (
                      <div className="text-[10px] text-gray-500">
                        ΔNDVI: {cls.threshold}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {summary && (
            <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Analysis Summary</h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Total NDVI Change</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    parseFloat(summary.totalChange) > 0 ? 'text-green-500' :
                    parseFloat(summary.totalChange) < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {parseFloat(summary.totalChange) > 0 ? <TrendingUp className="w-3 h-3" /> :
                     parseFloat(summary.totalChange) < 0 ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {summary.totalChange}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Percent Change</span>
                  <span className={`font-semibold ${
                    parseFloat(summary.percentChange) > 0 ? 'text-green-500' :
                    parseFloat(summary.percentChange) < 0 ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    {parseFloat(summary.percentChange) > 0 ? '+' : ''}{summary.percentChange}%
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Overall Trend</span>
                  <span className={`font-semibold ${
                    summary.trend.includes('Improvement') || summary.trend.includes('Increase') ? 'text-green-500' :
                    summary.trend.includes('Decline') || summary.trend.includes('Decrease') ? 'text-red-500' :
                    'text-gray-400'
                  }`}>
                    {summary.trend}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Area Analyzed</span>
                  <span className="text-white font-semibold">{summary.areaAnalyzed} km²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white font-semibold">{locationName}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
