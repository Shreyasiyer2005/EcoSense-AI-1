/**
 * NDVI Analysis Tab - Shows NDVI comparison results
 * Receives results from the analysis workflow rather than running independently
 */

import { TrendingUp, TrendingDown, Minus, Loader, AlertCircle } from 'lucide-react';

interface NDVIAnalysisTabProps {
  earlierDate: string;
  laterDate: string;
  earlierProduct: any | null;
  laterProduct: any | null;
  comparisonResult: any | null;
  loading: boolean;
}

export default function NDVIAnalysisTab({
  earlierDate,
  laterDate,
  earlierProduct,
  laterProduct,
  comparisonResult,
  loading
}: NDVIAnalysisTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <Loader className="w-8 h-8 text-green-500 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-white font-medium mb-2">Computing NDVI Analysis</p>
          <p className="text-xs text-gray-400">Processing satellite imagery and calculating vegetation indices...</p>
        </div>
      </div>
    );
  }

  if (!comparisonResult) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-base text-gray-400 mb-2">No NDVI analysis available</p>
          <p className="text-xs text-gray-500">
            Click "Run Analysis" to compute NDVI values and vegetation changes
          </p>
        </div>
      </div>
    );
  }

  if (!comparisonResult.result) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <p className="text-base text-red-400 mb-2">Analysis data incomplete</p>
          <p className="text-xs text-gray-500">
            The comparison result is missing required data fields
          </p>
        </div>
      </div>
    );
  }

  const earlierNDVI = comparisonResult.result.earlier?.statistics?.mean || 0;
  const laterNDVI = comparisonResult.result.later?.statistics?.mean || 0;
  const ndviChange = laterNDVI - earlierNDVI;
  const percentChange = earlierNDVI !== 0 ? ((ndviChange / earlierNDVI) * 100) : 0;

  const earlierAcqDate = earlierProduct?.acquisitionDate
    ? new Date(earlierProduct.acquisitionDate).toLocaleDateString()
    : earlierDate;
  const laterAcqDate = laterProduct?.acquisitionDate
    ? new Date(laterProduct.acquisitionDate).toLocaleDateString()
    : laterDate;

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-6">
        {/* NDVI Comparison */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          {/* Earlier NDVI */}
          <div>
            <div className="text-xs text-gray-400 mb-2">NDVI {earlierAcqDate}</div>
            <div className="aspect-square bg-gradient-to-br from-yellow-900 to-green-900 rounded-lg relative overflow-hidden">
              {/* NDVI Visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-1">
                    {earlierNDVI.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/80">Avg NDVI (Before)</div>
                </div>
              </div>
              {/* Color scale */}
              <div className="absolute bottom-2 left-2 right-2 h-8 rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-white font-bold">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Later NDVI */}
          <div>
            <div className="text-xs text-gray-400 mb-2">NDVI {laterAcqDate}</div>
            <div className="aspect-square bg-gradient-to-br from-yellow-900 to-green-900 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-1">
                    {laterNDVI.toFixed(2)}
                  </div>
                  <div className="text-xs text-white/80">Avg NDVI (After)</div>
                </div>
              </div>
              {/* Color scale */}
              <div className="absolute bottom-2 left-2 right-2 h-8 rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"></div>
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] text-white font-bold">
                  <span>0.0</span>
                  <span>0.5</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NDVI Comparison Summary */}
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-2">NDVI Comparison</div>
            <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">Avg NDVI (Before)</div>
                <div className="text-2xl font-bold text-white">{earlierNDVI.toFixed(2)}</div>
              </div>
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">Avg NDVI (After)</div>
                <div className="text-2xl font-bold text-white">{laterNDVI.toFixed(2)}</div>
              </div>
              <div className="pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-1">Avg NDVI Change</div>
                <div className={`text-xl font-bold flex items-center gap-2 ${
                  ndviChange > 0 ? 'text-green-500' : ndviChange < 0 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {ndviChange > 0 ? <TrendingUp className="w-5 h-5" /> :
                   ndviChange < 0 ? <TrendingDown className="w-5 h-5" /> :
                   <Minus className="w-5 h-5" />}
                  {ndviChange > 0 ? '+' : ''}{ndviChange.toFixed(2)}
                </div>
                <div className={`text-lg font-bold mt-1 ${
                  percentChange > 0 ? 'text-green-500' : percentChange < 0 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                  {percentChange > 0 ? ' Improved' :
                   percentChange < 0 ? ' Declined' :
                   ' No Change'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Note */}
      <div className="mt-4 p-3 bg-green-900/10 border border-green-800/50 rounded-lg text-xs text-green-400">
        <strong>✓ Real NDVI Calculation:</strong> Computed from Sentinel-2 B04 (Red) and B08 (NIR) bands
      </div>
    </div>
  );
}
