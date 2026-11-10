# EcoSense AI Browser Testing Checklist
**Date:** November 4, 2026
**Services Status:** ✅ All Running
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- ML Service: http://localhost:8000

---

## 🧪 TEST 1: Home Page Globe Loading

### Expected Result:
- 3D Earth visible with blue oceans and green/brown continents
- Globe rotates smoothly
- No "Loading Earth..." text stuck on screen

### How to Test:
1. Open http://localhost:3000
2. **Wait 5 seconds** for globe to initialize
3. Open Browser Console (F12 → Console tab)

### What to Report:
- [ ] Globe renders successfully? (YES/NO)
- [ ] Console shows: `[HomeGlobe] ✓ OSM imagery loaded`? (YES/NO)
- [ ] Any errors in console? (Copy here: _____________)
- Screenshot if broken: _____________

---

## 🧪 TEST 2: Analysis Speed Measurement

### Expected Result:
- Analysis completes in **15-20 seconds** (target: <15s)
- Progress indicator shows stages
- Results display with NDVI change map

### How to Test:
1. Enter location: **Gonikoppal** (or use coordinates: 12.1833, 75.9276)
2. Date range: **Jan 20-30, 2025**
3. Click "Run Analysis"
4. **Start timer when you click**
5. Open Console (F12) during analysis

### What to Report:
- [ ] Total time from click to results: _________ seconds
- [ ] Console shows timing logs? Look for:
  ```
  [NDVI Compare] ⏱️ Search: XXXms
  [NDVI Compare] ⏱️ Band Fetch: XXXms
  [NDVI Compare] ⏱️ ML Analysis: XXXms
  [NDVI Compare] ⏱️ TOTAL: XXXms
  ```
- Copy timing logs here: _____________
- [ ] Analysis completed successfully? (YES/NO)
- [ ] Results tab appeared? (YES/NO)

---

## 🧪 TEST 3: Side-by-Side RGB Images

### Expected Result:
- Two satellite images display side-by-side
- Images show actual landscape (not broken icons 🖼️❌)
- Date and cloud cover display below each image

### How to Test:
1. After analysis completes, click **"Change Segmentation"** tab
2. Select **"Side-by-Side"** view mode
3. **Open Network Tab** (F12 → Network tab)
4. Filter by: `rgb-image`
5. Observe image requests

### What to Report:
- [ ] Images display correctly? (YES/NO)
- [ ] Still seeing broken image icons? (YES/NO)

**Network Tab Analysis:**
- [ ] How many `/api/v1/satellite/rgb-image` requests? _________
- [ ] HTTP Status codes (200=success, 500=server error, 504=timeout):
  - Request 1: Status _________ Size _________ Time _________
  - Request 2: Status _________ Size _________ Time _________
- [ ] Response Content-Type: _________ (should be `image/png`)
- [ ] Any errors in Console? Copy here: _____________

**If images fail:**
- Right-click broken image → "Open in new tab"
- Copy the URL: _____________
- What do you see? _____________

---

## 🧪 TEST 4: Swipe Comparison

### Expected Result:
- Split-screen with draggable slider in middle
- Left side shows "before" image
- Right side shows "after" image
- Slider reveals/hides portions of each image

### How to Test:
1. In Change Segmentation tab, select **"Swipe"** view mode
2. Try dragging the slider left/right

### What to Report:
- [ ] Slider appears? (YES/NO)
- [ ] Can drag slider? (YES/NO)
- [ ] Images visible on both sides? (YES/NO)
- [ ] Still seeing black area? (YES/NO)
- Console errors? _____________

---

## 🧪 TEST 5: Overlay Map (Verification)

### Expected Result:
- Five-color NDVI change map displays
- Legend shows: Severe Decline → Severe Improvement
- Map overlays on satellite base layer

### How to Test:
1. In Change Segmentation tab, select **"Overlay"** view mode

### What to Report:
- [ ] Five-color overlay displays? (YES/NO)
- [ ] Colors visible: Red, Orange, Yellow, Light Green, Dark Green? (YES/NO)
- [ ] This was working before - still working now? (YES/NO)

---

## 📸 Screenshots Needed (If Issues Persist)

Please capture:
1. Home page globe (if stuck loading)
2. Side-by-Side view (if images broken)
3. Console errors (if any red messages)
4. Network tab filtered to `rgb-image` (showing status codes)

---

## 🎯 Success Criteria

**All Fixed:**
- ✅ Globe loads imagery within 5 seconds
- ✅ Analysis completes in 15-20 seconds
- ✅ Side-by-Side images display (no broken icons)
- ✅ Swipe slider works with visible images
- ✅ Overlay map still displays correctly

**Still Broken:**
Report which specific test(s) failed with details above.

---

## 🔍 Quick Diagnosis Guide

**If Globe Still Loading:**
→ Console shows `[HomeGlobe] ✓ OSM imagery loaded`?
   - YES but still loading = CSS/render issue
   - NO = imagery setup failed, check for errors

**If RGB Images Broken:**
→ Check Network tab status codes:
   - 200 but broken icon = image format issue
   - 500 = backend Sentinel Hub error
   - 504 = timeout (Sentinel Hub slow/down)
   - Failed to load = CORS or network issue

**If Swipe Black:**
→ Side-by-Side images working?
   - YES = swipe component issue
   - NO = same root cause as Test 3

**If Analysis Slow (>30s):**
→ Check console timing breakdown:
   - Search >10s = Sentinel Hub API slow
   - Band Fetch >10s = image download slow
   - ML Analysis >10s = ML service overloaded
