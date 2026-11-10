/**
 * Satellite Swipe Comparison Component
 * Before/After swipe comparison of two satellite images
 * Allows users to drag a slider to compare two dates
 */

import { useState, useRef, useEffect } from 'react';
import { MoveHorizontal, Calendar, Cloud } from 'lucide-react';

interface SatelliteSwipeComparisonProps {
  earlierImage: string | null;
  laterImage: string | null;
  earlierProduct: any;
  laterProduct: any;
  loading: boolean;
}

export default function SatelliteSwipeComparison({
  earlierImage,
  laterImage,
  earlierProduct,
  laterProduct,
  loading
}: SatelliteSwipeComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50); // Percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0f1419] border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Before/After Swipe Comparison</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <MoveHorizontal className="w-3 h-3" />
            <span>Drag the slider to compare</span>
          </div>
        </div>
      </div>

      {/* Comparison Container */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-900 select-none"
        onTouchMove={handleTouchMove}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Loading satellite imagery...</p>
            </div>
          </div>
        ) : earlierImage && laterImage ? (
          <>
            {/* Later Image (Background) */}
            <div className="absolute inset-0">
              <img
                src={laterImage}
                alt="Later satellite image"
                className="w-full h-full object-contain"
                draggable={false}
                onError={() => console.error('[Swipe] Later image failed to load')}
                onLoad={() => console.log('[Swipe] Later image loaded')}
              />
              {/* Later Label */}
              {laterProduct && (
                <div className="absolute top-4 right-4 px-3 py-2 bg-blue-600/90 border border-blue-500 rounded-lg text-xs text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="font-semibold">LATER</span>
                  </div>
                  <div className="text-xs opacity-90">
                    {new Date(laterProduct.acquisitionDate).toLocaleDateString()}
                  </div>
                  {laterProduct.cloudCover !== null && laterProduct.cloudCover !== undefined && (
                    <div className="flex items-center gap-1 mt-1 opacity-80">
                      <Cloud className="w-3 h-3" />
                      <span>{laterProduct.cloudCover.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Earlier Image (Clipped) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
              }}
            >
              <img
                src={earlierImage}
                alt="Earlier satellite image"
                className="w-full h-full object-contain"
                draggable={false}
                onError={() => console.error('[Swipe] Earlier image failed to load')}
                onLoad={() => console.log('[Swipe] Earlier image loaded')}
              />
              {/* Earlier Label */}
              {earlierProduct && (
                <div className="absolute top-4 left-4 px-3 py-2 bg-green-600/90 border border-green-500 rounded-lg text-xs text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="font-semibold">EARLIER</span>
                  </div>
                  <div className="text-xs opacity-90">
                    {new Date(earlierProduct.acquisitionDate).toLocaleDateString()}
                  </div>
                  {earlierProduct.cloudCover !== null && earlierProduct.cloudCover !== undefined && (
                    <div className="flex items-center gap-1 mt-1 opacity-80">
                      <Cloud className="w-3 h-3" />
                      <span>{earlierProduct.cloudCover.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Slider */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
              style={{
                left: `${sliderPosition}%`,
                transform: 'translateX(-50%)'
              }}
              onMouseDown={handleMouseDown}
            >
              {/* Slider Handle */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center cursor-ew-resize">
                <MoveHorizontal className="w-4 h-4 text-gray-800" />
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MoveHorizontal className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No satellite images available</p>
              <p className="text-xs text-gray-500 mt-1">Run analysis to load imagery for comparison</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
