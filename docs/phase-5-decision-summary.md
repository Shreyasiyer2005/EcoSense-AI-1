# Phase 5 Model Selection Decision Summary

**Date:** 2026-10-24
**Investigation:** Steps 1-2 Complete
**Status:** ⚠️ DECISION REQUIRED

---

## Investigation Results

### Step 1: TorchGeo FTW Model Inspection
**Finding:** ❌ **INCOMPATIBLE**
- Model designed for agricultural field boundary detection
- Classes: field interior, field boundary, background
- Does NOT classify vegetation/forest types
- **Mismatch with Phase 5 requirements**

### Step 2: ForTy Model Availability
**Finding:** ❌ **NOT AVAILABLE**
- Model weights NOT publicly released
- Requires proprietary AlphaEarth embeddings (not accessible)
- Only pre-computed 2020 map available via Earth Engine
- Cannot run local inference

---

## Current Situation

**Phase 5 Goal:** Local U-Net land cover segmentation for environmental monitoring

**Models Investigated:**
1. ❌ SENTINEL2_3CLASS_FTW (TorchGeo) → Field boundaries, not land cover
2. ❌ ForTy MTSViT (Google DeepMind) → Weights not released
3. ✅ Anton-Geo Sentinel-2 Land Cover → **VIABLE ALTERNATIVE**

---

## Recommended Solution: Anton-Geo Model

### Model Details
- **Repository:** https://github.com/Anton-Geo/sentinel2-land-cover-segmentation
- **Architecture:** TorchGeo ResNet50 encoder (SENTINEL2_ALL_DINO) + custom U-Net decoder
- **Performance:** 68.15% mIoU on test set (LandCoverNet Europe)
- **Input:** 13 Sentinel-2 bands (B01-B12, B8A) at 10m resolution
- **Classes:** 10 land cover classes (vegetation, water, built-up, bare soil, etc.)
- **Status:** ✅ Complete working code with pretrained weights

### Advantages
✅ Actual downloadable model (not just dataset)
✅ Runs locally on CPU (₹0 cost)
✅ Open source with documented training
✅ Proven performance on real Sentinel-2 data
✅ Compatible with Phase 4 infrastructure
✅ No proprietary dependencies

### Trade-offs
⚠️ Generic land cover classes (not forest-specific like ForTy)
⚠️ 10 classes instead of 6 forest typology classes
⚠️ Trained on European data (may need fine-tuning for India)
⚠️ No primary/planted forest distinction

---

## Phase 4 Modifications Required

**Current State:**
```
Bands: [B04, B08]  // 2 bands
```

**Required for Anton-Geo:**
```
Bands: [B01-B12, B8A]  // 13 bands
Modification: Update sentinelHub.ts band configuration (~3-5 hours)
```

**Sentinel Hub Compatibility:** ✅ Verified - API supports 13-band retrieval

---

## Implementation Estimate

**Total Effort:** ~25-35 hours

**Breakdown:**
- Anton-Geo model verification (Step 3): 3-5 hours
- Phase 4 modification (13-band retrieval): 3-5 hours
- Model integration with ml-service: 8-12 hours
- Testing and validation: 5-8 hours
- Frontend updates: 5-8 hours

**Dependencies:** PyTorch + TorchGeo (~3GB disk space)

**Cost:** ₹0 (all free, open source)

---

## Alternative Options (Not Recommended)

### Option A: Use Earth Engine ForTy Map Query
- ⚠️ Violates "local inference" requirement
- ⚠️ Commercial use restrictions
- ⚠️ Requires internet connection
- ⚠️ Fixed 2020 baseline only

### Option B: Train Custom Model from Scratch
- ⚠️ Requires labeled training data (not available)
- ⚠️ 60-80 hour effort
- ⚠️ No performance guarantee

### Option C: Simplify to Binary Forest/Non-Forest
- ⚠️ Reduces Phase 5 scope significantly
- ⚠️ Less ecologically meaningful

---

## Decision Required

**Question:** Approve Anton-Geo land cover segmentation model as Phase 5 implementation?

**If YES:**
- Proceed to Step 3: Verify Anton-Geo model weights availability
- Test model loading and inference on sample data
- Begin Phase 4 modification for 13-band retrieval

**If NO:**
- Specify alternative requirements or acceptable trade-offs
- Consider reducing Phase 5 scope (binary classification, NDVI-only, etc.)
- Re-evaluate project goals and constraints

---

## Key Documents

1. **Phase 5 Step 1 Report:** `docs/phase-5-step1-model-inspection.md`
   - FTW model specifications
   - Class mapping mismatch discovery
   - ForTy dataset details

2. **Phase 5 Step 2 Report:** `docs/phase-5-step2-forty-verification.md`
   - ForTy availability investigation
   - Earth Engine analysis
   - Anton-Geo alternative evaluation

3. **Phase 4 Verification:** `backend/verify-phase4.ts` + `docs/phase-4-final-report.md`
   - Current 2-band retrieval working
   - NDVI calculation verified
   - Coorg test area established

---

**Status:** Waiting for approval to proceed with Anton-Geo model
**Blocker:** Cannot install dependencies (~3GB) until model selection approved
**Next Step:** Step 3 - Verify Anton-Geo model weights and test inference
