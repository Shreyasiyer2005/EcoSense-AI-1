/**
 * Reports Page
 * View and manage saved analysis reports
 */

import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, Calendar, MapPin, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { storageService, SavedReport } from '../services/storage';
import jsPDF from 'jspdf';

export default function Reports() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = () => {
    const allReports = storageService.getReports();
    setReports(allReports);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = storageService.searchReports(query);
      setReports(results);
    } else {
      loadReports();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      storageService.deleteReport(id);
      loadReports();
      if (selectedReport?.id === id) {
        setSelectedReport(null);
      }
    }
  };

  const handleDownloadPDF = (report: SavedReport) => {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129); // Green color
      doc.text('ECOSENSE AI', 105, 20, { align: 'center' });

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Environmental Analysis Report', 105, 30, { align: 'center' });

      // Line separator
      doc.setDrawColor(229, 231, 235);
      doc.line(20, 35, 190, 35);

      // Report Information
      let yPos = 45;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Report ID:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(report.id, 60, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Generated:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(report.createdAt).toLocaleString(), 60, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(report.status === 'completed' ? 0 : 255, report.status === 'completed' ? 128 : 0, 0);
      doc.text(report.status.toUpperCase(), 60, yPos);
      doc.setTextColor(0, 0, 0);

      // Location Information Section
      yPos += 20;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('LOCATION INFORMATION', 20, yPos);
      doc.setTextColor(0, 0, 0);
      doc.line(20, yPos + 2, 190, yPos + 2);

      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Name:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(report.locationName, 60, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Coordinates:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${report.latitude.toFixed(4)}°N, ${report.longitude.toFixed(4)}°E`, 60, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Analysis Date:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(report.analysisDate).toLocaleDateString(), 60, yPos);

      // Analysis Period Section
      if (report.earlierDate && report.laterDate) {
        yPos += 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('ANALYSIS PERIOD', 20, yPos);
        doc.setTextColor(0, 0, 0);
        doc.line(20, yPos + 2, 190, yPos + 2);

        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Earlier Date:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(report.earlierDate).toLocaleDateString(), 60, yPos);

        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Later Date:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(report.laterDate).toLocaleDateString(), 60, yPos);
      }

      // NDVI Results Section
      if (report.ndviMean !== undefined) {
        yPos += 20;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('NDVI RESULTS', 20, yPos);
        doc.setTextColor(0, 0, 0);
        doc.line(20, yPos + 2, 190, yPos + 2);

        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Mean NDVI:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(report.ndviMean.toFixed(3), 60, yPos);

        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Change Detected:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(report.changeDetected ? 255 : 0, report.changeDetected ? 140 : 128, 0);
        doc.text(report.changeDetected ? 'YES' : 'NO', 60, yPos);
        doc.setTextColor(0, 0, 0);
      }

      // Land Cover Section
      if (report.landCoverClasses && report.landCoverClasses.length > 0) {
        yPos += 20;
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('LAND COVER CLASSIFICATION', 20, yPos);
        doc.setTextColor(0, 0, 0);
        doc.line(20, yPos + 2, 190, yPos + 2);

        yPos += 10;
        doc.setFontSize(12);

        report.landCoverClasses.forEach((cls: any) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.text(`${cls.name}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(`${cls.percentage}%`, 60, yPos);
          yPos += 8;
        });
      }

      // Comparison ID Section
      if (report.comparisonId) {
        yPos += 15;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text('TECHNICAL DETAILS', 20, yPos);
        doc.setTextColor(0, 0, 0);
        doc.line(20, yPos + 2, 190, yPos + 2);

        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Comparison ID:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(report.comparisonId, 60, yPos);
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          105,
          290,
          { align: 'center' }
        );
        doc.text(
          'Generated by EcoSense AI - Environmental Monitoring Platform',
          105,
          285,
          { align: 'center' }
        );
      }

      // Save PDF
      doc.save(`ecosense_report_${report.id}.pdf`);

      console.log('[Reports] PDF generated successfully:', report.id);
    } catch (error) {
      console.error('[Reports] PDF generation failed:', error);
      alert('Failed to generate PDF. Check console for details.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-[#0f1419] min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <h1 className="text-3xl font-bold text-white">Analysis Reports</h1>
              </div>
              <p className="text-gray-400">View and manage your saved environmental analysis reports</p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-white">{reports.length}</div>
              <div className="text-sm text-gray-400">Total Reports</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports by location or ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-[#1a2332] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {reports.length === 0 ? (
          /* Empty State */
          <div className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Reports Yet</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery ? 'No reports match your search.' : 'Analysis reports will appear here automatically when you complete an analysis.'}
              </p>
              {!searchQuery && (
                <a
                  href="/analyze"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Start Your First Analysis
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Reports Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(report => (
              <div
                key={report.id}
                className="bg-[#1a2332] border border-gray-700/50 rounded-xl p-6 hover:border-green-500/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedReport(report)}
              >
                {/* Report Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      report.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-xs font-semibold ${
                      report.status === 'completed' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(report);
                      }}
                      className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                      title="Download Report"
                    >
                      <Download className="w-4 h-4 text-gray-400 hover:text-green-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(report.id);
                      }}
                      className="p-1.5 hover:bg-gray-800 rounded transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <h3 className="text-white font-semibold group-hover:text-green-400 transition-colors">
                    {report.locationName}
                  </h3>
                  <div className="text-xs text-gray-500">
                    {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E
                  </div>
                </div>

                {/* Date */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Created</span>
                  </div>
                  <div className="text-sm text-white">
                    {formatDate(report.createdAt)}
                  </div>
                </div>

                {/* NDVI if available */}
                {report.ndviMean !== undefined && (
                  <div className="pt-3 border-t border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Mean NDVI</span>
                      <div className="flex items-center gap-1">
                        {report.ndviMean > 0.5 ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : report.ndviMean < 0.3 ? (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className="text-sm font-semibold text-white">
                          {report.ndviMean.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedReport(null)}
          >
            <div
              className="bg-[#1a2332] border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {selectedReport.locationName}
                    </h2>
                    <p className="text-gray-400 text-sm">Report ID: {selectedReport.id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Location Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Latitude</div>
                      <div className="text-white font-semibold">{selectedReport.latitude.toFixed(6)}°N</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Longitude</div>
                      <div className="text-white font-semibold">{selectedReport.longitude.toFixed(6)}°E</div>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Analysis Period</h3>
                  <div className="space-y-2">
                    {selectedReport.earlierDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Earlier Date:</span>
                        <span className="text-white font-semibold">
                          {new Date(selectedReport.earlierDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {selectedReport.laterDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Later Date:</span>
                        <span className="text-white font-semibold">
                          {new Date(selectedReport.laterDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Generated:</span>
                      <span className="text-white font-semibold">{formatDate(selectedReport.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* NDVI Results */}
                {selectedReport.ndviMean !== undefined && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">NDVI Results</h3>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Mean NDVI Value</span>
                        <span className="text-2xl font-bold text-green-400">
                          {selectedReport.ndviMean.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Land Cover */}
                {selectedReport.landCoverClasses && selectedReport.landCoverClasses.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Land Cover Classification</h3>
                    <div className="space-y-2">
                      {selectedReport.landCoverClasses.map((cls, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                          <span className="text-gray-300">{cls.name}</span>
                          <span className="text-white font-semibold">{cls.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleDownloadPDF(selectedReport)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                  <button
                    onClick={() => {
                      handleDelete(selectedReport.id);
                      setSelectedReport(null);
                    }}
                    className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-semibold rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
