/**
 * Environmental Change Statistics Tab
 * Compares land-cover area (hectares and percentages) between earlier and later dates
 * Shows vegetation gain/loss and built-up area changes
 */

import { useState, useEffect } from 'react';
import { Loader, Info, AlertCircle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface EnvironmentalChangeTabProps {
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

interface ClassAreaChange {
  classId: number;
  name: string;
  color: string;
  earlierHectares: number;
  laterHectares: number;
  changeHectares: number;
  earlierPercent: number;
  laterPercent: number;
  changePercent: number;
}

export default function EnvironmentalChangeTab({
  earlierProduct,
  laterProduct,
  bbox: _bbox,
  locationName,
  sharedClassifications,
  onClassify
}: EnvironmentalChangeTabProps) {
  // Use shared state instead of local state
  const loading = sharedClassifications.loading;
  const error = sharedClassifications.error;
  const earlierClassification = sharedClassifications.earlier;
  const laterClassification = sharedClassifications.later;

  const [changeStats, setChangeStats] = useState<ClassAreaChange[]>([]);
  const [totalAreaHa, setTotalAreaHa] = useState<number>(0);
  const [resolution, setResolution] = useState<number>(20);

  // Trigger classification when products are available and not already classified
  useEffect(() => {
    if (earlierProduct && laterProduct && !earlierClassification && !laterClassification && !loading) {
      onClassify();
    }
  }, [earlierProduct, laterProduct, earlierClassification, laterClassification, loading]);

  // Calculate changes when classifications are complete
  useEffect(() => {
    if (earlierClassification && laterClassification) {
      if (earlierClassification.statistics.area_statistics && laterClassification.statistics.area_statistics) {
        calculateChanges(earlierClassification, laterClassification);
      }
    }
  }, [earlierClassification, laterClassification]);

  const calculateChanges = (earlierData: any, laterData: any) => {
    const earlierStats = earlierData.statistics.area_statistics;
    const laterStats = laterData.statistics.area_statistics;

    // Set resolution and total area
    setResolution(earlierStats.resolution_meters || 20);
    setTotalAreaHa(laterStats.total_area_hectares);

    // Create a map for easier lookup
    const earlierMap = new Map();
    earlierStats.class_areas.forEach((cls: any) => {
      earlierMap.set(cls.class_id, cls);
    });

    const laterMap = new Map();
    laterStats.class_areas.forEach((cls: any) => {
      laterMap.set(cls.class_id, cls);
    });

    // Calculate changes for all classes
    const changes: ClassAreaChange[] = [];
    const allClassIds = new Set([...earlierMap.keys(), ...laterMap.keys()]);

    allClassIds.forEach((classId) => {
      const earlier = earlierMap.get(classId);
      const later = laterMap.get(classId);

      const earlierHa = earlier?.area_hectares || 0;
      const laterHa = later?.area_hectares || 0;
      const earlierPct = earlier?.percentage || 0;
      const laterPct = later?.percentage || 0;

      changes.push({
        classId: classId,
        name: earlier?.name || later?.name || 'Unknown',
        color: earlierData.classes[classId]?.color || '#999999',
        earlierHectares: earlierHa,
        laterHectares: laterHa,
        changeHectares: laterHa - earlierHa,
        earlierPercent: earlierPct,
        laterPercent: laterPct,
        changePercent: laterPct - earlierPct
      });
    });

    // Sort by earlier hectares (descending)
    changes.sort((a, b) => b.earlierHectares - a.earlierHectares);

    setChangeStats(changes);
    console.log('[EnvChange] Change statistics calculated:', changes);
  };

  // Aggregate vegetation classes (2, 3, 4)
  const getVegetationChange = () => {
    const vegClasses = [2, 3, 4]; // Dense, Moderate, Sparse
    let earlierTotal = 0;
    let laterTotal = 0;

    changeStats.forEach((stat) => {
      if (vegClasses.includes(stat.classId)) {
        earlierTotal += stat.earlierHectares;
        laterTotal += stat.laterHectares;
      }
    });

    return {
      earlier: earlierTotal,
      later: laterTotal,
      change: laterTotal - earlierTotal
    };
  };

  // Get built-up area change (class 6)
  const getBuiltUpChange = () => {
    const builtUp = changeStats.find((s) => s.classId === 6);
    if (!builtUp) return { earlier: 0, later: 0, change: 0 };

    return {
      earlier: builtUp.earlierHectares,
      later: builtUp.laterHectares,
      change: builtUp.changeHectares
    };
  };

  // Generate change summary
  const generateSummary = () => {
    const vegChange = getVegetationChange();
    const builtUpChange = getBuiltUpChange();

    const summaryParts = [];

    // Vegetation change
    if (Math.abs(vegChange.change) > 0.1) {
      if (vegChange.change > 0) {
        summaryParts.push(
          `Vegetation cover increased by ${Math.abs(vegChange.change).toFixed(1)} hectares (${((Math.abs(vegChange.change) / totalAreaHa) * 100).toFixed(1)}% of total area)`
        );
      } else {
        summaryParts.push(
          `Vegetation cover decreased by ${Math.abs(vegChange.change).toFixed(1)} hectares (${((Math.abs(vegChange.change) / totalAreaHa) * 100).toFixed(1)}% of total area)`
        );
      }
    } else {
      summaryParts.push('Vegetation cover remained relatively stable');
    }

    // Built-up change
    if (Math.abs(builtUpChange.change) > 0.1) {
      if (builtUpChange.change > 0) {
        summaryParts.push(
          `Built-up area increased by ${Math.abs(builtUpChange.change).toFixed(1)} hectares`
        );
      } else if (builtUpChange.change < 0) {
        summaryParts.push(
          `Built-up area decreased by ${Math.abs(builtUpChange.change).toFixed(1)} hectares`
        );
      }
    }

    // Largest changes
    const sortedByAbsChange = [...changeStats].sort(
      (a, b) => Math.abs(b.changeHectares) - Math.abs(a.changeHectares)
    );

    if (sortedByAbsChange.length > 0 && Math.abs(sortedByAbsChange[0].changeHectares) > 1) {
      const largest = sortedByAbsChange[0];
      summaryParts.push(
        `Largest change: ${largest.name} ${largest.changeHectares > 0 ? 'increased' : 'decreased'} by ${Math.abs(largest.changeHectares).toFixed(1)} ha`
      );
    }

    return summaryParts.length > 0
      ? summaryParts.join('. ') + '.'
      : 'No significant land-cover changes detected.';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center">
          <Loader className="w-8 h-8 text-green-500 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Analyzing environmental changes...</p>
          <p className="text-xs text-gray-500 mt-2">This may take 40-60 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-2">Analysis Failed</h3>
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
            Run an analysis first to compare environmental changes
          </p>
        </div>
      </div>
    );
  }

  if (!earlierClassification || !laterClassification || changeStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 p-6">
        <div className="text-center max-w-md">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">Ready to analyze environmental changes</p>
          <button
            onClick={onClassify}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            Analyze Changes
          </button>
        </div>
      </div>
    );
  }

  const earlierDate = new Date(earlierProduct.acquisitionDate).toLocaleDateString();
  const laterDate = new Date(laterProduct.acquisitionDate).toLocaleDateString();
  const vegChange = getVegetationChange();
  const builtUpChange = getBuiltUpChange();

  return (
    <div className="p-6 space-y-6">
      {/* Disclaimer */}
      <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-400">
            <strong>Methodology:</strong> Land-cover area calculated from {resolution}-meter Sentinel-2 imagery
            using rule-based spectral classification. Results are <strong>estimates</strong> and require field
            validation. Pixel area accounts for Earth's curvature at the location's latitude.
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Vegetation Change */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">Total Vegetation</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {Math.abs(vegChange.change).toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">ha</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {vegChange.change > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">Increase</span>
              </>
            ) : vegChange.change < 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400">Decrease</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No change</span>
            )}
          </div>
        </div>

        {/* Built-up Area Change */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">Built-up Area</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {Math.abs(builtUpChange.change).toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">ha</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {builtUpChange.change > 0 ? (
              <>
                <TrendingUp className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-400">Increase</span>
              </>
            ) : builtUpChange.change < 0 ? (
              <>
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">Decrease</span>
              </>
            ) : (
              <span className="text-xs text-gray-400">No change</span>
            )}
          </div>
        </div>

        {/* Total Area Analyzed */}
        <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-2">Total Area Analyzed</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{totalAreaHa.toFixed(1)}</span>
            <span className="text-sm text-gray-400">ha</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {resolution}m resolution
          </div>
        </div>
      </div>

      {/* Change Summary */}
      <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Environmental Change Summary</h3>
        <p className="text-sm text-gray-300 leading-relaxed">{generateSummary()}</p>
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-4">
          Before vs After Comparison - {locationName}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Land Cover Class</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">
                  Earlier<br />({earlierDate})
                </th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">
                  Later<br />({laterDate})
                </th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {changeStats
                .filter((stat) => stat.earlierHectares > 0.1 || stat.laterHectares > 0.1)
                .map((stat) => (
                  <tr key={stat.classId} className="border-b border-gray-800/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded flex-shrink-0"
                          style={{ backgroundColor: stat.color }}
                        ></div>
                        <span className="text-gray-300">{stat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="text-white font-semibold">{stat.earlierHectares.toFixed(1)} ha</div>
                      <div className="text-gray-500">{stat.earlierPercent.toFixed(1)}%</div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="text-white font-semibold">{stat.laterHectares.toFixed(1)} ha</div>
                      <div className="text-gray-500">{stat.laterPercent.toFixed(1)}%</div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div
                        className={`font-semibold ${
                          stat.changeHectares > 0.1
                            ? 'text-green-400'
                            : stat.changeHectares < -0.1
                            ? 'text-red-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {stat.changeHectares > 0 ? '+' : ''}
                        {stat.changeHectares.toFixed(1)} ha
                      </div>
                      <div
                        className={`text-xs ${
                          stat.changePercent > 0.1
                            ? 'text-green-400'
                            : stat.changePercent < -0.1
                            ? 'text-red-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {stat.changePercent > 0 ? '+' : ''}
                        {stat.changePercent.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Details */}
      <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Location: {locationName}</span>
          <span>Resolution: {resolution}m Sentinel-2</span>
          <span>Method: Rule-based spectral classification</span>
        </div>
      </div>
    </div>
  );
}
