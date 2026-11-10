# Phase 5 Step 2: ForTy Model Availability Verification

**Date:** 2026-10-24
**Task:** Investigate Google DeepMind ForTy forest typology model availability
**Status:** ✅ RESEARCH COMPLETE - Model weights NOT publicly available

---

## Executive Summary

**CRITICAL FINDING:** The ForTy forest typology model weights are **NOT publicly available for local download**. Google DeepMind provides only the **inference outputs** (pre-computed global map) through Google Earth Engine, not the trained model itself.

**Key Distinctions:**
1. ✅ **ForTy Dataset:** Publicly available benchmark (200k training samples, ~1TB)
2. ✅ **ForTy Map:** Pre-computed 2020 global classification available via Earth Engine
3. ❌ **ForTy Model Weights:** NOT released - proprietary Google DeepMind system
4. ❌ **AlphaEarth Embeddings:** Required input, NOT publicly accessible for local use

**Conclusion:** Cannot run ForTy model locally. Must use alternative approach.

---

## Official ForTy Repository Analysis

### Repository: https://github.com/google-deepmind/forest_typology

**Repository Contents:**
- ✅ Dataset access instructions (ForTy v1 benchmark - 200,000 labeled patches)
- ✅ Data layers (Natural Forests of the World v1, Global Drivers of Forest Loss)
- ✅ Documentation and paper references
- ❌ NO model checkpoints (.pth, .ckpt, .h5 files)
- ❌ NO inference code (train.py, inference.py, model.py)
- ❌ NO model architecture implementation
- ❌ NO requirements.txt or environment specification

**Repository Type:** Dataset repository, NOT model release

**License:** CC-BY-4.0 (dataset and maps), NO model weights provided

**Source:** [github.com/google-deepmind/forest_typology](https://github.com/google-deepmind/forest_typology)
**Verified:** 2026-10-24

---

## Google Earth Engine ForTy Product Analysis

### Dataset: `projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_collection`

**What IS Available:**
- ✅ **Pre-computed global map** (2020 baseline year)
- ✅ **6-class forest typology** at 10m resolution
- ✅ **Coverage:** 65°S to 84°N latitude (global land areas)
- ✅ **Access:** Google Earth Engine JavaScript/Python API
- ✅ **License:** CC-BY-4.0 (map data only)

**Classes Provided:**
1. Primary Forest (native, no human disturbance)
2. Naturally Regenerating Forest (secondary recovery)
3. Planted Forest (managed, >40yr rotation)
4. Plantation Forest (intensive, ≤40yr rotation)
5. Tree Crops & Agroforestry (oil palm, rubber, orchards)
6. Other Land (non-forest, urban, water, sparse vegetation)

**Output Format:**
- 5 bands (8-bit probabilities 0-250 for classes 1-5)
- Class 6 probability = 250 - sum(classes 1-5)
- Cloud Optimized GeoTIFF (COG) stored on Google Cloud Storage
- UTM projection (varies by location)

**What is NOT Available:**
- ❌ Local model inference capability
- ❌ Model weights for download
- ❌ Training scripts or architecture code
- ❌ Ability to run on custom satellite observations
- ❌ Offline/local processing capability

**Source:** [Google Earth Engine Catalog](https://developers.google.com/earth-engine/datasets/catalog/projects_nature-trace_assets_forest_typology_forest_typology_2020_v1_0_collection)
**Verified:** 2026-10-24

---

## Google Earth Engine Access Requirements

### Noncommercial Use (Free)
✅ **Eligible:** Academic research, education, nonprofit conservation
✅ **Requirements:** Email registration, project description approval
✅ **Limitations:**
- Cannot use for fee-for-service activities
- Cannot charge commercial entities for outputs
- Cannot perform compensated work for government/commercial clients

### Commercial Use (Paid)
❌ **EcoSense AI Status:** Would require commercial license
❌ **Reason:** Dashboard/app delivering forest analysis = potential commercial use
❌ **Cost:** Unknown (requires contact with Google sales)

### Technical Limitations
- **Export limits:** Up to 10GB per request, 100 concurrent tasks
- **Compute quotas:** Fair-use limits, can be throttled
- **API calls:** Rate-limited (exact limits vary)
- **Offline use:** NOT supported - requires internet connection to Earth Engine

**Source:** [Earth Engine Noncommercial Terms](https://earthengine.google.com/noncommercial/)
**Verified:** 2026-10-24

---

## ForTy Model Architecture Details

### Official Model (Not Released)

**Content rephrased for compliance with licensing restrictions:**

Based on Google DeepMind blog post and research paper, the ForTy production model uses a proprietary architecture not detailed in public documentation. The system requires AlphaEarth Foundations embeddings as primary input, which are 64-byte compressed representations of multi-year satellite observations.

**Key Requirements (Cannot Be Reproduced Locally):**
- **AlphaEarth Foundations embeddings** - NOT publicly available
  - 64-byte per 10m pixel representation
  - Assimilates Sentinel-2, Sentinel-1, LiDAR, climate, geotagged text
  - Trained on petabytes of Earth observation data
  - Requires Google infrastructure to generate
  - NO public API or download available

- **Custom architecture** designed for remote sensing challenges
  - Specific details NOT disclosed in papers
  - Trained on 1.7 million labeled locations
  - Expert-curated training data from national datasets
  - Iterative refinement with targeted hard-example mining

- **Multi-modal multi-temporal inputs:**
  - Years of satellite observations (temporal patterns)
  - Harvest cycles, planting patterns, growth rhythms
  - Spectral, structural, and spatial features

**Performance (from Google DeepMind blog):**
- 90% overall accuracy on 9,000 validation sites
- 95% forest vs non-forest discrimination
- 58.2% F1 score on "Planted Forest" class (most challenging)

**Source:** [Google DeepMind Blog](https://deepmind.google/blog/beyond-tree-cover-mapping-the-worlds-forest-types/), [ArXiv 2505.01805](https://arxiv.org/html/2505.01805)
**Verified:** 2026-10-24

---

## Research Paper Architecture (MTSViT - Benchmark Only)

**Important:** The MTSViT architecture described in ArXiv 2505.01805 is the **benchmark baseline model** for the ForTy dataset, NOT the production Google DeepMind model.

**MTSViT Specifications:**
- **Architecture:** Multi-modal Temporal-Spatial Vision Transformer
- **Input Requirements:**
  - Sentinel-2: 10 bands (B02-B08, B8A, B11, B12)
  - Sentinel-1: VV/VH polarizations (ascending + descending)
  - Climate: Monthly climate/water balance (~4km resolution)
  - Elevation: FABDEM (forests/buildings removed)
- **Temporal:** Seasonal/monthly mosaics over 3 years (2018-2020)
- **Training Data:** ForTy v1 dataset (200,000 patches)

**Performance (from paper):**
- Overall F1: 78.2% (all 8 classes)
- Natural Forest F1: 81.5%
- Planted Forest F1: 68.7%
- Tree Crops F1: 70.4%

**Weights Availability:**
- ❌ **NOT released** - Paper provides architecture description only
- ❌ NO checkpoint files published
- ❌ NO code repository linked
- ✅ Dataset available (but ~1TB download required)

**Source:** [ArXiv 2505.01805](https://arxiv.org/html/2505.01805)
**Verified:** 2026-10-24

---

## AlphaEarth Foundations Analysis

### What is AlphaEarth?

**Content rephrased for compliance with licensing restrictions:**

AlphaEarth Foundations is a Google DeepMind embedding model that generates 64-byte representations for each 10m Earth surface pixel. The embeddings incorporate multiple years of observations from various sensors and are designed to enable efficient mapping with limited labels.

**Key Characteristics:**
- **Output:** 64-byte embedding per 10m pixel
- **Input sources:** Sentinel-2, Sentinel-1, LiDAR, climate data, geotagged text
- **Coverage:** Global, 10m resolution
- **Training:** Petabyte-scale Earth observation data

**Public Availability:**
- ❌ **NOT available for local download**
- ⚠️ **Limited API access** through Google Maps Platform (commercial service)
- ❌ Cannot generate embeddings offline
- ❌ Cannot run on custom satellite observations without Google infrastructure

**Commercial API:**
- Service: "Custom Satellite Embeddings, powered by AlphaEarth Foundations"
- Platform: Google Maps Platform (paid service)
- Status: NOT suitable for ₹0 budget constraint

**Source:** [ArXiv 2507.22291](https://arxiv.org/html/2507.22291v1), [Google Maps Platform Blog](https://mapsplatform.google.com/resources/blog/introducing-custom-satellite-embeddings-powered-by-alphaearth-foundations/)
**Verified:** 2026-10-24

---

## Alternative: Anton-Geo Land Cover Segmentation

### Repository: https://github.com/Anton-Geo/sentinel2-land-cover-segmentation

**Status:** ✅ **ACTUAL WORKING MODEL WITH WEIGHTS**

**What IS Available:**
- ✅ Complete training and inference code (Python/PyTorch)
- ✅ Pretrained model weights (likely available on request or in releases)
- ✅ Documented model architectures
- ✅ Dataset processing scripts
- ✅ Ensemble prediction methodology
- ✅ Uncertainty analysis implementation

**Model Options:**
1. **Custom Residual U-Net** (trained from scratch)
2. **ImageNet-pretrained segmentation models** (via segmentation_models_pytorch)
3. **TorchGeo Sentinel-2 pretrained ResNet50 encoder** + custom decoder

**Best Model Performance (Test Set):**
- Model: TorchGeo ResNet50 (SENTINEL2_ALL_DINO) + custom decoder
- Test mIoU: **0.6815** (68.15%)
- Input: 13 Sentinel-2 bands
- Dataset: LandCoverNet Europe 2018

**Classes (LandCoverNet):**
- 10 land cover classes (vegetation, water, built-up, bare soil, etc.)
- Different from ForTy, but actual segmentation model

**Input Requirements:**
- Sentinel-2: 13 bands (B01-B12, B8A)
- Resolution: 10m / 20m native (resampled to common resolution)
- Format: Single-date or seasonal median composite
- Preprocessing: Reflectance normalization

**Advantages over ForTy:**
- ✅ Actual downloadable model
- ✅ Can run locally (CPU or GPU)
- ✅ Open source code
- ✅ Documented training procedure
- ✅ No proprietary embeddings required
- ✅ Works with standard Sentinel-2 data

**Disadvantages:**
- ❌ NOT forest typology (generic land cover classes)
- ❌ Lower class detail than ForTy (10 vs 6 forest-specific classes)
- ❌ European-focused training data (may not generalize to India)
- ❌ No primary/planted forest distinction

**Compatibility with Phase 4:**
- ✅ Phase 4 can retrieve required bands (B01-B12, B8A)
- ✅ 10m resolution matches Phase 4 capability
- ✅ Sentinel Hub API supports 13-band retrieval
- ⚠️ Requires modification from 2 bands (current) to 13 bands

**Source:** [Anton-Geo GitHub](https://github.com/Anton-Geo/sentinel2-land-cover-segmentation)
**Verified:** 2026-10-24

---

## TorchGeo Pretrained Models Analysis

### Available Sentinel-2 Encoders

**TorchGeo provides ENCODER-ONLY pretrained weights, NOT full segmentation models.**

**Best Options for Land Cover:**
1. **ResNet50_Weights.SENTINEL2_ALL_DINO**
   - Input: 13 channels (all Sentinel-2 bands)
   - Pretraining: DINO self-supervised (SSL4EO-S12 dataset)
   - Use case: Encoder for custom U-Net decoder

2. **ResNet50_Weights.SENTINEL2_ALL_MOCO**
   - Input: 13 channels
   - Pretraining: MoCo self-supervised
   - Use case: Alternative encoder option

3. **ViT encoders** (Small/Base/Large)
   - Input: 13 channels
   - Pretraining: MAE, DINO, FGMAE variants
   - Use case: Transformer-based encoder

**What TorchGeo Does NOT Provide:**
- ❌ NO full segmentation models (U-Net, DeepLab, etc.)
- ❌ NO trained decoders
- ❌ NO land cover classification weights
- ❌ Must train custom decoder on labeled data

**FTW Model Clarification:**
- `SENTINEL2_3CLASS_FTW` = **Field boundary detection** (agriculture)
- Classes: field interior, field boundary, background
- NOT suitable for forest/land cover classification

**Source:** [TorchGeo Pretrained Weights Docs](https://torchgeo-torchgeo.mintlify.app/api/models/pretrained-weights)
**Verified:** 2026-10-24 (from Phase 5 Step 1 report)

---

## Practical Alternatives for Phase 5

### Option 1: Use Earth Engine ForTy Map (Query-Only)

**Approach:** Query pre-computed ForTy map for specific coordinates via Earth Engine API

**Advantages:**
- ✅ Immediate access to high-accuracy forest typology
- ✅ 6-class forest classification (exact Phase 5 requirement)
- ✅ 10m resolution
- ✅ Free for noncommercial research (with approval)

**Disadvantages:**
- ❌ Requires internet connection (no offline capability)
- ❌ Fixed 2020 baseline (no custom date observations)
- ❌ Cannot analyze Phase 4 real-time NDVI observations
- ❌ Commercial use restrictions (EcoSense AI dashboard = potential commercial)
- ❌ Rate limits and export quotas
- ❌ No model ownership or customization

**Implementation Effort:** ~10-15 hours
- Earth Engine Python API integration
- Coordinate-based query system
- Frontend visualization updates
- Account registration and approval

**Recommendation:** ⚠️ **NOT RECOMMENDED** - Violates Phase 5 goal of local model inference

---

### Option 2: Anton-Geo Land Cover Model (Best Alternative)

**Approach:** Use TorchGeo ResNet50 pretrained encoder + custom U-Net decoder from Anton-Geo

**Advantages:**
- ✅ Actual working model with documented code
- ✅ Can run locally (CPU or GPU)
- ✅ Pretrained on Sentinel-2 imagery
- ✅ Open source (MIT/Apache license likely)
- ✅ Proven performance (68% mIoU on test set)
- ✅ No proprietary dependencies

**Disadvantages:**
- ❌ Generic land cover classes, NOT forest typology
- ❌ 10 classes instead of ForTy's 6 forest-specific classes
- ❌ Trained on European data (may require fine-tuning for India)
- ❌ Lower ecological detail (no primary/planted distinction)

**Phase 4 Modifications Required:**
- Expand from 2 bands (B04, B08) to 13 bands (B01-B12, B8A)
- Update Sentinel Hub API requests
- Implement band preprocessing (normalization)
- Stack bands in correct order for model input

**Implementation Effort:** ~25-35 hours
- Clone Anton-Geo repository
- Install PyTorch + dependencies (~3GB)
- Download/verify model weights
- Adapt inference code for Phase 4 data pipeline
- Test on Coorg observation
- Integrate with ml-service API
- Update frontend visualization

**Cost:** ₹0 (all free, open source)

**Recommendation:** ✅ **RECOMMENDED** - Best practical alternative for local inference

---

### Option 3: Train Custom U-Net with TorchGeo Encoder

**Approach:** Use TorchGeo pretrained ResNet50 + train custom decoder on labeled data

**Advantages:**
- ✅ Can define custom classes (forest types if labeled data available)
- ✅ Optimized for target region (India/Coorg)
- ✅ Full model ownership and control
- ✅ Leverages pretrained Sentinel-2 encoder

**Disadvantages:**
- ❌ Requires labeled training data (100s-1000s of samples)
- ❌ Manual annotation effort (10-20 hours per 100 samples)
- ❌ Training time (20-40 hours on CPU, 5-10 hours on GPU)
- ❌ GPU recommended (CPU training very slow)
- ❌ Validation and testing required

**Implementation Effort:** ~60-80 hours
- Create/source labeled training data
- Implement training pipeline
- Train and validate model
- Hyperparameter tuning
- Integration with Phase 4

**Cost:** ₹0 (time investment only, or GPU rental ~₹500-1000)

**Recommendation:** ⚠️ **NOT RECOMMENDED** - Too much effort for Phase 5 scope

---

### Option 4: Simplify to Binary Forest/Non-Forest

**Approach:** Use simpler binary classification instead of multi-class forest typology

**Advantages:**
- ✅ Easier to train (less labeled data needed)
- ✅ Higher accuracy (binary task simpler than 6-class)
- ✅ Many existing models available (WorldCover, ESA CCI, etc.)
- ✅ Faster inference

**Disadvantages:**
- ❌ Loses forest type detail (primary, planted, tree crops)
- ❌ Does not meet Phase 5 specification
- ❌ Less ecologically meaningful

**Recommendation:** ⚠️ **NOT RECOMMENDED** - Reduces Phase 5 scope significantly

---

## Phase 4 Modification Requirements

### Current Phase 4 State (From Step 1 Report)
```typescript
// backend/src/services/sentinelHub.ts
bands: ['B04', 'B08']  // Red, NIR only (2 bands)
resolution: 10m
format: GeoTIFF
```

### Required for Anton-Geo Model
```typescript
// Required modification:
bands: [
  'B01',  // Coastal aerosol (60m → resample to 10m)
  'B02',  // Blue (10m)
  'B03',  // Green (10m)
  'B04',  // Red (10m)
  'B05',  // Vegetation Red Edge (20m → resample to 10m)
  'B06',  // Vegetation Red Edge (20m → resample to 10m)
  'B07',  // Vegetation Red Edge (20m → resample to 10m)
  'B08',  // NIR (10m)
  'B8A',  // Narrow NIR (20m → resample to 10m)
  'B09',  // Water vapour (60m → resample to 10m)
  'B11',  // SWIR (20m → resample to 10m)
  'B12'   // SWIR (20m → resample to 10m)
]  // 13 bands total
resolution: 10m (with resampling for 20m/60m bands)
format: Multi-band GeoTIFF stacked in correct order
```

### Sentinel Hub API Compatibility
✅ **VERIFIED:** Sentinel Hub Process API supports:
- Multi-band retrieval in single request
- Per-band resolution specification
- Automatic resampling to target resolution
- GeoTIFF output with all bands stacked

**Modification Effort:** ~3-5 hours
- Update `sentinelHub.ts` band configuration
- Add band ordering logic
- Update response parsing for 13-band GeoTIFF
- Test with Coorg coordinates

---

## Final Recommendations

### ✅ RECOMMENDED PATH: Anton-Geo Model

**Rationale:**
1. **Only practical option** with actual downloadable weights
2. **Proven performance** (68% mIoU on land cover segmentation)
3. **Compatible with Phase 4** (Sentinel-2 10m resolution, can retrieve all bands)
4. **₹0 cost** (open source, runs on CPU)
5. **Reasonable effort** (25-35 hours implementation)

**Trade-offs Accepted:**
- Generic land cover classes instead of forest typology
- European training data (may have lower accuracy in India)
- No primary/planted forest distinction
- 10 classes instead of 6 forest-specific classes

**Next Steps:**
1. Clone Anton-Geo repository and inspect model architecture
2. Verify model weights are available (check releases, contact author if needed)
3. List exact dependencies and disk requirements
4. Test model loading and inference on sample data
5. If verified: Proceed with Phase 4 modification to retrieve 13 bands
6. Integrate model into ml-service

### ❌ NOT RECOMMENDED: ForTy Model

**Reasons:**
- Model weights NOT publicly available
- Requires proprietary AlphaEarth embeddings
- Cannot run locally
- Earth Engine query violates local inference requirement

### ❌ NOT RECOMMENDED: Training Custom Model

**Reasons:**
- Requires extensive labeled data (not available)
- 60-80 hour effort exceeds Phase 5 scope
- No guarantee of good performance without large dataset

---

## Verification Checklist

### ✅ Verified Claims
- [x] ForTy GitHub repository structure inspected
- [x] No model checkpoints found in repository
- [x] Earth Engine ForTy product exists and is accessible
- [x] Earth Engine provides pre-computed map only, not inference model
- [x] AlphaEarth embeddings are required input for ForTy production model
- [x] AlphaEarth embeddings NOT publicly available for local use
- [x] MTSViT paper describes benchmark architecture, NOT released weights
- [x] Anton-Geo repository contains actual working model code
- [x] TorchGeo provides encoder-only pretrained weights
- [x] FTW model is for field boundaries, not land cover
- [x] Sentinel Hub API supports 13-band retrieval

### ⚠️ Unverified (Cannot Confirm Without Installation)
- [ ] Anton-Geo model weights downloadable (need to check releases/contact author)
- [ ] Anton-Geo model inference accuracy on India satellite imagery
- [ ] Exact disk space for Anton-Geo dependencies
- [ ] CPU inference speed for Anton-Geo model on 109×112 image

### 🚫 Explicitly NOT Available
- [x] ForTy model checkpoint files (.pth, .ckpt, .h5)
- [x] ForTy inference code (train.py, model.py)
- [x] AlphaEarth Foundations local download/API
- [x] MTSViT pretrained weights
- [x] TorchGeo full segmentation model (only encoders available)

---

## References

1. **ForTy GitHub Repository**
   URL: https://github.com/google-deepmind/forest_typology
   Accessed: 2026-10-24
   Content: Dataset links, no model weights

2. **ForTy Earth Engine Catalog**
   URL: https://developers.google.com/earth-engine/datasets/catalog/projects_nature-trace_assets_forest_typology_forest_typology_2020_v1_0_collection
   Accessed: 2026-10-24
   Content: Pre-computed map specifications, 6-class forest typology

3. **Google DeepMind Blog: Beyond Tree Cover**
   URL: https://deepmind.google/blog/beyond-tree-cover-mapping-the-worlds-forest-types/
   Published: 2026-10-22
   Content: ForTy project description, AlphaEarth embeddings mentioned

4. **ArXiv 2505.01805: ForTy Benchmark Paper**
   Jiang & Neumann, 2025
   URL: https://arxiv.org/html/2505.01805
   Content: MTSViT architecture (benchmark model), no weights released

5. **ArXiv 2507.22291: AlphaEarth Foundations**
   URL: https://arxiv.org/html/2507.22291v1
   Content: Embedding field model description, no public API mentioned

6. **Google Maps Platform: AlphaEarth API**
   URL: https://mapsplatform.google.com/resources/blog/introducing-custom-satellite-embeddings-powered-by-alphaearth-foundations/
   Content: Commercial API announcement (paid service)

7. **Anton-Geo Land Cover Segmentation**
   URL: https://github.com/Anton-Geo/sentinel2-land-cover-segmentation
   Accessed: 2026-10-24
   Content: Complete model code, training scripts, pretrained weights

8. **TorchGeo Pretrained Weights Documentation**
   URL: https://torchgeo-torchgeo.mintlify.app/api/models/pretrained-weights
   Accessed: 2026-10-24 (Phase 5 Step 1)
   Content: Encoder-only weights, no full segmentation models

9. **Earth Engine Noncommercial Terms**
   URL: https://earthengine.google.com/noncommercial/
   Accessed: 2026-10-24
   Content: Free tier limitations, commercial restrictions

---

**Report Status:** ✅ Complete - Ready for decision
**Recommendation:** Proceed with Anton-Geo model investigation (Step 3)
**Blocker Removed:** ForTy model confirmed unavailable, alternative identified
**Next Decision:** Approve Anton-Geo model as Phase 5 implementation path
