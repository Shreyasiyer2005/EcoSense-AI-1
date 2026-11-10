# Quick Testing Instructions

## ✅ System Status: All Fixes Applied & Services Running

```
✓ Frontend:  http://localhost:3000
✓ Backend:   http://localhost:5000
✓ ML Service: http://localhost:8000
✓ All code fixes verified in place
✓ Copernicus credentials configured
```

---

## 🚀 Quick Test (5 minutes)

### 1. Open Application
```
http://localhost:3000
```

### 2. Open Browser DevTools
Press **F12** to open:
- **Console tab** (for logs)
- **Network tab** (for request debugging)

### 3. Test Home Globe
- **Look at globe** - Does it show Earth with continents/oceans?
- **Check console** - Do you see `[HomeGlobe] ✓ OSM imagery loaded`?

**Expected:** Globe renders within 5 seconds ✅

---

### 4. Run Analysis
- Location: **Gonikoppal** (or lat: 12.1833, lon: 75.9276)
- Date range: **Jan 20 to Jan 30, 2025**
- Click **"Run Analysis"**
- **Start your timer** ⏱️

**Expected:** Completes in 15-20 seconds ✅

---

### 5. Check Results Tab
After analysis completes:
- Click **"Results"** tab
- Do you see the NDVI Change chart?
- Do metrics appear (Total Area, Vegetation Gain, etc.)?

---

### 6. Check Change Segmentation Tab
Click **"Change Segmentation"** tab.

#### Test A: Side-by-Side View
1. Select **"Side-by-Side"** mode
2. **In Network Tab:** Filter by `rgb-image`
3. Look at the requests:
   - What are the HTTP status codes? (200=good, 500=error, 504=timeout)
   - What are the response sizes?

**Expected:** Two satellite images display ✅

#### Test B: Swipe View
1. Select **"Swipe"** mode
2. Try dragging the slider left/right

**Expected:** Slider reveals two images ✅

#### Test C: Overlay View (verification)
1. Select **"Overlay"** mode
2. Do you see five colors (red/orange/yellow/light green/dark green)?

**Expected:** Five-color map displays ✅

---

## 📊 What to Report

### If Everything Works:
Just reply: **"All tests passed ✅"**

### If Something Fails:
Tell me which test failed and provide:

1. **Console logs** (copy/paste relevant errors)
2. **Network tab** (for broken images):
   - HTTP status codes
   - Response size
   - Time taken
3. **Screenshot** (if visual issue)

---

## 🔍 Common Issues & Solutions

### Globe Still Shows "Loading..."
→ Check console for `[HomeGlobe] ✓ OSM imagery loaded`
- **If present:** Globe exists but not visible (CSS issue)
- **If missing:** Check console for errors

### Images Still Broken (🖼️❌ icons)
→ Check Network tab for `/api/v1/satellite/rgb-image` requests:
- **Status 200:** Image format issue (shouldn't happen)
- **Status 500:** Backend Sentinel Hub error (check backend logs)
- **Status 504:** Timeout - Sentinel Hub slow/down (external issue)
- **Failed to load:** Network/CORS issue

**Most likely:** Sentinel Hub API is temporarily slow or rate-limited.

### Analysis Takes >30 seconds
→ Check console for timing breakdown:
```
[NDVI Compare] ⏱️ Search: XXXms
[NDVI Compare] ⏱️ Band Fetch: XXXms
[NDVI Compare] ⏱️ ML Analysis: XXXms
[NDVI Compare] ⏱️ TOTAL: XXXms
```
- If Search >10s → Sentinel Hub search API slow
- If Band Fetch >10s → Image downloads slow
- If ML Analysis >10s → ML service issue (unlikely)

---

## 🎯 Success Criteria

All these should work:
- [ ] Globe renders within 5 seconds
- [ ] Analysis completes within 15-25 seconds
- [ ] Side-by-side images display (no broken icons)
- [ ] Swipe slider works with visible images
- [ ] Overlay map displays five colors

---

## 📁 Detailed Checklist

For step-by-step detailed instructions, see:
**`BROWSER_TEST_CHECKLIST.md`**

## 📝 Summary of Fixes

For technical details on what was fixed, see:
**Artifact: "Runtime Bug Fixes Summary"**

---

## ⚡ Quick Backend Test (Optional)

To test if backend RGB endpoint responds (without opening browser):
```bash
node test-backend-rgb.js
```

This doesn't verify actual Sentinel Hub data, just that the endpoint is reachable.

---

## 🆘 If You Need Help

Just tell me:
1. Which test failed
2. Error messages from Console
3. HTTP status codes from Network tab

I'll help diagnose the issue!
