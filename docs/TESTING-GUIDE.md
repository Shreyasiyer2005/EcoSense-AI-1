# EcoSense AI - Testing Guide

**Date:** November 3, 2026
**Status:** All services running, ready for browser testing

## Prerequisites

✅ **Backend Service:** http://localhost:5000 (Running)
✅ **ML Service:** http://localhost:8000 (Running)
✅ **Frontend:** http://localhost:3000 (Running)

## Test Scenarios

### 1. Satellite Image Comparison (Deliverable 1)

**Objective:** Verify side-by-side true-color satellite imagery from two acquisition dates

**Steps:**
1. Open browser: http://localhost:3000/dashboard
2. Select location: **Madikeri** (or any Coorg location)
3. Click **"Historical Comparison"** tab
4. System should display:
   - Date picker for two acquisition dates
   - Two side-by-side satellite images (true-color Sentinel-2)
   - Image metadata (acquisition date, cloud cover)

**Expected Results:**
- ✅ Two distinct satellite images appear
- ✅ Images correspond to selected dates
- ✅ Real Sentinel-2 data (not mock/fabricated)
- ✅ Images load within 5-10 seconds

**What to Screenshot:**
- Side-by-side satellite comparison view
- Date selectors and metadata

---

### 2. NDVI Change Detection Overlay (Deliverable 2)

**Objective:** Verify colored NDVI change overlay appears on Cesium globe

**Steps:**
1. Continue from Test 1 (after selecting two dates)
2. Wait for NDVI comparison to complete
3. Cesium globe should automatically:
   - Zoom to the region
   - Display colored overlay on terrain

**Expected Results:**
- ✅ Overlay contains **12,208 colored pixels** (verified via analyze-png.py)
  - Red pixels: Vegetation loss
  - Orange pixels: Moderate decline
  - Gray pixels: No significant change
  - Light green: Moderate improvement
  - Dark green: Significant improvement
- ✅ Camera automatically flies to overlay region
- ✅ Overlay opacity at 100% (PNG has alpha channel at 230/255)
- ✅ No console errors about `tileWidth` or `accessToken`

**Technical Verification:**
```bash
# Verify overlay file exists
ls backend/overlays/ndvi_compare_*_ndvi_change.png

# Analyze pixel distribution (already confirmed)
python backend/analyze-png.py backend/overlays/[FILENAME].png
```

**What to Screenshot:**
- Cesium globe with colored NDVI overlay visible
- Zoom level showing terrain detail
- Legend showing color meanings

---

### 3. Environmental Assessment (Deliverable 4)

**Objective:** Verify environmental health score and recommendations display

**Steps:**
1. After NDVI comparison completes
2. Scroll to **"Environmental Summary"** section
3. Review displayed information

**Expected Results:**
- ✅ **Health Score:** 0-100 (based on NDVI mean values)
- ✅ **Risk Level:** Low/Moderate/High/Critical
- ✅ **Recommendations:** 3-5 actionable insights
  - Examples: "Monitor water stress in vegetation"
  - "Investigate areas with significant vegetation loss"
  - "Consider soil conservation measures"
- ✅ **Trend Analysis:** Comparison of NDVI means between dates

**Data Source:**
- Calculated from actual NDVI raster statistics
- NOT fabricated or hardcoded

**What to Screenshot:**
- Environmental Summary card
- Health score and risk level
- Recommendations list

---

### 4. Multi-Location Testing (Deliverable 5)

**Objective:** Verify system works across all Coorg locations

**Test Locations:**
1. **Madikeri** (12.4244°N, 75.7382°E)
2. **Kushalnagar** (12.4569°N, 75.9583°E)
3. **Virajpet** (12.1961°N, 75.8050°E)
4. **Gonikoppal** (12.3667°N, 76.0000°E)
5. **Somwarpet** (12.5958°N, 75.8472°E)

**Expected Results:**
- ✅ All locations load successfully
- ✅ Satellite imagery retrieved for each region
- ✅ NDVI change detection processes correctly
- ✅ Environmental assessments reflect regional differences

**What to Screenshot:**
- Dashboard with location selector dropdown
- One successful test per location (5 total)

---

### 5. U-Net Land-Cover Segmentation (Deliverable 3)

**Status:** ⚠️ **INCOMPLETE**

**Reason:** Requires trained model (15-19 hours including:
- Dataset curation: 2-3 hours
- Model training: 10-12 hours (GPU required)
- Validation/tuning: 3-4 hours

**Current State:**
- ML service architecture ready (`ml_service/src/main.py`)
- U-Net model skeleton defined
- `/api/ml/segment` endpoint exists (untrained)
- No trained weights available
- No fabricated results (maintaining integrity)

**What Cannot Be Tested:**
- Land cover classification (urban/forest/water/agriculture)
- Segmentation mask overlay
- Accuracy metrics

**Documentation:**
- See `docs/FINAL-IMPLEMENTATION-STATUS.md` Section 5 for detailed explanation

---

## Error Troubleshooting

### Common Issues

**1. Overlay not visible on Cesium globe**
- ✅ **Fixed:** Changed from blob URLs to data URLs
- ✅ **Fixed:** Increased opacity from 75% to 100%
- ✅ **Fixed:** Added automatic camera.flyTo()
- Verify: Check browser console for errors

**2. Backend returns 500 error for satellite images**
- Check `.env` file has valid Sentinel Hub credentials
- Verify `SENTINEL_HUB_CLIENT_ID` and `SENTINEL_HUB_CLIENT_SECRET`
- Test access token: `curl http://localhost:5000/api/v1/satellite/token`

**3. NDVI comparison fails**
- Verify both acquisition dates have valid Sentinel-2 data
- Check cloud cover < 30% for selected dates
- Review backend logs: `cd backend; npm run dev`

**4. Frontend not loading**
- Verify port 3000 is not blocked by firewall
- Check Vite dev server: `cd frontend; npm run dev`
- Open browser dev tools → Network tab

---

## Performance Expectations

| Operation | Expected Time |
|-----------|---------------|
| Satellite image retrieval | 3-5 seconds |
| NDVI calculation | 2-3 seconds |
| NDVI change overlay generation | 5-8 seconds |
| Environmental assessment | <1 second |
| Total comparison workflow | 10-15 seconds |

---

## Test Results Checklist

### Deliverable 1: Satellite Comparison ✅
- [ ] Two satellite images appear side-by-side
- [ ] Images correspond to selected dates
- [ ] Real Sentinel-2 data (verified via metadata)
- [ ] No mock/fabricated imagery

### Deliverable 2: NDVI Change Overlay ✅
- [ ] Colored overlay visible on Cesium globe
- [ ] 12,208+ colored pixels confirmed
- [ ] Camera auto-zooms to region
- [ ] No console errors

### Deliverable 3: U-Net Segmentation ⚠️
- [ ] **INCOMPLETE** - Requires model training (15-19 hours)
- [ ] Documented as incomplete (not fabricated)

### Deliverable 4: Environmental Assessment ✅
- [ ] Health score displays (0-100)
- [ ] Risk level shown (Low/Moderate/High/Critical)
- [ ] 3-5 recommendations provided
- [ ] Based on real NDVI statistics

### Deliverable 5: Dashboard Integration ✅
- [ ] All 5 Coorg locations accessible
- [ ] Dashboard UI responsive
- [ ] Historical comparison workflow functional
- [ ] Environmental summary displays correctly

---

## Post-Testing Actions

1. **Screenshot Collection:**
   - Save screenshots for each test scenario
   - Organize in `docs/screenshots/` folder

2. **Performance Logging:**
   - Record actual load times
   - Note any bottlenecks

3. **Bug Reporting:**
   - Document any visual artifacts
   - Report API errors with stack traces

4. **Final Documentation:**
   - Update `FINAL-COMPLETION-SUMMARY.md`
   - Create user guide if needed

---

## System Architecture Verification

**Confirmed Working:**
- ✅ Backend TypeScript compilation (`backend/tsconfig.json`)
- ✅ Frontend Vite production build
- ✅ Sentinel Hub API integration
- ✅ NDVI raster processing (Python + rasterio)
- ✅ PNG overlay generation
- ✅ Cesium SingleTileImageryProvider integration

**Technical Stack:**
- Backend: Node.js + Express + TypeScript
- ML Service: Python + FastAPI + rasterio
- Frontend: React + TypeScript + Vite + CesiumJS
- Satellite Data: Sentinel Hub Process API

---

## Contact & Support

**Project:** EcoSense AI Environmental Monitoring
**Version:** 1.0.0
**Last Updated:** November 3, 2026

**Services:**
- Backend API: http://localhost:5000/api/v1
- ML Service: http://localhost:8000
- Frontend: http://localhost:3000

**Documentation:**
- See `docs/FINAL-IMPLEMENTATION-STATUS.md` for complete status
- See `docs/cesium-overlay-invisible-fix-report.md` for overlay fix details
- See `docs/FINAL-PROJECT-STATUS.md` for project overview

---

**Ready to Test:** Open http://localhost:3000/dashboard and follow Test Scenarios 1-4 above.
