/**
 * Satellite Image Comparison Component
 * Displays earlier and later satellite images side by side
 */

import { useState, useEffect } from 'react';
import { Calendar, Cloud, Loader, AlertCircle } from 'lucide-react';

interface SatelliteComparisonProps {
  earlierProduct: {
    id: string;
    acquisitionDate: string;
    cloudCoverage: number;
  };
  laterProduct: {
    id: string;
    acquisitionDate: string;
    cloudCoverage: number;
  };
  bbox: { west: number; south: number; east: number; north: number };
  locationName: string;
}

export default function SatelliteComparison({
  earlierProduct,
  laterProduct,
  bbox,
  locationName
}: SatelliteComparisonProps) {
  const [earlierImageUrl, setEarlierImageUrl] = useState<string>('');
  const [laterImageUrl, setLaterImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, [earlierProduct.id, laterProduct.id]);

  const loadImages = async () => {
    setLoading(true);
    setError(null);

    try {
      const bboxStr = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;

      // Fetch both images
      const earlierUrl = `/api/v1/satellite/image/${earlierProduct.id}?bbox=${bboxStr}`;
      const laterUrl = `/api/v1/satellite/image/${laterProduct.id}?bbox=${bboxStr}`;

      setEarlierImageUrl(earlierUrl);
      setLaterImageUrl(laterUrl);
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load satellite images:', err);
      setError(err.message || 'Failed to load satellite images');
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 text-eco-green-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-600">Loading satellite images...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to Load Images</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">
          Satellite Image Comparison - {locationName}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Earlier Image */}
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-800">Earlier Observation</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{formatDate(earlierProduct.acquisitionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cloud:</span>
                <span className="font-medium flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  {typeof earlierProduct.cloudCoverage === 'number' ? earlierProduct.cloudCoverage.toFixed(1) : 'N/A'}%
                </span>
              </div>
            </div>
          </div>

          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300">
            <img
              src={earlierImageUrl}
              alt="Earlier satellite observation"
              className="w-full h-full object-cover"
              onError={() => setError('Failed to load earlier image')}
            />
            <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
              Earlier
            </div>
          </div>
        </div>

        {/* Later Image */}
        <div className="space-y-2">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-green-800">Later Observation</span>
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-1 text-xs text-green-700">
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{formatDate(laterProduct.acquisitionDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cloud:</span>
                <span className="font-medium flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  {typeof laterProduct.cloudCoverage === 'number' ? laterProduct.cloudCoverage.toFixed(1) : 'N/A'}%
                </span>
              </div>
            </div>
          </div>

          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-green-300">
            <img
              src={laterImageUrl}
              alt="Later satellite observation"
              className="w-full h-full object-cover"
              onError={() => setError('Failed to load later image')}
            />
            <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
              Later
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>✓ Real Sentinel-2 Imagery:</strong> True-color composites (B04-Red, B03-Green, B02-Blue) from Copernicus Data Space
      </div>
    </div>
  );
}
