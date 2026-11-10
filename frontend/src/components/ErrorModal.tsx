/**
 * Error Modal - Professional error display for analysis workflow
 * Replaces browser alerts with dark-themed modal
 */

import { AlertCircle, X, Calendar, MapPin, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  location?: string;
  earlierDate?: string;
  laterDate?: string;
  suggestedDates?: {
    earlier?: string;
    later?: string;
  };
  onRetry?: () => void;
  onAdjustDates?: () => void;
}

export default function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  location,
  earlierDate,
  laterDate,
  suggestedDates,
  onRetry,
  onAdjustDates
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2332] border border-red-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-red-700/50 bg-red-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
            <p className="text-sm text-red-300">{message}</p>
          </div>

          {/* Request Details */}
          {(location || earlierDate || laterDate) && (
            <div className="mb-4 space-y-2">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Request Details:</h3>

              {location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white font-medium">{location}</span>
                </div>
              )}

              {earlierDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Earlier Date:</span>
                  <span className="text-white font-medium">{earlierDate}</span>
                </div>
              )}

              {laterDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">Later Date:</span>
                  <span className="text-white font-medium">{laterDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Suggested Dates */}
          {suggestedDates && (suggestedDates.earlier || suggestedDates.later) && (
            <div className="mb-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Closest Available Imagery:</h3>
              <div className="space-y-2">
                {suggestedDates.earlier && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-400">Earlier:</span>
                    <span className="text-white font-medium">{suggestedDates.earlier}</span>
                  </div>
                )}
                {suggestedDates.later && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-400">Later:</span>
                    <span className="text-white font-medium">{suggestedDates.later}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Suggestions:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Try selecting different dates</li>
              <li>• Sentinel-2 revisits every 5 days (weather permitting)</li>
              <li>• Imagery may not be available for all dates due to cloud cover</li>
              <li>• Check that your selected location has Sentinel-2 coverage</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-end gap-3">
          {onAdjustDates && (
            <button
              onClick={() => {
                onAdjustDates();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Adjust Dates
            </button>
          )}
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                onClose();
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
