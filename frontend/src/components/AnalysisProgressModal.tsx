/**
 * Analysis Progress Modal - Professional popup for Run Analysis workflow
 * Shows real-time progress through analysis stages
 */

import { useEffect, useState } from 'react';
import { X, CheckCircle, Loader, AlertCircle, Eye } from 'lucide-react';
import { storageService } from '../services/storage';

interface AnalysisProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  earlierDate: string;
  laterDate: string;
  onAnalysisComplete: (result: any) => void;
  onRunAnalysis: () => Promise<any>;
}

interface AnalysisStage {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  message?: string;
}

export default function AnalysisProgressModal({
  isOpen,
  onClose,
  locationName,
  earlierDate,
  laterDate,
  onAnalysisComplete,
  onRunAnalysis
}: AnalysisProgressModalProps) {
  const [stages, setStages] = useState<AnalysisStage[]>([
    { id: 'search', name: 'Searching Sentinel-2 Imagery', status: 'pending' },
    { id: 'retrieve', name: 'Retrieving Satellite Images', status: 'pending' },
    { id: 'ndvi', name: 'Computing NDVI Values', status: 'pending' },
    { id: 'changes', name: 'Calculating Vegetation Changes', status: 'pending' },
    { id: 'overlay', name: 'Generating Geographic Overlay', status: 'pending' },
    { id: 'results', name: 'Preparing Results', status: 'pending' },
  ]);

  const [currentStage, setCurrentStage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [canCancel, setCanCancel] = useState(true);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (isOpen && !isProcessing && !result && !error) {
      startAnalysis();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isProcessing) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isProcessing]);

  const updateStage = (stageIndex: number, status: 'in-progress' | 'completed' | 'failed', message?: string) => {
    setStages(prev => prev.map((stage, index) =>
      index === stageIndex ? { ...stage, status, message } : stage
    ));
    if (status === 'in-progress') {
      setCurrentStage(stageIndex);
    }
  };

  const startAnalysis = async () => {
    setIsProcessing(true);
    setError(null);
    setElapsedTime(0);

    try {
      // Stage 1: Searching imagery - THIS IS WHERE REAL PRODUCT SEARCH HAPPENS
      updateStage(0, 'in-progress', 'Searching for satellite products...');

      // Call the actual analysis function - this does product search + NDVI analysis
      const analysisResult = await onRunAnalysis();

      // If we get here, product search succeeded
      updateStage(0, 'completed', 'Found suitable satellite products');

      // Stage 2: Retrieving images (completed during analysis)
      updateStage(1, 'in-progress', 'Downloaded satellite bands');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStage(1, 'completed');

      // Stage 3: Computing NDVI (completed during analysis)
      updateStage(2, 'in-progress', 'NDVI calculations complete');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStage(2, 'completed');

      // Stage 4: Calculating changes (completed during analysis)
      updateStage(3, 'in-progress', 'Temporal differences computed');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStage(3, 'completed');

      // Stage 5: Generating overlay (completed during analysis)
      updateStage(4, 'in-progress', 'Geographic change map created');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStage(4, 'completed');

      // Stage 6: Preparing results
      updateStage(5, 'in-progress', 'Finalizing visualization...');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStage(5, 'completed');

      setResult(analysisResult);
      setCanCancel(false);

    } catch (err: any) {
      console.error('[AnalysisProgressModal] Analysis failed:', err);
      const errorMsg = err.message || 'Analysis failed. Please try again.';
      setError(errorMsg);

      // Send error notification
      storageService.addNotification({
        title: 'Analysis Failed',
        message: errorMsg,
        type: 'error'
      });

      // Mark current stage as failed and stop all subsequent stages
      updateStage(currentStage, 'failed', err.message);

      // Reset any stages that were marked in-progress but didn't actually complete
      setStages(prev => prev.map((stage, index) => {
        if (stage.status === 'in-progress' && index !== currentStage) {
          return { ...stage, status: 'pending', message: undefined };
        }
        return stage;
      }));

      setCanCancel(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing && canCancel) {
      if (!window.confirm('Analysis is in progress. Are you sure you want to cancel?')) {
        return;
      }
    }
    onClose();
    // Reset state
    setTimeout(() => {
      setStages(stages.map(s => ({ ...s, status: 'pending', message: undefined })));
      setCurrentStage(0);
      setError(null);
      setResult(null);
      setCanCancel(true);
      setElapsedTime(0);
    }, 300);
  };

  const handleViewResults = () => {
    if (result) {
      onAnalysisComplete(result);
    }
    handleClose();
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2332] border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Running NDVI Analysis</h2>
            <p className="text-sm text-gray-400 mt-1">
              {locationName} • {earlierDate} → {laterDate}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing && canCancel === false}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Analysis Stages */}
          <div className="space-y-3">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  stage.status === 'in-progress'
                    ? 'bg-blue-900/20 border border-blue-800/50'
                    : stage.status === 'completed'
                    ? 'bg-green-900/20 border border-green-800/50'
                    : stage.status === 'failed'
                    ? 'bg-red-900/20 border border-red-800/50'
                    : 'bg-gray-800/30 border border-gray-700/50'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {stage.status === 'completed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {stage.status === 'in-progress' && (
                    <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {stage.status === 'failed' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  {stage.status === 'pending' && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      stage.status === 'completed'
                        ? 'text-green-400'
                        : stage.status === 'in-progress'
                        ? 'text-blue-400'
                        : stage.status === 'failed'
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {stage.name}
                  </div>
                  {stage.message && (
                    <div className="text-xs text-gray-500 mt-1">{stage.message}</div>
                  )}
                </div>

                {/* Status indicator */}
                <div className="text-xs text-gray-500">
                  {stage.status === 'completed' && '✓'}
                  {stage.status === 'in-progress' && '...'}
                </div>
              </div>
            ))}
          </div>

          {/* Elapsed Time */}
          {isProcessing && (
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Elapsed Time</span>
                <span className="text-white font-mono font-semibold">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-red-400 mb-1">Analysis Failed</div>
                  <div className="text-xs text-red-300">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {result && !error && (
            <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-green-400 mb-1">Analysis Complete!</div>
                  <div className="text-xs text-green-300">
                    NDVI comparison completed in {formatTime(elapsedTime)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isProcessing && 'Processing satellite imagery...'}
            {error && 'Analysis failed - you can retry or adjust dates'}
            {result && !error && 'Ready to view results'}
          </div>
          <div className="flex gap-3">
            {isProcessing && canCancel && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            {error && (
              <>
                <button
                  onClick={() => {
                    // Reset error state and retry
                    setError(null);
                    setStages(stages.map(s => ({ ...s, status: 'pending', message: undefined })));
                    setCurrentStage(0);
                    setElapsedTime(0);
                    startAnalysis();
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </>
            )}
            {result && !error && (
              <button
                onClick={handleViewResults}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
