# EcoSense AI

**Environmental Monitoring Platform Using Satellite Imagery and Spectral Analysis**

A web-based platform that analyzes vegetation health, detects environmental changes, and classifies land cover patterns using Sentinel-2 satellite imagery and spectral analysis techniques.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10-blue)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)

🌍 **[Live Demo](#)** · 📚 **[Documentation](docs/)** · 🐛 **[Report Bug](../../issues)**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Methodology](#methodology)
- [Limitations](#limitations)
- [Browser Verification Checklist](#browser-verification-checklist)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

EcoSense AI is an environmental monitoring platform designed for researchers, environmental scientists, and policy makers. It provides easy access to satellite-based environmental analysis without requiring GIS expertise or specialized software.

### Key Objectives

1. **Democratize Satellite Data Access**: Make Sentinel-2 satellite imagery accessible through a user-friendly web interface
2. **Vegetation Health Monitoring**: Calculate and visualize NDVI (Normalized Difference Vegetation Index) for vegetation health assessment
3. **Change Detection**: Identify environmental changes between two time periods
4. **Land Cover Classification**: Classify land cover into 7 categories using spectral analysis
5. **AI-Powered Insights**: Provide environmental insights through an AI assistant

### Primary Use Cases

- 🌲 **Forest Monitoring**: Track deforestation and forest health
- 🌾 **Agricultural Analysis**: Monitor crop health and vegetation stress
- 🏙️ **Urban Planning**: Analyze urban expansion and green space changes
- 🌊 **Water Resource Management**: Detect water bodies and monitor droughts
- 🔥 **Disaster Assessment**: Assess environmental impact of fires, floods, or droughts

---

## ✨ Features

### Implemented Features ✅

#### 1. Interactive 3D Globe (Cesium)
- **Explore Page**: Navigate a 3D globe with satellite base layer
- **Location Search**: Search by city/place name (powered by OpenStreetMap Nominatim)
- **Visual Selection**: Click-to-select locations on the globe
- **Smooth Animations**: Camera flyto animations for location changes

#### 2. Satellite Data Access
- **Provider**: Copernicus Sentinel Hub API (official EU provider)
- **Satellite**: Sentinel-2 Level-2A (atmospherically corrected)
- **Resolution**: 10m/pixel (visible/NIR), 20m/pixel (SWIR)
- **Search Capability**: Date range query, cloud cover filtering (< 20%)
- **Product Display**: Acquisition date, cloud cover percentage, product ID
- **True Color Images**: RGB composite visualization (B04-R, B03-G, B02-B)

#### 3. NDVI Analysis
- **Formula**: NDVI = (NIR - Red) / (NIR + Red) = (B08 - B04) / (B08 + B04)
- **Color Visualization**: Red (-1.0) → Yellow (0.0) → Green (+1.0)
- **Statistics**:
  - Mean NDVI value
  - Min/Max NDVI range
  - Vegetation coverage % (pixels with NDVI > 0.3)
  - Health assessment (Poor / Moderate / Healthy)
- **Output Formats**: PNG overlay for visualization, GeoTIFF raster for GIS analysis

#### 4. Temporal Change Detection
- **Method**: NDVI comparison between two dates
- **Visualization**: 5-color change map
  - 🔴 **Significant Loss** (Δ < -0.2) - Possible deforestation, drought, fire damage
  - 🟠 **Moderate Loss** (-0.2 ≤ Δ < -0.1) - Vegetation stress, seasonal decline
  - ⚪ **Stable** (-0.1 ≤ Δ ≤ +0.1) - No significant change
  - 🟢 **Moderate Gain** (+0.1 < Δ ≤ +0.2) - Vegetation recovery, crop growth
  - 🟢 **Significant Gain** (Δ > +0.2) - Afforestation, seasonal green-up
- **Statistics**: Pixel counts and percentages per change category
- **Export**: PNG overlay, GeoTIFF with continuous change values

#### 5. Land Cover Classification
- **Method**: Rule-based spectral classification (NOT a trained ML model)
- **Classes** (7 total):
  1. 💙 **Water** - High NDWI, low NIR
  2. 🌲 **Dense Vegetation** - NDVI > 0.6
  3. 🌿 **Moderate Vegetation** - NDVI 0.3-0.6
  4. 🌾 **Sparse Vegetation** - NDVI 0.15-0.3
  5. 🟫 **Bare Soil** - Low NDVI, moderate SWIR
  6. 🏘️ **Built-up Area** - High NDBI (Built-up Index)
  7. 🪨 **Barren Land** - Very low NDVI or high brightness
- **Spectral Indices Used**: NDVI, NDWI (water), NDBI (built-up), Brightness
- **Statistics**: Pixel count, percentage, estimated area (m²) per class
- **Accuracy**: 60-75% typical (rule-based heuristics, not trained model)
- **Export**: Classification map PNG, GeoTIFF with class IDs

#### 6. AI Assistant (Optional)
- **Integration**: Ollama API (local LLM)
- **Model**: Qwen2.5:3b (3 billion parameters)
- **Capabilities**:
  - Answer environmental questions
  - Interpret NDVI and land cover results
  - Explain satellite imagery concepts
  - Suggest mitigation strategies
- **Context-Aware**: Receives location, NDVI data, land cover statistics
- **Fallback**: Graceful degradation if Ollama not available

### Not Implemented ⚠️

- ❌ Trained deep learning models (U-Net, Random Forest, etc.)
- ❌ Individual tree or building counting (resolution too low)
- ❌ Species-level vegetation classification
- ❌ Temporal trend analysis (> 2 dates)
- ❌ SAR data integration (Sentinel-1)
- ❌ User authentication and data persistence
- ❌ Report generation (PDF export)
- ❌ Mobile application

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Library**: Tailwind CSS 3
- **3D Visualization**: Cesium.js 1.108 + Resium 1.18
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router DOM 6

### Backend API
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Language**: TypeScript 5
- **HTTP Client**: Axios
- **Security**: Helmet, CORS
- **Logging**: Morgan

### ML Service
- **Language**: Python 3.10+
- **Framework**: FastAPI 0.109
- **Server**: Uvicorn
- **Geospatial**: Rasterio 1.3, GDAL
- **Scientific**: NumPy 1.26, SciPy 1.11, scikit-image 0.22
- **Image Processing**: Pillow 10.2, Matplotlib 3.8

### External APIs
- **Satellite Data**: Copernicus Sentinel Hub API
- **Geocoding**: OpenStreetMap Nominatim
- **AI (Optional)**: Ollama API (local)

### Development Tools
- **Package Managers**: npm, pip
- **Linting**: ESLint, Prettier (frontend)
- **Testing**: Jest (future), Pytest (future)
- **Version Control**: Git

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
│                   (React + Cesium UI)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Location Search                                  │    │
│  │  • 3D Globe Navigation                             │    │
│  │  • Satellite Product Selection                     │    │
│  │  • Analysis Results Display (4 tabs)               │    │
│  │  • AI Chat Interface                               │    │
│  └─────────────┬──────────────────────────────────────┘    │
└────────────────┼───────────────────────────────────────────┘
                 │
                 │ REST API (JSON)
                 │
    ┌────────────▼─────────────┐
    │   Backend API Gateway    │
    │   Node.js + Express      │
    │   Port: 5000             │
    │                          │
    │  Routes:                 │
    │  • /api/v1/locations     │
    │  • /api/v1/satellite     │
    │  • /api/v1/ndvi          │
    │  • /api/v1/landcover     │
    │  • /api/v1/assistant     │
    │  • /overlays (static)    │
    └─┬──────────────────────┬─┘
      │                      │
      │ HTTPS                │ HTTP
      │                      │
┌─────▼──────────────┐  ┌───▼──────────────────┐
│  Sentinel Hub API  │  │  ML Service          │
│  (Copernicus)      │  │  Python + FastAPI    │
│                    │  │  Port: 8000          │
│  • Catalog Search  │  │                      │
│  • Band Fetching   │  │  • NDVI Calculation  │
│  • RGB Composites  │  │  • Change Detection  │
│  • GeoTIFF Output  │  │  • Classification    │
└────────────────────┘  │  • PNG Generation    │
                        │  • GeoTIFF Export    │
                        └──────────────────────┘
```

### Data Flow: Complete Analysis

1. **User Input**: Select location (e.g., "Mumbai, Maharashtra")
2. **Geocoding**: Backend → Nominatim → Coordinates + Bounding Box
3. **Satellite Search**: Backend → Sentinel Hub Catalog → Available Products
4. **User Selection**: Choose 2+ products for comparison
5. **Analysis Trigger**: Frontend sends 4 parallel API requests:
   - **RGB Images**: Backend → Sentinel Hub (B04, B03, B02)
   - **NDVI Comparison**: Backend → Sentinel Hub (6 bands) → ML Service
   - **Land Cover**: Backend → Sentinel Hub (6 bands) → ML Service
   - **AI Insights**: Backend → Ollama (optional)
6. **Results Display**: Frontend renders 4 tabs with images, maps, statistics

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+**: [Download](https://nodejs.org/en/download/)
2. **Python 3.10+**: [Download](https://www.python.org/downloads/)
3. **Git**: [Download](https://git-scm.com/downloads)
4. **Copernicus Account**: [Register](https://dataspace.copernicus.eu/) (free)
5. **Ollama** (optional): [Download](https://ollama.com/) for AI assistant

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ecosense-ai.git
cd ecosense-ai
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env and set:
# - COPERNICUS_CLIENT_ID (from Sentinel Hub)
# - COPERNICUS_CLIENT_SECRET (from Sentinel Hub)
# - OLLAMA_BASE_URL (if using Ollama, default: http://localhost:11434)
# - LLM_PROVIDER (fallback | ollama)
```

**Get Sentinel Hub Credentials:**
1. Register at https://dataspace.copernicus.eu/
2. Go to https://shapps.dataspace.copernicus.eu/dashboard/
3. Create OAuth Client (select "S2" - Sentinel-2)
4. Copy Client ID and Client Secret to `.env`

#### 3. ML Service Setup

```bash
cd ../ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Defaults are fine for local development
```

#### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment (optional, uses defaults)
cp .env.example .env
# Defaults point to localhost:5000 and localhost:8000
```

#### 5. Ollama Setup (Optional)

```bash
# Install Ollama (https://ollama.com/)

# Pull Qwen2.5:3b model
ollama pull qwen2.5:3b

# Start Ollama server
ollama serve  # Runs on http://localhost:11434
```

### Running Locally

You need **three terminal windows**:

#### Terminal 1: Backend API

```bash
cd backend
npm run dev
```
Expected: `🚀 EcoSense AI Backend running on http://localhost:5000`

#### Terminal 2: ML Service

```bash
cd ml-service
# Activate venv first (see Installation step 3)
python main.py
```
Expected: `INFO: Uvicorn running on http://0.0.0.0:8000`

#### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```
Expected: `➜ Local: http://localhost:3000/`

#### Terminal 4 (Optional): Ollama

```bash
ollama serve
```
Expected: `Listening on http://127.0.0.1:11434`

### Verification

1. **Health Checks**:
   ```bash
   curl http://localhost:5000/health  # Backend
   curl http://localhost:8000/health  # ML Service
   ```

2. **Browser Test**:
   - Open http://localhost:3000
   - Check "System Health" panel shows ✓ for both services
   - Navigate to Explore page (3D globe should load)
   - Navigate to Analyze page (location search should work)

3. **Build Test**:
   ```bash
   cd frontend && npm run build  # Should complete without errors
   cd ../backend && npm run build  # Should complete without errors
   ```

---

## 🌐 Deployment

### Render.com Deployment

This project includes a `render.yaml` blueprint for one-click deployment to Render.com.

#### Prerequisites

1. **Render Account**: [Sign up](https://render.com/) (free tier available)
2. **GitHub Repository**: Push code to GitHub
3. **Sentinel Hub Credentials**: Client ID and Secret

#### Deployment Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete EcoSense AI implementation"
   git push origin main
   ```

2. **Create New Blueprint** on Render:
   - Go to https://dashboard.render.com/blueprints
   - Click "New Blueprint Instance"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically

3. **Configure Environment Variables** (in Render dashboard):

   **Frontend** (ecosense-frontend):
   ```
   VITE_API_BASE_URL=https://ecosense-backend.onrender.com
   VITE_ML_SERVICE_URL=https://ecosense-ml-service.onrender.com
   VITE_CESIUM_ION_TOKEN=  # Optional, leave empty
   ```

   **Backend** (ecosense-backend):
   ```
   NODE_ENV=production
   PORT=5000
   COPERNICUS_CLIENT_ID=<your_sentinel_hub_client_id>
   COPERNICUS_CLIENT_SECRET=<your_sentinel_hub_client_secret>
   ALLOWED_ORIGINS=https://ecosense-frontend.onrender.com
   LLM_PROVIDER=fallback
   OLLAMA_BASE_URL=  # Leave empty
   ```

   **ML Service** (ecosense-ml-service):
   ```
   ENVIRONMENT=production
   PORT=8000
   MODEL_DEVICE=cpu
   ALLOWED_ORIGINS=https://ecosense-backend.onrender.com,https://ecosense-frontend.onrender.com
   ```

4. **Deploy**: Click "Create New Resources"

5. **Wait**: Initial build takes 5-10 minutes

6. **Verify**:
   - Frontend: https://ecosense-frontend.onrender.com
   - Backend Health: https://ecosense-backend.onrender.com/health
   - ML Service Health: https://ecosense-ml-service.onrender.com/health

#### Estimated Cost (Render.com)

- **Free Tier**: $0/month
  - Frontend (Static Site): Free
  - Backend (Web Service): Free (750 hrs/month, spins down after 15 min inactivity)
  - ML Service (Web Service): Free (750 hrs/month, spins down after 15 min inactivity)
  - ⚠️ **Cold Start**: 30-60 second delay when services wake up

- **Starter Tier**: ~$21/month
  - Frontend: Free
  - Backend: $7/month (always on)
  - ML Service: $7/month (always on)
  - ⚠️ **Cold Start**: None

### Alternative Deployment Options

- **Vercel** (Frontend only): https://vercel.com/
- **Railway** (All services): https://railway.app/
- **Fly.io** (Docker containers): https://fly.io/
- **AWS / GCP / Azure** (Full control, more complex)

---

## 📊 Methodology

### NDVI Calculation

**Formula**:
```
NDVI = (NIR - Red) / (NIR + Red)
     = (Band 08 - Band 04) / (Band 08 + Band 04)
```

**Scientific Basis**:
- Healthy vegetation reflects strongly in NIR (~70-90%) and absorbs red (~5-10%)
- NDVI ranges from -1.0 (water) to +1.0 (dense vegetation)
- Threshold for vegetation: NDVI > 0.3

**Implementation**:
- Uses Sentinel-2 Band 04 (Red: 665nm) and Band 08 (NIR: 842nm)
- Safe division handles zero/invalid values
- Output: 32-bit float GeoTIFF and color-mapped PNG

### Change Detection

**Method**: Temporal NDVI difference

**Formula**:
```
NDVI_change = NDVI_later - NDVI_earlier
```

**Interpretation**:
- **Positive values**: Vegetation increase (growth, recovery, greening)
- **Negative values**: Vegetation decrease (loss, stress, browning)
- **Near zero**: Stable vegetation

**Significance Thresholds**:
- |Δ| < 0.1: Noise / seasonal variation
- 0.1 ≤ |Δ| < 0.2: Moderate change (attention)
- |Δ| ≥ 0.2: Significant change (investigation required)

### Land Cover Classification

**⚠️ Important**: This is NOT a trained machine learning model.

**Method**: Rule-based spectral decision tree

**Spectral Indices**:
```
NDVI = (NIR - Red) / (NIR + Red)                  # Vegetation
NDWI = (Green - NIR) / (Green + NIR)              # Water
NDBI = (SWIR1 - NIR) / (SWIR1 + NIR)              # Built-up
Brightness = (Blue + Green + Red + NIR) / 4        # Overall reflectance
```

**Classification Rules** (simplified):
1. If NDWI > 0.3 and NIR < 0.2 → **Water**
2. Else if NDVI > 0.6 and NIR > 0.3 → **Dense Vegetation**
3. Else if NDVI > 0.3 → **Moderate Vegetation**
4. Else if NDVI > 0.15 → **Sparse Vegetation**
5. Else if NDBI > 0.1 and brightness moderate → **Built-up Area**
6. Else if NDVI > -0.1 and SWIR1 > 0.1 → **Bare Soil**
7. Else → **Barren Land**

**Accuracy**:
- Overall: 60-75% (rule-based heuristics)
- Water: 85-95% (high confidence)
- Dense Vegetation: 75-85% (good)
- Built-up: 60-75% (moderate, limited by 10m resolution)
- Other classes: 50-70% (variable)

**For Production ML**:
- Train U-Net or Random Forest on labeled dataset (5,000+ samples)
- Use multi-temporal features (3+ dates)
- Add post-processing (CRF, morphological filtering)
- Target: >85% overall accuracy

---

## ⚠️ Limitations

### Resolution Constraints

**Sentinel-2 Resolution**: 10m/pixel (visible/NIR), 20m/pixel (SWIR)

**Cannot Detect**:
- Individual trees < 20m crown diameter
- Buildings < 30m² (3x3 pixels)
- Narrow roads < 10m width
- Individual cars, people, small objects

**Minimum Detectable Feature**: ~30m (3 pixels)

### Classification Accuracy

**Rule-Based Limitations**:
- No trained model → fixed thresholds
- Cannot learn from data or adapt to regions
- Prone to false positives (rocks → buildings, agriculture → trees)
- No species-level classification

**Recommended Use**:
- Exploratory analysis
- Change detection
- Vegetation health monitoring
- **Not suitable for**: Legal decisions, precise land surveys, carbon credits

### Temporal Resolution

**Sentinel-2 Revisit Time**: 5 days (combining A + B satellites)

**Limitations**:
- Cannot detect sub-weekly changes
- Analysis limited to available clear imagery
- Gaps during cloudy periods

### Cloud Cover

**Optical Sensors**: Cannot see through clouds

**Mitigation**:
- Filter products by cloud cover (< 20%)
- Select alternate dates if target date is cloudy
- Use longer time windows (30-90 days) to find clear imagery

### Geographic Coverage

**Sentinel-2 Coverage**: Global land areas

**Limitations**:
- No polar regions (> 82° latitude)
- Best results: 30°-60° latitude (optimal sun angle)
- Tropical regions: Frequent cloud cover

### Processing Time

**Current Performance**:
- Complete analysis: 30-60 seconds
- Satellite search: 6-10 seconds
- NDVI calculation: 2-3 seconds
- Land cover: 3-6 seconds

**Bottleneck**: Sentinel Hub API latency (network + processing)

**Not Suitable For**: Real-time emergency response

### Storage

**Generated Files**:
- PNG overlays: 100-500 KB each
- GeoTIFF rasters: 1-5 MB each
- No automatic cleanup (manual deletion required)

**Recommendation**: Implement cleanup cron job for production

---

## ✅ Browser Verification Checklist

**⚠️ Visual verification not yet completed. Browser testing required.**

### Manual Testing Required

Please complete the following browser tests to verify the application works correctly:

1. **Page Load & Layout**
   - [ ] Page loads without errors (check console F12)
   - [ ] **Single vertical scrollbar** (not double)
   - [ ] All UI elements visible and aligned

2. **Location Search**
   - [ ] Search "Mumbai" returns suggestions
   - [ ] Selecting location flies globe to coordinates
   - [ ] No console errors

3. **Satellite Product Search**
   - [ ] Search returns products (6-10 seconds)
   - [ ] Products show date, cloud cover %, product ID
   - [ ] At least 2 products available for comparison

4. **Run Analysis**
   - [ ] "Run Analysis" button triggers workflow (30-60 seconds)
   - [ ] Success message appears
   - [ ] 4 tabs appear below

5. **Tab 1: Satellite Comparison**
   - [ ] Two RGB satellite images display side-by-side
   - [ ] Images are in color (not broken)
   - [ ] Dates labeled correctly

6. **Tab 2: NDVI Analysis**
   - [ ] NDVI map displays with green gradient
   - [ ] Legend shows scale (-1.0 to 1.0)
   - [ ] Statistics show mean/min/max NDVI

7. **Tab 3: Change Segmentation**
   - [ ] **Change detection image displays** (5 colors)
   - [ ] Colors visible: red, orange, gray, light green, dark green
   - [ ] Debug panel shows image URL and load status
   - [ ] Retry button works if image fails to load

8. **Tab 4: Land Cover Classification**
   - [ ] "Run Land Cover Classification" button works
   - [ ] Original RGB image displays on left
   - [ ] Classification map displays on right (7 colors)
   - [ ] Legend shows 7 classes with colors
   - [ ] Statistics table shows pixel counts and percentages
   - [ ] **Percentages sum to 100.0%**
   - [ ] Label clearly states: "Rule-Based Spectral Classification"

9. **Scrollbar Check**
   - [ ] **Exactly ONE vertical scrollbar** (on browser window)
   - [ ] No double scrollbars

10. **Performance**
    - [ ] Page load < 2 seconds
    - [ ] Satellite search 6-10 seconds
    - [ ] Complete analysis 30-60 seconds

### Known Issues

Document any issues found:
- Issue 1: [Description]
- Issue 2: [Description]

---

## 📁 Project Structure

```
ecosense-ai/
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── CesiumGlobe.tsx
│   │   │   ├── LocationSearchBar.tsx
│   │   │   ├── SatelliteAnalysisPanel.tsx
│   │   │   ├── NDVIAnalysisTab.tsx
│   │   │   ├── ChangeSegmentationTab.tsx
│   │   │   ├── LandCoverTab.tsx
│   │   │   ├── SatelliteComparisonTab.tsx
│   │   │   └── AssistantPanel.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Explore.tsx
│   │   │   ├── MainDashboard.tsx  # Analyze page
│   │   │   └── Dashboard.tsx      # AI Assistant page
│   │   ├── services/
│   │   │   └── api.ts             # API client
│   │   ├── types/
│   │   │   ├── ndvi.ts
│   │   │   └── assistant.ts
│   │   ├── styles/
│   │   │   └── index.css          # Tailwind CSS
│   │   ├── App.tsx                # Router setup
│   │   └── main.tsx               # Entry point
│   ├── public/                    # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/                      # Node.js Backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.ts
│   │   │   ├── locations.ts
│   │   │   ├── satellite.ts
│   │   │   ├── ndvi.ts
│   │   │   ├── landcover.ts
│   │   │   └── assistant.ts
│   │   ├── services/
│   │   │   ├── geocoding.ts      # Nominatim client
│   │   │   ├── sentinelHub.ts    # Sentinel Hub client
│   │   │   ├── satellite.ts      # Satellite search
│   │   │   ├── assistantService.ts
│   │   │   └── ollamaService.ts
│   │   ├── types/
│   │   │   └── assistant.ts
│   │   └── index.ts               # Express app
│   ├── overlays/                  # Generated images (gitignored)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── ml-service/                   # Python ML Service
│   ├── app/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── ndvi.py
│   │   │   └── land_cover.py
│   │   ├── services/
│   │   │   ├── ndvi.py            # NDVI calculation
│   │   │   ├── land_cover.py      # Classification
│   │   │   ├── png_overlay.py     # PNG generation
│   │   │   └── raster_export.py   # GeoTIFF export
│   │   └── main.py
│   ├── main.py                    # Entry point
│   ├── requirements.txt
│   └── .env.example
│
├── docs/                          # Documentation
│   └── [Various project reports]
│
├── .gitignore
├── README.md                      # This file
└── render.yaml                    # Render deployment config
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test locally** (all 3 services)
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to your fork**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

### Code Style

- **TypeScript**: Follow existing code style, use ESLint
- **Python**: Follow PEP 8, use type hints
- **React**: Functional components, TypeScript props
- **Comments**: Explain "why", not "what"

### Testing

Before submitting:
- [ ] Build completes without errors (frontend + backend)
- [ ] Health checks pass (backend + ml-service)
- [ ] Browser verification checklist passed
- [ ] No console errors

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Copernicus Programme**: For free Sentinel-2 satellite imagery
- **European Space Agency (ESA)**: For operating Sentinel satellites
- **Sentinel Hub**: For providing API access to satellite data
- **OpenStreetMap**: For Nominatim geocoding service
- **Cesium**: For 3D globe visualization library
- **Ollama**: For local LLM integration
- **Open Source Community**: For all the amazing libraries used

---

## 📞 Support

For issues, questions, or feedback:

- 🐛 **Bug Reports**: [Open an issue](../../issues)
- 💡 **Feature Requests**: [Open an issue](../../issues)
- 📧 **Email**: [your.email@example.com]
- 💬 **Discussions**: [GitHub Discussions](../../discussions)

---

## 📊 Project Status

**Current Version**: 1.0.0
**Status**: ✅ Development Complete - ⏳ Browser Verification Pending
**Last Updated**: November 4, 2026

### Completed ✅
- [x] Full-stack implementation (React + Node.js + Python)
- [x] Sentinel-2 satellite data integration
- [x] NDVI analysis and visualization
- [x] Temporal change detection
- [x] Rule-based land cover classification (7 classes)
- [x] AI assistant integration (Ollama)
- [x] Interactive 3D globe (Cesium)
- [x] Zero TypeScript build errors
- [x] Deployment configuration (Render.com)

### In Progress ⏳
- [ ] Browser verification (visual testing required)
- [ ] Live deployment to Render.com
- [ ] Demo video creation

### Future Enhancements 🔮
- [ ] Trained ML models (U-Net, Random Forest)
- [ ] Higher resolution imagery (Planet Labs, Maxar)
- [ ] Time-series analysis (> 2 dates)
- [ ] SAR data integration (Sentinel-1)
- [ ] User authentication and data persistence
- [ ] Report generation (PDF export)
- [ ] Mobile application (React Native)

---

**EcoSense AI** - Monitor Today, Preserve Tomorrow 🌍🌿

*Built with ❤️ for environmental monitoring and conservation*
