# EcoSense AI

**AI-Based Environmental Change Detection Using Satellite Data and U-Net Deep Learning**

An intelligent environmental monitoring platform that analyzes vegetation changes, land cover patterns, and environmental stress using satellite imagery and deep learning.

---

## 🎯 Project Overview

**Primary Study Area:** Coorg (Kodagu), Karnataka, India (Western Ghats)  
**Academic Program:** Information Science and Engineering Major Project  
**Technology Stack:** React + TypeScript, Node.js + Express, Python + FastAPI, PostgreSQL + PostGIS

### Key Features

- 🗺️ **Location-Based Analysis:** Support for PIN code, place name, coordinates, and polygon inputs
- 🛰️ **Satellite Data Integration:** Real imagery from Copernicus Sentinel-2
- 🌿 **NDVI Calculation:** Vegetation health monitoring and change detection
- 🤖 **U-Net Classification:** Land cover segmentation with deep learning
- 📊 **Environmental Indicators:** Evidence-based stress assessment
- 💬 **AI Assistant:** Intelligent environmental insights (LLM-powered or deterministic fallback)
- 📈 **Interactive Dashboard:** Premium dark-green interface with maps, charts, and visualizations

---

## 📋 Prerequisites

### Required Software

1. **Node.js 18+**
   - Download: https://nodejs.org/en/download/
   - Verify: `node --version` (should show v18.x or higher)

2. **Python 3.10+**
   - Download: https://www.python.org/downloads/
   - Verify: `python --version` (should show 3.10.x or higher)
   - ⚠️ During installation, check "Add Python to PATH"

3. **PostgreSQL 14+ with PostGIS**
   - Download: https://www.postgresql.org/download/windows/
   - PostGIS: https://postgis.net/windows_downloads/
   - See detailed installation guide in `database/README.md`

4. **Git**
   - Download: https://git-scm.com/download/win
   - Verify: `git --version`

### Optional Tools

- **VS Code:** https://code.visualstudio.com/
- **pgAdmin 4:** Included with PostgreSQL installation (GUI for database management)

---

## 🚀 Installation & Setup

### Step 1: Clone/Navigate to Project

```powershell
cd C:\Users\shrey\OneDrive\Desktop\EcoSenseAI_Final
```

### Step 2: Setup Backend (Node.js + Express)

```powershell
cd backend

# Install dependencies
npm install

# Create environment file
Copy-Item .env.example .env

# Edit .env and set your values:
# - DATABASE_URL (PostgreSQL connection string)
# - COPERNICUS_CLIENT_ID (from https://dataspace.copernicus.eu/)
# - LLM_PROVIDER (fallback | openai | anthropic)
```

### Step 3: Setup Frontend (React + Vite)

```powershell
cd ..\frontend

# Install dependencies
npm install

# Create environment file (optional, uses defaults)
Copy-Item .env.example .env
```

### Step 4: Setup ML Service (Python + FastAPI)

```powershell
cd ..\ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create environment file
Copy-Item .env.example .env
```

### Step 5: Setup Database (PostgreSQL)

See detailed instructions in `database/README.md`

**Quick steps:**

```powershell
# Create database (run in psql)
psql -U postgres
CREATE DATABASE ecosense_ai;
\q

# Initialize schema
cd ..\database
psql -U postgres -d ecosense_ai -f init.sql

# Verify PostGIS
psql -U postgres -d ecosense_ai -c "SELECT PostGIS_Version();"
```

**Configure backend connection:**

Edit `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ecosense_ai
```

---

## ▶️ Running the Application

You need **three separate terminal windows** in VS Code (or PowerShell):

### Terminal 1: Backend API

```powershell
cd backend
npm run dev
```

Expected output:
```
🚀 EcoSense AI Backend running on http://localhost:5000
📊 Environment: development
🔍 Health check: http://localhost:5000/health
```

### Terminal 2: ML Service

```powershell
cd ml-service
.\venv\Scripts\Activate.ps1
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Terminal 3: Frontend

```powershell
cd frontend
npm run dev
```

Expected output:
```
VITE v5.0.8  ready in 523 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

---

## ✅ Verification

### 1. Health Check Endpoints

Open PowerShell and test:

```powershell
# Backend health
curl http://localhost:5000/health

# ML Service health
curl http://localhost:8000/health
```

### 2. Browser Test

Open browser and navigate to:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/health
- **ML Service:** http://localhost:8000/health

The frontend should display a "System Health Check" panel showing connection status for both services.

### 3. Build Test

```powershell
# Test frontend production build
cd frontend
npm run build

# Test backend TypeScript compilation
cd ..\backend
npm run build
```

Both should complete without errors.

---

## 📁 Project Structure

```
EcoSenseAI_Final/
├── frontend/                 # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API integration (api.ts)
│   │   ├── types/           # TypeScript types
│   │   └── styles/          # Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── controllers/     # Business logic
│   │   ├── services/        # External service integration
│   │   ├── models/          # Data models
│   │   └── middleware/      # Express middleware
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── ml-service/              # Python + FastAPI
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # NDVI, U-Net, geospatial processing
│   │   ├── models/          # ML model definitions
│   │   └── utils/           # Helper functions
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── database/                # PostgreSQL + PostGIS
│   ├── init.sql             # Schema initialization
│   ├── migrations/          # Database migrations
│   └── README.md            # Database setup guide
│
├── docs/                    # Project documentation
│   └── phase-0-specification.md
│
├── .gitignore
└── README.md                # This file
```

---

## 🔧 Development Commands

### Backend

```powershell
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled production build
npm test             # Run tests (Phase 10)
```

### Frontend

```powershell
cd frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### ML Service

```powershell
cd ml-service
.\venv\Scripts\Activate.ps1
python main.py       # Start FastAPI server
pytest               # Run tests (Phase 10)
```

---

## 🌍 Environment Variables

### Backend (.env)

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecosense_ai
COPERNICUS_CLIENT_ID=your_client_id
COPERNICUS_CLIENT_SECRET=your_client_secret
OPENAI_API_KEY=sk-...                    # Optional
ANTHROPIC_API_KEY=...                    # Optional
LLM_PROVIDER=fallback                    # fallback | openai | anthropic
PYTHON_SERVICE_URL=http://localhost:8000
JWT_SECRET=random_secret_key
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_ML_SERVICE_URL=http://localhost:8000
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

### ML Service (.env)

```env
ENVIRONMENT=development
PORT=8000
MODEL_WEIGHTS_PATH=./models/unet_sentinel2_v1.pth
MODEL_DEVICE=cpu                         # cpu | cuda
CACHE_DIR=./data/cache
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

---

## 🔒 Security Notes

- ✅ Never commit `.env` files to Git
- ✅ Use `.env.example` as templates with placeholder values
- ✅ Keep API keys and database passwords secure
- ✅ The `.gitignore` file excludes all sensitive files
- ⚠️ Change `JWT_SECRET` in production
- ⚠️ Use HTTPS in production deployments

---

## 📊 Current Status: Phase 1 Complete

### ✅ Completed

- [x] Project repository structure
- [x] Git initialization with comprehensive .gitignore
- [x] React + Vite + TypeScript frontend with Tailwind CSS
- [x] Node.js + Express + TypeScript backend API
- [x] Python + FastAPI ML service
- [x] PostgreSQL + PostGIS database configuration
- [x] Health check endpoints for all services
- [x] Environment configuration templates
- [x] Development CORS and error handling
- [x] Build scripts and TypeScript compilation
- [x] Comprehensive documentation

### 🚧 Coming Next: Phase 2

- [ ] Location input UI (PIN code, place name, coordinates, polygon)
- [ ] Geocoding integration (Nominatim)
- [ ] Location resolution and validation
- [ ] Interactive map preview (Leaflet)
- [ ] Database persistence for locations
- [ ] Location API endpoints

---

## 🧪 Testing

Phase 1 provides basic health checks. Comprehensive testing will be added in Phase 10.

**Current Tests:**

```powershell
# Health check tests
curl http://localhost:5000/health
curl http://localhost:8000/health

# Build tests
cd frontend; npm run build
cd backend; npm run build
```

---

## 🆘 Troubleshooting

### Port Already in Use

If you see "Port 3000/5000/8000 already in use":

```powershell
# Find process using port
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### PostgreSQL Connection Failed

1. Verify PostgreSQL is running:
   ```powershell
   # Check service status
   Get-Service postgresql*
   
   # If not running, start it
   Start-Service postgresql-x64-14  # Replace with your version
   ```

2. Verify connection string in `backend/.env`
3. Test connection: `psql -U postgres -d ecosense_ai`

### Python Virtual Environment Issues

If `.\venv\Scripts\Activate.ps1` fails with "execution policy" error:

```powershell
# Allow script execution (one-time)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### npm install Fails

```powershell
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
Remove-Item -Recurse node_modules, package-lock.json

# Reinstall
npm install
```

---

## 📚 Additional Resources

- **Phase 0 Specification:** `docs/phase-0-specification.md`
- **Database Setup Guide:** `database/README.md`
- **Copernicus Registration:** https://dataspace.copernicus.eu/
- **PostGIS Documentation:** https://postgis.net/documentation/
- **Vite Documentation:** https://vitejs.dev/
- **FastAPI Documentation:** https://fastapi.tiangolo.com/

---

## 👨‍💻 Development Workflow

1. **Create feature branch:** `git checkout -b feature/location-input`
2. **Make changes and test locally**
3. **Commit with clear messages:** `git commit -m "feat: add PIN code input validation"`
4. **Keep main branch stable**

---

## 🎓 Academic Context

This is a major project for Information Science and Engineering, demonstrating:

- Full-stack web development (React, Node.js, Python)
- Geospatial data processing and visualization
- Machine learning integration (U-Net deep learning)
- Satellite imagery analysis
- RESTful API design
- Database design with spatial extensions
- Scientific methodology and transparent limitations
- Real-world environmental application

**Note:** All features are implemented with scientific responsibility. We distinguish clearly between measured data, calculated indicators, model predictions, and unavailable data. No fabricated results or unsupported claims.

---

## 📄 License

MIT License - Academic Project

---

## 📞 Support

For issues specific to this setup:
1. Check terminal error messages
2. Verify all prerequisites are installed
3. Review `.env.example` files for required configuration
4. Check `database/README.md` for PostgreSQL setup
5. Ensure all three services are running simultaneously

---

**Status:** Phase 1 Foundation Complete ✅  
**Next:** Phase 2 - Location Input & Geocoding ⏳

---

*Generated: October 23, 2026*  
*EcoSense AI - Monitor Today, Preserve Tomorrow* 🌍🌿
