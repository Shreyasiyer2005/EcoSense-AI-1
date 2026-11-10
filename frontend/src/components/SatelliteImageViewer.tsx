/**
 * Satellite Image Viewer Component
 * Displays a single Sentinel-2 satellite image with controls
 * Supports zoom, pan, and overlay toggles
 */

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Calendar, Cloud, Satellite } from 'lucide-react';

interface SatelliteImageViewerProps {
  title: string;
  product: any;
  imageUrl: string | null;
  loading: boolean;
  onZoom?: (level: number) => void;
  onPan?: (x: number, y: number) => void;
  synchronized?: boolean;
}

export default function SatelliteImageViewer({
  title,
  product,
  imageUrl,
  loading,
  onZoom,
  onPan,
  synchronized = false
}: SatelliteImageViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 25, 400);
    setZoomLevel(newZoom);
    onZoom?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 25, 50);
    setZoomLevel(newZoom);
    onZoom?.(newZoom);
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
    setPanX(0);
    setPanY(0);
    onZoom?.(100);
    onPan?.(0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPanX(newX);
    setPanY(newY);
    onPan?.(newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0f1419] border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {product && (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(product.acquisitionDate).toLocaleDateString()}</span>
              </div>
              {product.cloudCover !== null && (
                <div className="flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>{product.cloudCover.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Satellite className="w-3 h-3" />
                <span>{product.platformName || 'Sentinel-2'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 relative overflow-hidden bg-gray-900">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-400">Loading satellite imagery...</p>
            </div>
          </div>
        ) : imageUrl ? (
          <div
            className="absolute inset-0 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          >
            <img
              src={imageUrl}
              alt={title}
              className="absolute"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoomLevel / 100})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              draggable={false}
              onError={(e) => {
                console.error(`[SatelliteImageViewer] Image failed to load: ${imageUrl}`);
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
              onLoad={() => {
                console.log(`[SatelliteImageViewer] Image loaded successfully: ${imageUrl}`);
              }}
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Satellite className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No satellite image available</p>
              <p className="text-xs text-gray-500 mt-1">Run analysis to load imagery</p>
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        {imageUrl && !loading && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="p-2 bg-[#1a2332] hover:bg-gray-700 border border-gray-600 rounded text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 bg-[#1a2332] hover:bg-gray-700 border border-gray-600 rounded text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 bg-[#1a2332] hover:bg-gray-700 border border-gray-600 rounded text-white transition-colors"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Zoom Level Indicator */}
        {imageUrl && !loading && zoomLevel !== 100 && (
          <div className="absolute bottom-4 left-4 px-3 py-1 bg-[#1a2332]/90 border border-gray-600 rounded text-xs text-white">
            {zoomLevel}%
          </div>
        )}

        {/* Synchronized Indicator */}
        {synchronized && (
          <div className="absolute top-4 left-4 px-2 py-1 bg-green-600/90 border border-green-500 rounded text-xs text-white">
            Synchronized
          </div>
        )}
      </div>
    </div>
  );
}
