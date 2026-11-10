/**
 * Environmental Summary Component
 * Provides vegetation health assessment and recommendations
 */

import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Leaf } from 'lucide-react';

interface EnvironmentalSummaryProps {
  ndviMean: number;
  ndviChange: number;
  earlierDate: string;
  laterDate: string;
}

export default function EnvironmentalSummary({
  ndviMean,
  ndviChange,
  earlierDate,
  laterDate
}: EnvironmentalSummaryProps) {

  // Calculate vegetation health score (0-100)
  const healthScore = Math.round(Math.max(0, Math.min(100, (ndviMean + 0.2) * 125)));

  // Determine risk level
  const getRiskLevel = () => {
    if (ndviChange < -0.10) return { level: 'High', color: 'red', icon: AlertTriangle };
    if (ndviChange < -0.05) return { level: 'Medium', color: 'orange', icon: TrendingDown };
    if (ndviChange > 0.05) return { level: 'Low', color: 'green', icon: TrendingUp };
    return { level: 'Low', color: 'blue', icon: CheckCircle };
  };

  const risk = getRiskLevel();
  const RiskIcon = risk.icon;

  // Generate recommendations
  const getRecommendations = () => {
    const recommendations = [];

    if (ndviChange < -0.10) {
      recommendations.push('Significant vegetation decline detected - immediate assessment recommended');
      recommendations.push('Consider soil moisture analysis and irrigation review');
      recommendations.push('Monitor for pest activity or disease');
    } else if (ndviChange < -0.05) {
      recommendations.push('Moderate vegetation stress observed');
      recommendations.push('Review water availability and recent weather patterns');
      recommendations.push('Consider seasonal factors and land use changes');
    } else if (ndviChange > 0.10) {
      recommendations.push('Positive vegetation growth observed');
      recommendations.push('Continue current land management practices');
      recommendations.push('Monitor for sustained improvement');
    } else {
      recommendations.push('Stable vegetation conditions');
      recommendations.push('Maintain current monitoring schedule');
      recommendations.push('Watch for seasonal variations');
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  const getHealthColor = () => {
    if (healthScore >= 70) return 'green';
    if (healthScore >= 50) return 'yellow';
    if (healthScore >= 30) return 'orange';
    return 'red';
  };

  const healthColor = getHealthColor();

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-eco-green-600" />
          Environmental Assessment
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Vegetation Health Score */}
        <div className={`p-4 rounded-lg border-2 bg-${healthColor}-50 border-${healthColor}-200`}>
          <div className="text-sm font-medium text-gray-700 mb-2">Vegetation Health</div>
          <div className={`text-3xl font-bold text-${healthColor}-600`}>{healthScore}</div>
          <div className="text-xs text-gray-600 mt-1">Based on NDVI: {ndviMean.toFixed(3)}</div>
        </div>

        {/* Risk Classification */}
        <div className={`p-4 rounded-lg border-2 bg-${risk.color}-50 border-${risk.color}-200`}>
          <div className="text-sm font-medium text-gray-700 mb-2">Risk Level</div>
          <div className={`flex items-center gap-2 text-${risk.color}-600`}>
            <RiskIcon className="w-6 h-6" />
            <span className="text-2xl font-bold">{risk.level}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Change: {ndviChange > 0 ? '+' : ''}{ndviChange.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700">Recommendations:</div>
        <ul className="space-y-2">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-eco-green-600 mt-0.5">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Data Period */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
        <strong>Analysis Period:</strong> {new Date(earlierDate).toLocaleDateString()} to {new Date(laterDate).toLocaleDateString()}
      </div>

      {/* Disclaimer */}
      <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
        <strong>Note:</strong> Assessment based on NDVI satellite data. Ground validation recommended for detailed analysis.
      </div>
    </div>
  );
}
