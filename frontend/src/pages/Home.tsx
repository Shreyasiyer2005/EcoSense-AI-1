/**
 * Home Page - Premium Environmental Intelligence Dashboard
 * Features 3D Earth visualization and comprehensive monitoring overview
 */

import { Link } from 'react-router-dom';
import { Satellite, TrendingUp, Layers, Eye, Zap, Activity, MapPin, BarChart3, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import HomeGlobe from '../components/HomeGlobe';
import { storageService } from '../services/storage';

export default function Home() {
  const [stats, setStats] = useState({
    resolution: '10m',
    revisit: '5 days',
    coverage: 'Global',
    analyses: 0
  });

  useEffect(() => {
    // Load actual statistics from storage
    const reports = storageService.getReports();
    setStats(prev => ({
      ...prev,
      analyses: reports.length
    }));
  }, []);

  return (
    <div className="bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#141d2a] min-h-screen pt-16">

      {/* Hero Section with 3D Earth */}
      <div className="relative overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left: Hero Content */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-full text-green-400 text-sm font-semibold mb-6 shadow-lg shadow-green-900/20">
                <Sparkles className="w-4 h-4" />
                <span>Powered by Sentinel-2 & AI</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Environmental
                <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent mt-2">
                  Intelligence Platform
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                Monitor Earth's environmental health with real-time satellite analysis,
                AI-powered insights, and comprehensive vegetation monitoring.
              </p>

              <div className="flex items-center gap-3 mb-8 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Satellite Data</span>
                </div>
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>10m Resolution</span>
                </div>
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Global Coverage</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-12">
                <Link
                  to="/analyze"
                  className="group px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-xl shadow-green-900/40 flex items-center gap-3"
                >
                  <Zap className="w-5 h-5" />
                  <span>Start Analysis</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/explore"
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-gray-700 hover:border-green-500/50 text-white font-semibold rounded-xl transition-all flex items-center gap-3"
                >
                  <Eye className="w-5 h-5" />
                  <span>Explore Globe</span>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats.resolution}</div>
                  <div className="text-xs text-gray-400">Resolution</div>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats.revisit}</div>
                  <div className="text-xs text-gray-400">Revisit</div>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats.coverage}</div>
                  <div className="text-xs text-gray-400">Coverage</div>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl font-bold text-green-400 mb-1">{stats.analyses}</div>
                  <div className="text-xs text-gray-400">Analyses</div>
                </div>
              </div>
            </div>

            {/* Right: 3D Earth Globe */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-[#1a2332]/80 to-[#0f1419]/80 backdrop-blur-xl border border-green-500/20 rounded-3xl p-2 shadow-2xl">
                <div className="w-full h-[500px] rounded-2xl overflow-hidden">
                  <HomeGlobe />
                </div>
                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md border border-green-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-semibold">ROTATING 3D GLOBE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Comprehensive Environmental Monitoring</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Advanced satellite analysis tools for vegetation health, change detection, and land cover classification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/analyze" className="group">
            <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-green-900/20 hover:-translate-y-2 h-full">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-green-500/20">
                <Satellite className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold mb-3 text-xl">Satellite Imagery</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Access real Sentinel-2 satellite data from ESA Copernicus with 10-meter resolution
              </p>
              <div className="flex items-center text-green-400 text-sm font-semibold group-hover:gap-2 transition-all">
                <span>Explore</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>

          <Link to="/analyze" className="group">
            <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-green-900/20 hover:-translate-y-2 h-full">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-green-500/20">
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold mb-3 text-xl">NDVI Analysis</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Calculate vegetation indices using NIR and Red bands for health assessment
              </p>
              <div className="flex items-center text-green-400 text-sm font-semibold group-hover:gap-2 transition-all">
                <span>Analyze</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>

          <Link to="/analyze" className="group">
            <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-green-900/20 hover:-translate-y-2 h-full">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-green-500/20">
                <Layers className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold mb-3 text-xl">Change Detection</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                AI-powered change segmentation identifies vegetation loss and gain patterns
              </p>
              <div className="flex items-center text-green-400 text-sm font-semibold group-hover:gap-2 transition-all">
                <span>Detect</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>

          <Link to="/reports" className="group">
            <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-green-900/20 hover:-translate-y-2 h-full">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-green-500/20">
                <FileText className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold mb-3 text-xl">Analysis Reports</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                Generate comprehensive reports with visualizations and insights for stakeholders
              </p>
              <div className="flex items-center text-green-400 text-sm font-semibold group-hover:gap-2 transition-all">
                <span>View Reports</span>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="bg-gradient-to-br from-green-900/10 via-emerald-900/10 to-transparent border border-green-500/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-12 text-center">Simple Workflow</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-green-900/40">
                1
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-gray-800 rounded-2xl p-6 pt-10 h-full">
                <MapPin className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="font-bold text-white text-lg mb-3">Select Location</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Search any location worldwide by city, coordinates, or postal code
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-green-900/40">
                2
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-gray-800 rounded-2xl p-6 pt-10 h-full">
                <Activity className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="font-bold text-white text-lg mb-3">Choose Dates</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Select date range for temporal comparison and change analysis
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-green-900/40">
                3
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-gray-800 rounded-2xl p-6 pt-10 h-full">
                <BarChart3 className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="font-bold text-white text-lg mb-3">Run Analysis</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  AI-powered NDVI calculation, change detection, and land cover classification
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-green-900/40">
                4
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm border border-gray-800 rounded-2xl p-6 pt-10 h-full">
                <FileText className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="font-bold text-white text-lg mb-3">Get Results</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Download comprehensive reports with data visualizations and insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl p-12 text-center">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          <div className="relative">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Monitor Environmental Changes?</h2>
            <p className="text-green-50 text-lg mb-8 max-w-2xl mx-auto">
              Start analyzing vegetation health and environmental changes anywhere on Earth
            </p>
            <Link
              to="/analyze"
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-green-600 font-bold rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
            >
              <Zap className="w-6 h-6" />
              <span>Start Free Analysis</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
