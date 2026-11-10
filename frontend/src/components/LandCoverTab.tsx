/**
 * Land Cover Tab - Rule-based spectral classification
 * Shows 7-class land cover map and statistics
 */

import { useEffect } from 'react';
import { Loader, Info, AlertCircle } from 'lucide-react';

interface LandCoverTabProps {
  earlierProduct: any | null;
  laterProduct: any | null;
  bbox: { west: number; south: number; east: number; north: number };
  locationName: string;
  sharedClassifications: {
    earlier: any | null;
    later: any | null;
    loading: boolean;
    error: string | null;
  };
  onClassify: () => Promise<void>;
}

interface ClassInfo {
  class_id: number;
  name: string;
  color: string;
  pixel_count: number;
  percentage: number;
}

export default function LandCoverTab({
  earlierProduct,
  laterProduct,
  bbox: _bbox,
  locationName,
  sharedClassifications,
  onClassify
}: LandCoverTabProps) {
  // Use shared state instead of local state
  const loading = sharedClassifications.loading;
  const error = sharedClassifications.error;
  const earlierClassification = sharedClassifications.earlier;
  const laterClassification = sharedClassifications.later;

  // Trigger classification when products are available and not already classified
  useEffect(() => {
    if (earlierProduct && laterProduct && !earlierClassification && !laterClassification && !loading) {
      onClassify();
    }
  }, [earlierProduct, laterProduct, earlierClassification, laterClassification, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center">
          <Loader className="w-8 h-8 text-green-500 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Classifying land cover...</p>
          <p className="text-xs text-gray-500 mt-2">This may take 20-30 seconds per date</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">Classification Failed</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={onClassify}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!earlierProduct || !laterProduct) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">No Data Available</h3>
          <p className="text-sm text-gray-400">
            Run the NDVI Analysis first to load satellite products
          </p>
        </div>
      </div>
    );
  }

  if (!earlierClassification || !laterClassification) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">Ready to classify land cover</p>
          <button
            onClick={onClassify}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            Classify Land Cover
          </button>
        </div>
      </div>
    );
  }

  const earlierDate = new Date(earlierProduct.acquisitionDate).toLocaleDateString();
  const laterDate = new Date(laterProduct.acquisitionDate).toLocaleDateString();

  return (
    <div className="p-6">
      <div className="mb-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-400">
            <strong>Method:</strong> Rule-based spectral classification using NDVI, NDWI, and NDBI indices.
            This is NOT a trained machine learning model. Results are based on spectral thresholds.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Earlier Date Classification */}
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-2">Land Cover - {earlierDate}</div>
            <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Class Distribution</h4>
              <div className="space-y-2">
                {earlierClassification.statistics.class_distribution
                  .filter((cls: ClassInfo) => cls.percentage > 0.1)
                  .map((cls: ClassInfo) => (
                    <div key={cls.class_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: cls.color }}
                        ></div>
                        <span className="text-xs text-gray-300">{cls.name}</span>
                      </div>
                      <span className="text-xs text-white font-semibold">{cls.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                Total pixels: {earlierClassification.statistics.total_valid.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Later Date Classification */}
        <div className="space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-2">Land Cover - {laterDate}</div>
            <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Class Distribution</h4>
              <div className="space-y-2">
                {laterClassification.statistics.class_distribution
                  .filter((cls: ClassInfo) => cls.percentage > 0.1)
                  .map((cls: ClassInfo) => (
                    <div key={cls.class_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: cls.color }}
                        ></div>
                        <span className="text-xs text-gray-300">{cls.name}</span>
                      </div>
                      <span className="text-xs text-white font-semibold">{cls.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
                Total pixels: {laterClassification.statistics.total_valid.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Legend */}
      <div className="mt-6 bg-[#1a2332] border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Land Cover Classes</h4>
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(earlierClassification.classes).map(([id, info]: [string, any]) => (
            <div key={id} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded flex-shrink-0"
                style={{ backgroundColor: info.color }}
              ></div>
              <span className="text-xs text-gray-300">{info.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Location Info */}
      <div className="mt-4 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Location: {locationName}</span>
          <span>Resolution: 20m</span>
          <span>Method: Rule-based spectral classification</span>
        </div>
      </div>
    </div>
  );
}
