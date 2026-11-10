# Phase 8D.5 Testing Checklist

**Feature:** NDVI Change-Detection Raster Overlay Display on CesiumJS Globe
**Date:** November 3, 2026
**Status:** Ready for Manual Testing

---

## Pre-Test Setup

### Backend Services
- [ ] Ollama running with qwen2.5-coder:7b model loaded
- [ ] Backend dev server running (`cd backend && npm run dev`)
- [ ] Backend health check passes: `http://localhost:3001/health`
- [ ] Sentinel Hub credentials valid in `.env`

### Frontend
- [ ] Frontend dev server running (`cd frontend && npm run dev`)
- [ ] Browser DevTools console open for monitoring
- [ ] Network tab open to verify API calls

### Environment Variables
- [ ] `SENTINEL_HUB_CLIENT_ID` set
- [ ] `SENTINEL_HUB_CLIENT_SECRET` set
- [ ] `OLLAMA_BASE_URL` set (default: http://localhost:11434)

---

## Core Functionality Tests

### 1. Basic Overlay Loading
- [ ] Navigate to Dashboard
- [ ] Select "Central Park, New York" from quick locations
- [ ] Switch to "Historical Comparison" mode
- [ ] Set date range: 30 days ago to today
- [ ] Click "Run Comparison"
- [ ] **Verify:** Loading indicator appears
- [ ] **Verify:** NDVI comparison completes successfully
- [ ] **Verify:** PNG overlay appears on globe
- [ ] **Verify:** Overlay positioned correctly over Central Park area
- [ ] **Verify:** Legend appears in bottom-right corner

### 2. Geographic Accuracy
- [ ] Check overlay bounds match expected location
- [ ] Verify overlay doesn't extend beyond bounding box
- [ ] Zoom in close to verify pixel alignment
- [ ] **Expected:** Overlay covers exact analysis area, no offset or distortion

### 3. Color Mapping Validation
Compare overlay colors to legend:
- [ ] **Red (#D32F2F)**: Strong vegetation decrease visible
- [ ] **Orange (#FF9800)**: Moderate decrease visible
- [ ] **Gray (#9E9E9E)**: Stable areas visible
- [ ] **Light Green (#8BC34A)**: Moderate increase visible
- [ ] **Dark Green (#2E7D32)**: Strong increase visible
- [ ] **Transparent**: No-data areas show base imagery

### 4. Visibility Toggle
- [ ] Click "Hide Overlay" button in legend
- [ ] **Verify:** Overlay disappears from globe
- [ ] **Verify:** Button changes to "Show Overlay"
- [ ] Click "Show Overlay"
- [ ] **Verify:** Overlay reappears
- [ ] **Verify:** Button changes back to "Hide Overlay"

### 5. Opacity Verification
- [ ] **Verify:** Base satellite imagery visible through overlay
- [ ] **Verify:** Overlay colors clearly distinguishable
- [ ] **Expected:** 75% opacity (0.75 alpha)

---

## Edge Cases & Error Handling

### 6. Location Changes
- [ ] With overlay loaded, select different quick location
- [ ] **Verify:** Previous overlay removed
- [ ] **Verify:** Globe moves to new location
- [ ] **Verify:** No overlay displayed until new comparison run
- [ ] **Verify:** No console errors

### 7. Mode Changes
- [ ] Load overlay in Historical Comparison mode
- [ ] Switch to "Current Analysis" mode
- [ ] **Verify:** Overlay removed
- [ ] **Verify:** Legend disappears
- [ ] Switch back to "Historical Comparison"
- [ ] **Verify:** Overlay doesn't reappear (requires new comparison)

### 8. Multiple Comparisons
- [ ] Run first comparison, verify overlay loads
- [ ] Run second comparison with different date range
- [ ] **Verify:** First overlay removed
- [ ] **Verify:** Second overlay loads correctly
- [ ] **Verify:** No memory leaks (check DevTools Memory tab)
- [ ] **Verify:** Only one blob URL active at a time

### 9. Network Errors
- [ ] Stop backend server
- [ ] Attempt to run comparison
- [ ] **Verify:** Error notification appears
- [ ] **Verify:** No overlay displayed
- [ ] **Verify:** Console shows appropriate error message
- [ ] Restart backend, verify recovery

### 10. Invalid Analysis IDs
This should not occur in normal flow, but verify:
- [ ] No 404 errors in console
- [ ] No undefined/null comparison IDs passed to CesiumGlobe

---

## Performance Tests

### 11. Load Times
- [ ] Measure time from "Run Comparison" to overlay display
- [ ] **Expected:** 5-15 seconds for comparison + overlay fetch
- [ ] **Verify:** UI remains responsive during load
- [ ] **Verify:** Loading indicator shows entire time

### 12. Memory Management
- [ ] Open DevTools Memory profiler
- [ ] Take heap snapshot before overlay load
- [ ] Load overlay
- [ ] Remove overlay (change location)
- [ ] Take second heap snapshot
- [ ] **Verify:** Memory released after overlay removal
- [ ] **Verify:** No blob URLs leaked (search for "blob:" in heap)

### 13. Globe Performance
- [ ] Load overlay
- [ ] Pan globe while overlay visible
- [ ] Zoom in/out with overlay
- [ ] Rotate globe
- [ ] **Verify:** Smooth 60fps performance
- [ ] **Verify:** No rendering glitches
- [ ] **Verify:** Overlay stays aligned during navigation

---

## Cross-Browser Tests

### 14. Browser Compatibility
Test in each browser:
- [ ] **Chrome/Edge:** Full functionality
- [ ] **Firefox:** Full functionality
- [ ] **Safari:** Full functionality (if available)

For each browser verify:
- Overlay displays correctly
- Colors match legend
- Visibility toggle works
- No console errors
- Legend renders properly

---

## Integration Tests

### 15. Backend Header Validation
Open Network tab:
- [ ] Run comparison
- [ ] Find request to `/api/v1/ndvi/overlay/{id}/png`
- [ ] **Verify headers present:**
  - `X-Overlay-West: <number>`
  - `X-Overlay-South: <number>`
  - `X-Overlay-East: <number>`
  - `X-Overlay-North: <number>`
- [ ] **Verify:** West < East
- [ ] **Verify:** South < North
- [ ] **Verify:** Values in range [-180, 180] for longitude
- [ ] **Verify:** Values in range [-90, 90] for latitude

### 16. PNG Format Validation
- [ ] Download PNG overlay from network tab
- [ ] Open in image viewer
- [ ] **Verify:** 512x512 pixels
- [ ] **Verify:** PNG format with transparency
- [ ] **Verify:** Colors match five-category scheme
- [ ] **Verify:** No-data pixels are fully transparent

### 17. Multi-Component Integration
- [ ] Verify NDVIAnalysis → Dashboard callback works
- [ ] Verify Dashboard → CesiumGlobe props passed correctly
- [ ] Verify OverlayLegend receives visibility state
- [ ] Check all components re-render appropriately

---

## UI/UX Tests

### 18. Legend Appearance
- [ ] **Verify:** Legend positioned bottom-right
- [ ] **Verify:** White background, semi-transparent
- [ ] **Verify:** Shadow/border visible
- [ ] **Verify:** All five categories listed
- [ ] **Verify:** Color squares match overlay colors
- [ ] **Verify:** Text readable
- [ ] **Verify:** Toggle button accessible

### 19. Responsive Behavior
Test at different viewport sizes:
- [ ] **1920x1080:** Legend doesn't overlap controls
- [ ] **1366x768:** Legend visible and accessible
- [ ] **1024x768:** Legend doesn't clip
- [ ] **Mobile (if supported):** Legend adapts appropriately

### 20. Loading States
- [ ] Loading indicator shows immediately on comparison start
- [ ] Loading text clear and informative
- [ ] Globe remains interactive during load
- [ ] Other controls remain accessible

---

## Regression Tests

### 21. Existing Globe Functionality
Verify Phase 8D.5 doesn't break existing features:
- [ ] Globe initializes correctly
- [ ] Terrain loads
- [ ] Camera navigation works
- [ ] Location search functional
- [ ] Quick locations work
- [ ] Monitoring zones display
- [ ] Current NDVI analysis works
- [ ] Other analysis modes unaffected

### 22. Console Errors
Throughout all tests:
- [ ] No React warnings
- [ ] No TypeScript errors
- [ ] No Cesium rendering errors
- [ ] No CORS errors
- [ ] No 404s or failed requests
- [ ] No memory warnings

---

## Production Build Tests

### 23. Production Build
- [ ] Run `cd frontend && npm run build`
- [ ] **Verify:** Build succeeds with 0 errors
- [ ] **Verify:** Bundle size reasonable (<500KB gzipped)
- [ ] Serve production build: `npm run preview`
- [ ] **Verify:** All functionality works in production mode
- [ ] **Verify:** No console errors specific to production

---

## Documentation Tests

### 24. Code Documentation
- [ ] Review `phase-8D.5-frontend-completion-report.md`
- [ ] Verify all implementation details documented
- [ ] Verify API contracts documented
- [ ] Verify color mappings documented

---

## Sign-Off Checklist

### Required for Production Deployment
- [ ] All Core Functionality Tests passing
- [ ] All Edge Cases handled
- [ ] Performance acceptable (<15s load, smooth rendering)
- [ ] No memory leaks detected
- [ ] Cross-browser compatibility confirmed
- [ ] Backend integration verified
- [ ] No console errors
- [ ] Production build successful
- [ ] Documentation complete

### Known Limitations (Document if Any)
- [ ] None expected

---

## Test Results

**Tester:** _______________
**Date:** _______________
**Environment:** _______________

**Overall Status:** [ ] PASS / [ ] FAIL / [ ] BLOCKED

**Critical Issues Found:**
(None expected)

**Notes:**


---

## Next Steps After Testing

If all tests pass:
1. Tag release: `Phase-8D.5-Complete`
2. Update main README with overlay feature
3. Deploy to production environment
4. Monitor production logs for 24 hours
5. Proceed to Phase 8E (if planned)

If tests fail:
1. Document failures in this checklist
2. Create GitHub issues for bugs
3. Prioritize fixes
4. Re-test after fixes
