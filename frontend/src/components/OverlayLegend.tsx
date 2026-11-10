/**
 * OverlayLegend Component
 * Phase 8D.5: NDVI Change Detection Color Legend
 */

interface OverlayLegendProps {
  visible: boolean;
  onVisibilityToggle: () => void;
}

export function OverlayLegend({ visible, onVisibilityToggle }: OverlayLegendProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">NDVI Change</h4>
        <button
          onClick={onVisibilityToggle}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            visible
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: 'rgb(46, 125, 50)' }}
          ></div>
          <span className="text-gray-700">Strong Increase</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: 'rgb(139, 195, 74)' }}
          ></div>
          <span className="text-gray-700">Moderate Increase</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: 'rgb(158, 158, 158)' }}
          ></div>
          <span className="text-gray-700">Stable</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: 'rgb(255, 152, 0)' }}
          ></div>
          <span className="text-gray-700">Moderate Decrease</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-5 h-5 rounded border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: 'rgb(211, 47, 47)' }}
          ></div>
          <span className="text-gray-700">Strong Decrease</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Overlay shows pixel-level vegetation changes between comparison dates.
        </p>
      </div>
    </div>
  );
}

export default OverlayLegend;
