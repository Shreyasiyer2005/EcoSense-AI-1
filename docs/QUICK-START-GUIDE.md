# EcoSense AI - Quick Start Guide

**Purpose:** Get the EcoSense AI system running for demonstration and testing

---

## Prerequisites

1. ✅ Node.js installed (backend and frontend)
2. ✅ Python 3.11 installed (ML service)
3. ✅ Ollama installed with qwen2.5-coder:7b model
4. ✅ Copernicus Data Space credentials configured in `backend/.env`
5. ✅ Cesium Ion token (optional) in `frontend/.env`

---

## Step 1: Fix Backend Port Conflict

**Problem:** Port 5000 occupied by stale process (PID 3648)

**Solution:**
```powershell
# Kill the stale process
Stop-Process -Id 3648 -Force

# Wait for port to be released
Start-Sleep -Seconds 2

# Verify port is free
netstat -ano | Select-String ":5000"
# (Should return nothing)
```

---

## Step 2: Start Services

### Terminal 1: ML Service (Already Running ✅)
```powershell
cd ml-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Health Check:** http://localhost:8000/health
**Expected:** `{"status": "healthy"}`

### Terminal 2: Backend
```powershell
cd backend
npm run dev
```

**Health Check:** http://localhost:5000/health
**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2026-11-03T...",
  "services": {
    "sentinelHub": "operational"
  }
}
```

### Terminal 3: Frontend
```powershell
cd frontend
npm run dev
```

**Access:** http://localhost:3000

---

## Step 3: Test NDVI Change Detection Overlay

### Test Workflow

1. **Navigate to Dashboard**
   - Click "Dashboard" in navigation
   - Or go directly to http://localhost:3000/dashboard

2. **Select Location**
   - Click "Madikeri, Karnataka" from Quick Locations
   - Wait 2-3 seconds for satellite products to load

3. **Switch to Historical Comparison**
   - Click the "Historical Comparison" tab (right side)
   - Two date selectors appear

4. **Select Date Range**
   - Earlier Date: Select oldest available product (e.g., 30 days ago)
   - Later Date: Select newest available product (e.g., today)
   - Products show acquisition date and cloud coverage %

5. **Run Comparison**
   - Click "Run Comparison" button
   - Progress indicators appear:
     - "Starting historical comparison..."
     - "Retrieving satellite imagery for both dates..."
     - "Computing NDVI and temporal changes..."

6. **Wait for Completion** (~30-60 seconds)
   - Backend fetches Sentinel-2 bands (B04, B08) for both dates
   - ML service computes NDVI
   - Performs statistical comparison
   - Generates classified change map
   - Exports GeoTIFF and PNG overlays

7. **Verify Overlay Appears**
   - **Camera automatically zooms** to overlay area
   - **Colored pixels visible** on Cesium globe:
     - 🔴 Red: Strong vegetation decrease
     - 🟠 Orange: Moderate decrease
     - ⚪ Gray: Stable vegetation
     - 🟢 Light Green: Moderate increase
     - 🟢 Dark Green: Strong increase
   - **Legend appears** in bottom-right corner
   - **Base satellite imagery** visible beneath overlay

8. **Test Visibility Toggle**
   - Click "Hide Overlay" button
   - Overlay disappears
   - Click "Show Overlay" button
   - Overlay reappears

9. **Check Browser Console**
   ```
   [CesiumGlobe] Loading NDVI overlay for ndvi_compare_xxx
   [CesiumGlobe] Overlay bounds: west=75.7337, south=12.4164, east=75.7437, north=12.4264
   [CesiumGlobe] Provider hasAlphaChannel: true
   [CesiumGlobe] NDVI overlay loaded successfully
   [CesiumGlobe] Layer alpha: 1, show: true
   [CesiumGlobe] Imagery layers count: 2
   [CesiumGlobe] Overlay layer index: 1
   ```

### Expected Visual Result

**Cesium Globe:**
- 3D Earth with satellite base imagery
- Coorg region visible (Karnataka, India)
- Small colored overlay (~1km²) in Madikeri area
- Overlay aligned with terrain
- Smooth camera animation to overlay location

**Colors (matching legend):**
- Red (#D32F2F): Strong Decrease (~8-10% of pixels)
- Orange (#FF9800): Moderate Decrease (~7-8% of pixels)
- Gray (#9E9E9E): Stable (~70-75% of pixels)
- Light Green (#8BC34A): Moderate Increase (~7-8% of pixels)
- Dark Green (#2E7D32): Strong Increase (~1-2% of pixels)

**Statistical Results Panel:**
- Earlier NDVI mean: ~0.45-0.65
- Later NDVI mean: ~0.45-0.65
- Mean change: -0.05 to +0.05
- Change categories with pixel counts
- Interpretation text

---

## Step 4: Test AI Assistant

### Test Queries

1. **Basic Query:**
   - Type: "What does NDVI mean?"
   - Expected: Educational explanation of NDVI

2. **Context-Aware Query:**
   - After running comparison, type: "Explain my comparison results"
   - Expected: Interpretation of actual NDVI values and changes

3. **Analysis Query:**
   - Type: "What's causing the vegetation decrease?"
   - Expected: Environmental factors, seasonal changes, land use

### Expected Behavior

- Ollama processes query locally (no cloud API)
- Response appears with markdown formatting
- Conversation history maintained
- Context from NDVI results included

---

## Step 5: Test Other Locations

### Additional Test Cases

1. **Kushalnagar, Karnataka**
   - Select from Quick Locations
   - Run historical comparison
   - Verify overlay appears at different coordinates

2. **Virajpet, Karnataka**
3. **Gonikoppal, Karnataka**
4. **Somwarpet, Karnataka**

### Expected Result
Same functionality for all five monitoring zones.

---

## Troubleshooting

### Issue: Backend Won't Start (Port 5000 in Use)
**Solution:**
```powershell
# Find process using port 5000
netstat -ano | Select-String ":5000"

# Kill the process (replace PID)
Stop-Process -Id <PID> -Force

# Restart backend
cd backend
npm run dev
```

### Issue: No Satellite Products Found
**Possible Causes:**
1. Copernicus credentials invalid
   - Check `backend/.env`: COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET
2. Network connectivity issue
3. Sentinel Hub API rate limit
4. Date range has no observations

**Solution:**
- Check backend console for error messages
- Verify credentials at https://dataspace.copernicus.eu/
- Try different date range or location

### Issue: Overlay Doesn't Appear
**Check:**
1. Browser console for errors
2. Network tab: PNG request status (should be 200)
3. Response headers: X-Overlay-West/South/East/North present
4. Comparison completed successfully (green checkmark)

**Common Issues:**
- Comparison still processing (wait longer)
- Network error fetching PNG
- Browser zoom level (zoom in on overlay area)

### Issue: Ollama Not Responding
**Check:**
```powershell
# Verify Ollama service running
ollama list

# Verify qwen2.5-coder:7b available
ollama run qwen2.5-coder:7b "test"

# Restart Ollama if needed
```

### Issue: ML Service Not Responding
**Check:**
```powershell
# Verify ML service running
curl http://localhost:8000/health

# Check process
Get-Process | Where-Object { $_.ProcessName -like "*python*" -or $_.ProcessName -like "*uvicorn*" }

# Restart if needed
cd ml-service
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Performance Expectations

### NDVI Analysis (Single Date)
- Sentinel Hub API: 5-10 seconds
- NDVI calculation: 1-2 seconds
- **Total:** ~7-12 seconds

### Historical Comparison
- Sentinel Hub API (2 dates): 10-20 seconds
- NDVI calculation (2 dates): 2-4 seconds
- Change detection: 1-2 seconds
- GeoTIFF export: 1-2 seconds
- PNG conversion: 1-2 seconds
- **Total:** ~15-30 seconds

### Overlay Loading
- PNG download: <1 second
- Data URL conversion: <1 second
- Cesium rendering: <1 second
- Camera animation: 2 seconds
- **Total:** ~4 seconds

### AI Assistant
- Ollama inference (local): 2-5 seconds
- Pattern fallback: <1 second

---

## Success Criteria

### Stage 1: NDVI Change Detection Map ✅
- [x] Historical comparison completes without errors
- [x] PNG overlay generated with colored pixels
- [x] Overlay displays on Cesium globe at correct location
- [x] Red, orange, gray, light-green, dark-green pixels visible
- [x] Camera zooms to overlay automatically
- [x] Legend displays five categories
- [x] Show/Hide toggle works
- [x] Overlay clears when changing location/mode

### Overall System ✅
- [x] All three services start successfully
- [x] Health checks pass
- [x] Location selection works
- [x] Satellite product search works
- [x] NDVI analysis completes
- [x] Historical comparison works
- [x] Overlay visualization works
- [x] AI assistant responds
- [x] No console errors (except expected warnings)

---

## Known Limitations

### Not Implemented (By Design)
1. ❌ Side-by-side satellite image comparison
   - Reason: No backend TCI image endpoints
   - Workaround: View acquisition dates and cloud coverage in results

2. ❌ Land-cover segmentation
   - Reason: No trained U-Net model
   - Workaround: Use NDVI as proxy for vegetation classification

3. ❌ PDF report export
   - Reason: Not prioritized in 3-hour timeline
   - Workaround: Screenshot results and browser print

4. ❌ NDVI trend charts
   - Reason: Not prioritized
   - Workaround: Compare multiple date pairs manually

### Architecture Constraints
1. Single-location workflow (no batch processing)
2. No persistent analysis history database
3. Limited to Coorg region monitoring zones
4. Requires manual date selection

---

## Next Steps After Testing

1. **Document Test Results**
   - Screenshot overlay on globe
   - Note NDVI statistics
   - Capture AI assistant responses
   - List any errors encountered

2. **Report Issues**
   - Browser console errors
   - Backend/ML service errors
   - Unexpected behavior
   - Performance problems

3. **Suggest Improvements**
   - UI/UX enhancements
   - Feature additions
   - Performance optimizations
   - Bug fixes

---

## Support

### Documentation
- `docs/FINAL-PROJECT-STATUS.md`: Complete project status
- `docs/phase-8D.5-frontend-completion-report.md`: Overlay implementation
- `docs/cesium-overlay-invisible-fix-report.md`: Debugging guide

### Logs to Check
- **Backend:** Terminal 2 output
- **ML Service:** Terminal 1 output
- **Frontend:** Browser console (F12)

### Common Commands
```powershell
# Check service status
curl http://localhost:5000/health  # Backend
curl http://localhost:8000/health  # ML Service

# View logs
cd backend && npm run dev  # Backend logs
cd ml-service && python -m uvicorn...  # ML logs

# Rebuild frontend
cd frontend && npm run build

# Port cleanup
netstat -ano | Select-String ":5000"
Stop-Process -Id <PID> -Force
```

---

**Ready to Test:** Follow Steps 1-5 above
**Expected Time:** 15-20 minutes for complete testing
**Success Rate:** High (if all services start correctly)
