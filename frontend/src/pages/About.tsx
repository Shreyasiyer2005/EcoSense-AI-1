/**
 * About Page - EcoSense AI Project Information
 * Comprehensive overview of the environmental monitoring platform
 */

import { Globe, Satellite, TrendingUp, Layers, BarChart3, Database, Zap, Target, Lightbulb, Award } from 'lucide-react';

export default function About() {
  return (
    <div className="bg-gradient-to-br from-[#0a0e14] via-[#0f1419] to-[#141d2a] min-h-screen pt-16">
      <div className="max-w-6xl mx-auto px-8 py-12">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-500/20">
              <Globe className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white">EcoSense AI</h1>
              <p className="text-xl text-green-400 font-semibold mt-1">Intelligent Ecosystem Monitoring Dashboard</p>
            </div>
          </div>
          <p className="text-gray-300 text-lg leading-relaxed">
            An advanced environmental intelligence platform that leverages satellite imagery and AI
            to monitor vegetation health, detect environmental changes, and support sustainable development decisions.
          </p>
        </div>

        {/* Project Overview */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Target className="w-7 h-7 text-green-400" />
              Project Overview
            </h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                EcoSense AI addresses the critical need for accessible, accurate, and timely environmental monitoring
                by providing a comprehensive platform that combines real satellite data from ESA's Sentinel-2 mission
                with AI-powered analysis capabilities.
              </p>
              <p>
                The platform enables researchers, environmental agencies, agricultural professionals, and conservation
                organizations to monitor vegetation health, detect land cover changes, and assess environmental
                degradation anywhere on Earth with 10-meter spatial resolution.
              </p>
            </div>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Lightbulb className="w-7 h-7 text-green-400" />
              Problem Statement
            </h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                Environmental monitoring and vegetation health assessment are crucial for sustainable development,
                but traditional methods face several challenges:
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong className="text-white">Limited Accessibility:</strong> Professional satellite analysis tools require expensive licenses and specialized expertise</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong className="text-white">Complex Workflows:</strong> Processing raw satellite imagery requires technical knowledge of remote sensing and GIS software</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong className="text-white">Time-Consuming Analysis:</strong> Manual analysis of multi-temporal data is labor-intensive and prone to inconsistencies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span><strong className="text-white">Data Fragmentation:</strong> Environmental data is scattered across multiple platforms with inconsistent formats</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Project Objectives */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Target className="w-7 h-7 text-green-400" />
              Project Objectives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-900/10 to-transparent border border-green-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <Satellite className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Democratize Access</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Provide free, user-friendly access to professional-grade satellite imagery and environmental analysis tools
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-900/10 to-transparent border border-green-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Automate Analysis</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Streamline complex workflows with automated NDVI calculation, change detection, and land cover classification
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-900/10 to-transparent border border-green-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Enable Insights</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Deliver actionable environmental intelligence through AI-powered analysis and comprehensive reporting
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-900/10 to-transparent border border-green-800/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Global Coverage</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Support environmental monitoring anywhere on Earth with consistent, high-resolution satellite data
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution & Technology */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Zap className="w-7 h-7 text-green-400" />
              Proposed Solution
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Sentinel-2 Satellite Data</h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  EcoSense AI integrates with the Copernicus Data Space Ecosystem to access Sentinel-2 multi-spectral imagery.
                  Sentinel-2 provides global coverage with:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <li className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">10m</div>
                    <div className="text-sm text-gray-400">Spatial Resolution</div>
                    <div className="text-xs text-gray-500 mt-1">High-precision imagery</div>
                  </li>
                  <li className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">5 days</div>
                    <div className="text-sm text-gray-400">Revisit Frequency</div>
                    <div className="text-xs text-gray-500 mt-1">Regular monitoring updates</div>
                  </li>
                  <li className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">13 bands</div>
                    <div className="text-sm text-gray-400">Spectral Bands</div>
                    <div className="text-xs text-gray-500 mt-1">Multi-spectral analysis</div>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">NDVI & Change Detection</h3>
                <p className="text-gray-300 leading-relaxed mb-3">
                  The Normalized Difference Vegetation Index (NDVI) is calculated using the red (B04) and near-infrared (B08) bands:
                </p>
                <div className="bg-gradient-to-br from-green-900/20 to-transparent border border-green-700/30 rounded-lg p-6 mb-4">
                  <div className="text-center">
                    <code className="text-green-400 text-lg font-mono">NDVI = (NIR - Red) / (NIR + Red)</code>
                  </div>
                  <p className="text-sm text-gray-400 text-center mt-3">
                    Values range from -1 to +1, where higher values indicate healthier vegetation
                  </p>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  Temporal comparison of NDVI between two dates enables automated detection of vegetation changes,
                  including deforestation, urban expansion, agricultural shifts, and natural disaster impacts.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-3">Land Cover Classification</h3>
                <p className="text-gray-300 leading-relaxed">
                  The platform implements <strong className="text-white">rule-based spectral classification</strong> using
                  Sentinel-2 band combinations to identify major land cover types including:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-gradient-to-br from-green-600/10 to-transparent border border-green-700/30 rounded-lg p-3 text-center">
                    <div className="text-lg text-green-400 font-semibold">Forests</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-700/30 rounded-lg p-3 text-center">
                    <div className="text-lg text-blue-400 font-semibold">Water</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-600/10 to-transparent border border-yellow-700/30 rounded-lg p-3 text-center">
                    <div className="text-lg text-yellow-400 font-semibold">Agriculture</div>
                  </div>
                  <div className="bg-gradient-to-br from-gray-600/10 to-transparent border border-gray-700/30 rounded-lg p-3 text-center">
                    <div className="text-lg text-gray-400 font-semibold">Urban</div>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  <strong>Note:</strong> This version uses rule-based spectral classification. Machine learning models
                  for enhanced accuracy are planned for future releases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Database className="w-7 h-7 text-green-400" />
              Technology Stack
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-green-500/30 pb-2">Frontend</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    React 18 + TypeScript
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Vite (Build Tool)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Tailwind CSS
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    CesiumJS (3D Globe)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Resium (React-Cesium)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-green-500/30 pb-2">Backend</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Node.js + Express
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Python + FastAPI
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    TypeScript
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Axios (HTTP Client)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-green-500/30 pb-2">Data & ML</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Sentinel-2 Imagery
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Copernicus Data Space
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    NumPy + Rasterio
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    Ollama (Local LLM)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* System Architecture */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Layers className="w-7 h-7 text-green-400" />
              System Architecture
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-900/20 to-transparent border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 className="text-white font-semibold mb-2">1. User Interface Layer</h4>
                <p className="text-sm text-gray-400">Interactive web dashboard with 3D globe visualization, location search, and analysis controls</p>
              </div>
              <div className="bg-gradient-to-r from-green-900/20 to-transparent border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 className="text-white font-semibold mb-2">2. API Gateway</h4>
                <p className="text-sm text-gray-400">Node.js/Express backend coordinating requests between frontend and processing services</p>
              </div>
              <div className="bg-gradient-to-r from-green-900/20 to-transparent border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 className="text-white font-semibold mb-2">3. Analysis Engine</h4>
                <p className="text-sm text-gray-400">Python/FastAPI service performing NDVI calculations, change detection, and land cover classification</p>
              </div>
              <div className="bg-gradient-to-r from-green-900/20 to-transparent border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 className="text-white font-semibold mb-2">4. Data Integration</h4>
                <p className="text-sm text-gray-400">Sentinel Hub API integration for real-time satellite imagery retrieval and processing</p>
              </div>
              <div className="bg-gradient-to-r from-green-900/20 to-transparent border-l-4 border-green-500 p-4 rounded-r-lg">
                <h4 className="text-white font-semibold mb-2">5. AI Assistant</h4>
                <p className="text-sm text-gray-400">Ollama-powered conversational interface for environmental insights and analysis interpretation</p>
              </div>
            </div>
          </div>
        </section>

        {/* Scope & Limitations */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6">Project Scope & Current Limitations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Included Features</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Real Sentinel-2 satellite imagery access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Automated NDVI calculation and visualization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Temporal change detection (5-class segmentation)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Rule-based land cover classification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Interactive 3D globe with location markers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>AI-powered environmental insights (Ollama)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-1">✓</span>
                    <span>Report generation and persistence</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Current Limitations</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span>localStorage-based persistence (no backend database)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span>Rule-based classification (ML models planned)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span>Cloud cover may affect imagery quality</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span>Analysis limited to Sentinel-2 coverage dates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-1">⚠</span>
                    <span>10m resolution (higher res planned for future)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Future Enhancements */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-[#1a2332] to-[#141d2a] border border-gray-800 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-green-400" />
              Future Enhancements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Deep Learning Models</h4>
                <p className="text-sm text-gray-400">U-Net and ResNet architectures for improved segmentation and classification accuracy</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Multi-Source Integration</h4>
                <p className="text-sm text-gray-400">Combine Sentinel-1 (radar), Landsat, and MODIS data for comprehensive analysis</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Time Series Analysis</h4>
                <p className="text-sm text-gray-400">Automated trend detection and forecasting using historical satellite archives</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Alert System</h4>
                <p className="text-sm text-gray-400">Real-time notifications for deforestation events, fires, and environmental anomalies</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">Mobile Application</h4>
                <p className="text-sm text-gray-400">Native iOS and Android apps for field-based environmental monitoring</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">API Platform</h4>
                <p className="text-sm text-gray-400">Public API for third-party integration and automated analysis workflows</p>
              </div>
            </div>
          </div>
        </section>

        {/* SDG Alignment */}
        <section className="mb-8">
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Award className="w-7 h-7 text-green-400" />
              Sustainable Development Goals
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              EcoSense AI directly supports multiple United Nations Sustainable Development Goals (SDGs):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 13</div>
                <div className="text-white font-semibold mb-1">Climate Action</div>
                <p className="text-sm text-gray-400">Monitor climate impact on ecosystems and support adaptation strategies</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 15</div>
                <div className="text-white font-semibold mb-1">Life on Land</div>
                <p className="text-sm text-gray-400">Combat deforestation, protect biodiversity, and monitor terrestrial ecosystems</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 2</div>
                <div className="text-white font-semibold mb-1">Zero Hunger</div>
                <p className="text-sm text-gray-400">Support sustainable agriculture through crop health monitoring</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 6</div>
                <div className="text-white font-semibold mb-1">Clean Water</div>
                <p className="text-sm text-gray-400">Monitor water bodies and watershed health for sustainable management</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 11</div>
                <div className="text-white font-semibold mb-1">Sustainable Cities</div>
                <p className="text-sm text-gray-400">Track urban expansion and support sustainable urban planning</p>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-green-700/30 rounded-xl p-5">
                <div className="text-2xl font-bold text-green-400 mb-2">SDG 17</div>
                <div className="text-white font-semibold mb-1">Partnerships</div>
                <p className="text-sm text-gray-400">Enable collaboration through accessible environmental data and insights</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-10">
          <h2 className="text-3xl font-bold text-white mb-4">Start Monitoring Your Environment</h2>
          <p className="text-green-50 mb-6 max-w-2xl mx-auto">
            Experience the power of satellite-based environmental intelligence with EcoSense AI
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/analyze"
              className="px-8 py-4 bg-white text-green-600 font-bold rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
            >
              Start Analysis
            </a>
            <a
              href="/explore"
              className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-all"
            >
              Explore Globe
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
