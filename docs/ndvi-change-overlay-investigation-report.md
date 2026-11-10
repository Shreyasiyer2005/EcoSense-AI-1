# NDVI Change Detection Geographic Overlay - Investigation Report

**Date**: November 2, 2026
**Status**: Investigation Complete - Implementation Plan Ready
**Objective**: Enable real geographic pixel-level NDVI change detection overlay on CesiumJS globe

---

## Executive Summary

The EcoSense AI codebase has **all the necessary components** for implementing a real pixel-level NDVI change detection overlay on the CesiumJS globe. The investigation reveals:

✅ **Per-pixel change data EXISTS** but is discarded after statistics calculation
✅ **Geographic metadata is COMPLETE** (bbox, CRS, dimensions)
✅ **Rasterio is INSTALLED** (v1.4.4) but not currently used
✅ **GeoTIFF library is AVAILABLE** in backend (geotiff v3.0.5)
✅ **CesiumJS imagery layers are FUNCTIONAL** (addImageryProvider already used)

**Critical Finding**: The `ndvi_difference` array containing per-pixel change classifications is **computed but never returned** from the ML service. Only aggregate statistics are returned.

---

## 1. Historical Comparison Pipeline Trace

### **Complete Data Flow:**

```
Frontend (NDVIAnalysis.tsx)
  ↓ handleCompare() - User selects two dates
  ↓ apiService.compareNDVI(request)

Backend (ndvi.ts)
  ↓ POST /api/v1/ndvi/compare → processNDVIComparison()
  ↓ Step 1: Fetch earlier bands (B04, B08, SCL) via sentinelHubService
  ↓ Step 2: Fetch later bands with SAME dimensions (width × height)
  ↓ Step 3: POST to ML service /ndvi/compare with band arrays

ML Service (ndvi.py)
  ↓ compare_ndvi_temporal() in NDVIProcessor class
  ↓ Line 570-574: Calculate ndvi_difference array
       ndvi_difference = np.full(earlier_ndvi.shape, np.nan, dtype=np.float32)
       ndvi_difference[overlap_mask] = later_ndvi[overlap_mask] - earlier_ndvi[overlap_mask]
  ↓ Line 577: Extract valid_differences = ndvi_difference[overlap_mask]
  ↓ Line 594-619: Categorize into 5 change classes using thresholds
  ↓ Line 621-622: Calculate percentages for each category
  ↓ Line 691-720: Return statistics, categories, insights, limitations
  ⚠️ **CRITICAL**: ndvi_difference array is DISCARDED, never returned

Backend (ndvi.ts)
  ↓ Line 561-567: Store comparison result in job.result
  ↓ Returns: earlier stats, later stats, comparison summary
  ⚠️ **NO PIXEL DATA** in response

Frontend (NDVIAnalysis.tsx)
  ↓ Displays: category counts, percentages, summary text
  ⚠️ **NO SPATIAL VISUALIZATION** - only statistics
```

### **Key Code Locations:**

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Change Array Creation** | `ml-service/app/services/ndvi.py` | 573-574 | Creates 2D ndvi_difference array |
| **Classification Logic** | `ml-service/app/services/ndvi.py` | 594-619 | Categorizes pixels into 5 classes |
| **Spatial Metadata** | `backend/src/services/sentinelHub.ts` | 40-46, 321-322 | BandData with bounds, CRS |
| **Cesium Imagery Layers** | `frontend/src/components/CesiumGlobe.tsx` | 107-109 | addImageryProvider() usage |

---

## 2. Pixel-Level Change Classification Array

### **Current Status: Generated but Discarded**

**Location**: `ml-service/app/services/ndvi.py` lines 573-574

```python
# Calculate NDVI difference (later - earlier)
# Positive difference = vegetation increase (greening)
# Negative difference = vegetation decrease (browning)
ndvi_difference = np.full(earlier_ndvi.shape, np.nan, dtype=np.float32)
ndvi_difference[overlap_mask] = later_ndvi[overlap_mask] - earlier_ndvi[overlap_mask]
```

**Shape**: `(height, width)` - matches input NDVI arrays
**Data Type**: `np.float32`
**Values**: NDVI change magnitude (-1.0 to +1.0)
**Masked Pixels**: `np.nan` for non-overlapping areas

### **Classification Categories (Lines 594-619):**

| Category | Threshold | Description | Color (Proposed) |
|----------|-----------|-------------|-----------------|
| **Strong Decrease** | < -0.2 | Significant vegetation loss | Red (#FF0000) |
| **Moderate Decrease** | -0.2 to -0.1 | Moderate vegetation loss | Orange (#FFA500) |
| **Stable** | -0.1 to +0.1 | Minimal change | Gray (#808080) |
| **Moderate Increase** | +0.1 to +0.2 | Moderate vegetation gain | Lime (#90EE90) |
| **Strong Increase** | > +0.2 | Significant vegetation gain | Green (#00FF00) |

### **What's Missing:**

❌ The classified pixel array is **never constructed**
❌ Only pixel counts per category are returned
❌ No spatial data structure links pixels to geographic coordinates

---

## 3. Geographic Metadata - Complete and Available

### **Spatial Reference Information:**

**Source**: `backend/src/services/sentinelHub.ts` (BandData interface)

```typescript
interface BandData {
  band: string;
  width: number;           // Raster width in pixels
  height: number;          // Raster height in pixels
  data: number[][];        // 2D array of pixel values
  dtype: string;           // 'uint16'
  nodata: number | null;   // 0
  bounds: BBox;            // Geographic bounding box
  crs: string;             // 'EPSG:4326'
}

interface BBox {
  west: number;   // Minimum longitude
  south: number;  // Minimum latitude
  east: number;   // Maximum longitude
  north: number;  // Maximum latitude
  crs: string;    // 'EPSG:4326' (WGS84)
}
```

### **Example Metadata (Madikeri, 12,208 pixels):**

From backend logs (September 27 vs October 29, 2026 comparison):

```json
{
  "bbox": {
    "west": 75.7337,
    "south": 12.4164,
    "east": 75.7437,
    "north": 12.4264,
    "crs": "EPSG:4326"
  },
  "dimensions": {
    "width": 110,
    "height": 111
  },
  "resolution": 10
}
```

**Calculated Values:**
- **Geographic Extent**: 0.01° × 0.01° (~1.1 km × 1.1 km at 12°N)
- **Pixel Size**: ~10m × 10m (Sentinel-2 native resolution)
- **Total Pixels**: 110 × 111 = 12,210 (12,208 valid after masking)
- **CRS**: EPSG:4326 (WGS84 Geographic, degrees)

### **Affine Transform Calculation:**

Not explicitly provided, but can be computed from bbox and dimensions:

```python
from affine import Affine

# Pixel size in degrees
pixel_width = (bbox.east - bbox.west) / width
pixel_height = (bbox.north - bbox.south) / height

# Affine transform (top-left origin)
transform = Affine(
    pixel_width, 0.0, bbox.west,    # (a, b, c) - x scale, rotation, x offset
    0.0, -pixel_height, bbox.north  # (d, e, f) - rotation, y scale, y offset
)
# g, h, i are (0, 0, 1) by default
```

**Example for Madikeri**:
- `pixel_width = 0.01 / 110 = 0.00009091°` (~10.1m at 12°N)
- `pixel_height = 0.01 / 111 = 0.00009009°` (~10.0m)

---

## 4. Rasterio and Geospatial Libraries

### **Current Installation Status:**

| Library | Version | Status | Location |
|---------|---------|--------|----------|
| **Rasterio** | 1.4.4 | ✅ Installed | `ml-service/venv` |
| **NumPy** | 1.26.3 | ✅ Installed | `ml-service/requirements.txt` |
| **Affine** | 3.0.1 | ✅ Available | `ml-service/venv/Lib/site-packages/affine` |
| **geotiff.js** | 3.0.5 | ✅ Installed | `backend/node_modules/geotiff` |

**Verification**:
```bash
$ python -c "import rasterio; print(rasterio.__version__)"
Rasterio version: 1.4.4
```

### **Current Usage:**

- **Rasterio**: Listed in requirements.txt but **NOT IMPORTED** in any ML service code
- **geotiff.js**: Used in `sentinelHub.ts` (line 260-290) to **parse** Sentinel Hub GeoTIFF responses
- **NOT USED**: No code currently **writes** GeoTIFF files

### **Capabilities Available:**

✅ **Read GeoTIFF** (backend already does this)
✅ **Write GeoTIFF** (rasterio installed but unused)
✅ **Georeferencing** (affine transform library available)
❌ **Export classified raster** (not implemented)

---

## 5. CesiumJS Overlay Capabilities

### **Existing Imagery Layer Usage:**

**File**: `frontend/src/components/CesiumGlobe.tsx`
**Lines**: 107-109

```typescript
if (viewerRef.current.imageryLayers.length > 0) {
  viewerRef.current.imageryLayers.remove(viewerRef.current.imageryLayers.get(0));
  viewerRef.current.imageryLayers.addImageryProvider(imageryProvider, 0);
  console.log('[CesiumGlobe] Bing Maps imagery provider configured');
}
```

**Current Use**: Replaces base imagery layer with Bing Maps via Ion

### **Cesium Overlay Methods:**

Three viable approaches identified:

#### **Option A: SingleTileImageryProvider (Recommended)**
```typescript
import { SingleTileImageryProvider, Rectangle, Cartesian4 } from 'cesium';

const rectangle = Rectangle.fromDegrees(west, south, east, north);

const provider = new SingleTileImageryProvider({
  url: '/api/ndvi/change-overlay.png',  // Backend serves PNG
  rectangle: rectangle,
  credit: 'NDVI Change Detection'
});

viewer.imageryLayers.addImageryProvider(provider);
```

**Pros**:
- Simplest implementation
- No tiling required
- Good for small areas (< 50km²)

**Cons**:
- Single-file load
- Not suitable for large areas

#### **Option B: UrlTemplateImageryProvider**
```typescript
import { UrlTemplateImageryProvider, Rectangle } from 'cesium';

const provider = new UrlTemplateImageryProvider({
  url: '/api/ndvi/tiles/{z}/{x}/{y}.png',
  rectangle: Rectangle.fromDegrees(west, south, east, north),
  minimumLevel: 10,
  maximumLevel: 18
});

viewer.imageryLayers.addImageryProvider(provider);
```

**Pros**:
- Progressive loading
- Scalable to large areas

**Cons**:
- Requires tile generation backend
- More complex implementation

#### **Option C: GroundPrimitive (Advanced)**
```typescript
import { GroundPrimitive, GeometryInstance, RectangleGeometry,
         ColorGeometryInstanceAttribute, Rectangle } from 'cesium';

// Per-pixel geometry approach
// Most complex but highest fidelity
```

**Pros**:
- Highest visual quality
- Full control over rendering

**Cons**:
- Most complex
- Performance concerns for large rasters

### **Recommended**: Option A (SingleTileImageryProvider)
- Matches current use case (small monitoring zones ~1km²)
- Minimal code changes
- Can be upgraded to Option B later if needed

---

## 6. Implementation Requirements

### **Missing Components:**

| Component | Status | Required Work |
|-----------|--------|---------------|
| **1. Return pixel classification array** | ❌ Missing | Add to ML service response |
| **2. Export classified raster as GeoTIFF** | ❌ Missing | Write rasterio export function |
| **3. Convert GeoTIFF to PNG with transparency** | ❌ Missing | PIL/Pillow color mapping |
| **4. Serve overlay image via API endpoint** | ❌ Missing | New backend route |
| **5. Add imagery layer to CesiumJS** | ❌ Missing | Frontend integration |
| **6. Control overlay visibility** | ❌ Missing | UI toggle component |

### **Dependencies Already Satisfied:**

✅ Rasterio installed
✅ NumPy installed
✅ Pillow available (standard Python library)
✅ CesiumJS viewer initialized
✅ Geographic metadata complete

---

## 7. Proposed Implementation Plan

### **Phase 1: ML Service Enhancement (Python)**

**File**: `ml-service/app/services/ndvi.py`

**Changes**:
1. **Create classified pixel array** in `compare_ndvi_temporal()`:
```python
# After line 619 (after categorizing)
classified_array = np.full(ndvi_difference.shape, 0, dtype=np.uint8)
classified_array[valid_differences < -0.2] = 1  # Strong Decrease
classified_array[(valid_differences >= -0.2) & (valid_differences < -0.1)] = 2  # Moderate Decrease
classified_array[(valid_differences >= -0.1) & (valid_differences <= 0.1)] = 3  # Stable
classified_array[(valid_differences > 0.1) & (valid_differences <= 0.2)] = 4  # Moderate Increase
classified_array[valid_differences > 0.2] = 5  # Strong Increase
# 0 = nodata/masked
```

2. **Add to return dictionary** (line 691):
```python
return {
    "has_data": True,
    "classified_array": classified_array.tolist(),  # NEW
    "array_shape": classified_array.shape,          # NEW
    # ... existing fields ...
}
```

### **Phase 2: GeoTIFF Export (Python)**

**New File**: `ml-service/app/services/raster_export.py`

```python
import rasterio
from rasterio.transform import from_bounds
from affine import Affine
import numpy as np

def export_classified_geotiff(
    classified_array: np.ndarray,
    bbox: dict,
    output_path: str,
    crs: str = "EPSG:4326"
) -> str:
    """
    Export classified change detection array as GeoTIFF.

    Args:
        classified_array: 2D uint8 array with class values 0-5
        bbox: {"west": float, "south": float, "east": float, "north": float}
        output_path: Path to save GeoTIFF
        crs: Coordinate reference system

    Returns:
        Path to created GeoTIFF file
    """
    height, width = classified_array.shape

    # Calculate affine transform
    transform = from_bounds(
        bbox['west'], bbox['south'],
        bbox['east'], bbox['north'],
        width, height
    )

    # Write GeoTIFF
    with rasterio.open(
        output_path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=rasterio.uint8,
        crs=crs,
        transform=transform,
        nodata=0
    ) as dst:
        dst.write(classified_array, 1)

    return output_path

def geotiff_to_colored_png(
    geotiff_path: str,
    output_png: str,
    color_map: dict = None
) -> str:
    """
    Convert classified GeoTIFF to colored PNG with transparency.

    Args:
        geotiff_path: Path to input GeoTIFF
        output_png: Path to save PNG
        color_map: {class_value: (R, G, B, A)} dict

    Returns:
        Path to created PNG file
    """
    from PIL import Image

    if color_map is None:
        color_map = {
            0: (0, 0, 0, 0),         # Nodata - transparent
            1: (255, 0, 0, 200),     # Strong Decrease - red
            2: (255, 165, 0, 200),   # Moderate Decrease - orange
            3: (128, 128, 128, 100), # Stable - gray, semi-transparent
            4: (144, 238, 144, 200), # Moderate Increase - lime
            5: (0, 255, 0, 200)      # Strong Increase - green
        }

    with rasterio.open(geotiff_path) as src:
        data = src.read(1)

    # Create RGBA image
    height, width = data.shape
    rgba = np.zeros((height, width, 4), dtype=np.uint8)

    for class_val, color in color_map.items():
        mask = data == class_val
        rgba[mask] = color

    # Save as PNG
    img = Image.fromarray(rgba, mode='RGBA')
    img.save(output_png, 'PNG')

    return output_png
```

### **Phase 3: ML Service API Route**

**File**: `ml-service/app/routes/ndvi.py`

**Add new endpoint**:
```python
@router.post("/compare-with-raster", response_model=NDVICompareResponse)
async def compare_ndvi_with_raster(request: NDVICompareRequest):
    """
    Compare NDVI between two dates and export classified raster.

    Returns comparison statistics AND a GeoTIFF file path.
    """
    # ... existing comparison logic ...

    # After comparison is complete:
    from app.services.raster_export import export_classified_geotiff, geotiff_to_colored_png

    # Export GeoTIFF
    geotiff_path = f"/tmp/ndvi_change_{request.earlier_date}_{request.later_date}.tif"
    export_classified_geotiff(
        classified_array,
        bbox={"west": west, "south": south, "east": east, "north": north},
        output_path=geotiff_path
    )

    # Convert to PNG
    png_path = geotiff_path.replace('.tif', '.png')
    geotiff_to_colored_png(geotiff_path, png_path)

    # Return both statistics and file paths
    return {
        # ... existing comparison response ...
        "raster_outputs": {
            "geotiff": geotiff_path,
            "png": png_path,
            "bbox": bbox,
            "dimensions": {"width": width, "height": height}
        }
    }
```

### **Phase 4: Backend Overlay Endpoint**

**File**: `backend/src/routes/ndvi.ts`

**Add new route**:
```typescript
/**
 * GET /api/v1/ndvi/overlay/:comparisonId
 * Serve change detection overlay image
 */
router.get('/overlay/:comparisonId', async (req, res) => {
  try {
    const { comparisonId } = req.params;
    const job = analysisJobs.get(comparisonId);

    if (!job || job.status !== 'completed') {
      return res.status(404).json({
        success: false,
        message: 'Comparison not found or not completed'
      });
    }

    // Get PNG path from ML service result
    const pngPath = job.result.raster_outputs?.png;

    if (!pngPath || !fs.existsSync(pngPath)) {
      return res.status(404).json({
        success: false,
        message: 'Overlay image not found'
      });
    }

    // Serve PNG with proper headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(pngPath);

  } catch (error: any) {
    console.error('[NDVI] Overlay retrieval failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve overlay',
      error: error.message
    });
  }
});
```

### **Phase 5: Frontend CesiumJS Integration**

**File**: `frontend/src/components/CesiumGlobe.tsx`

**Add overlay layer management**:
```typescript
import { SingleTileImageryProvider, Rectangle } from 'cesium';

interface CesiumGlobeProps {
  // ... existing props ...
  changeOverlay?: {
    url: string;
    bbox: { west: number; south: number; east: number; north: number };
    visible: boolean;
  } | null;
}

export function CesiumGlobe({
  selectedLocation,
  monitoringZones,
  onLocationClick,
  changeOverlay  // NEW
}: CesiumGlobeProps) {
  const overlayLayerRef = useRef<any>(null);

  // Add/update overlay when changeOverlay prop changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !changeOverlay) return;

    // Remove existing overlay
    if (overlayLayerRef.current) {
      viewer.imageryLayers.remove(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    if (changeOverlay.visible) {
      const rectangle = Rectangle.fromDegrees(
        changeOverlay.bbox.west,
        changeOverlay.bbox.south,
        changeOverlay.bbox.east,
        changeOverlay.bbox.north
      );

      const provider = new SingleTileImageryProvider({
        url: changeOverlay.url,
        rectangle: rectangle,
        credit: 'NDVI Change Detection'
      });

      overlayLayerRef.current = viewer.imageryLayers.addImageryProvider(provider);
      console.log('[CesiumGlobe] Change overlay added');
    }

    return () => {
      if (overlayLayerRef.current && viewer.imageryLayers) {
        viewer.imageryLayers.remove(overlayLayerRef.current);
      }
    };
  }, [changeOverlay, viewerRef.current]);

  // ... rest of component ...
}
```

### **Phase 6: Dashboard UI Control**

**File**: `frontend/src/pages/Dashboard.tsx`

**Add overlay state and toggle**:
```typescript
const [changeOverlay, setChangeOverlay] = useState<{
  url: string;
  bbox: { west: number; south: number; east: number; north: number };
  visible: boolean;
} | null>(null);

// After successful comparison
const handleComparisonComplete = (comparisonId: string, bbox: any) => {
  setChangeOverlay({
    url: `http://localhost:5000/api/v1/ndvi/overlay/${comparisonId}`,
    bbox,
    visible: true
  });
};

// Pass to CesiumGlobe
<CesiumGlobe
  selectedLocation={selectedLocation}
  monitoringZones={quickLocations.map(/* ... */)}
  onLocationClick={handleQuickLocation}
  changeOverlay={changeOverlay}  // NEW
/>

// Add UI toggle in NDVIAnalysis results
<button
  onClick={() => setChangeOverlay(prev => prev ? {...prev, visible: !prev.visible} : null)}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
>
  {changeOverlay?.visible ? 'Hide' : 'Show'} on Globe
</button>
```

---

## 8. Color Scheme Recommendation

### **Proposed Colors (RGBA)**:

| Category | RGBA | Hex | Transparency | Visual |
|----------|------|-----|--------------|--------|
| **Nodata** | (0, 0, 0, 0) | Transparent | 100% | Invisible |
| **Strong Decrease** | (255, 0, 0, 200) | #FF0000 | 22% | Bright Red |
| **Moderate Decrease** | (255, 165, 0, 200) | #FFA500 | 22% | Orange |
| **Stable** | (128, 128, 128, 100) | #808080 | 61% | Light Gray |
| **Moderate Increase** | (144, 238, 144, 200) | #90EE90 | 22% | Lime Green |
| **Strong Increase** | (0, 255, 0, 200) | #00FF00 | 22% | Bright Green |

**Design Rationale**:
- **Stable areas** more transparent (61%) to show underlying imagery
- **Change areas** moderately transparent (22%) for visibility while preserving context
- **Color gradient**: Red → Orange → Gray → Lime → Green (intuitive)
- **Alpha channel**: Allows underlying satellite imagery to show through

---

## 9. Performance Considerations

### **Raster Size Analysis:**

Current example (Madikeri):
- **Dimensions**: 110 × 111 pixels = 12,210 pixels
- **File Size Estimate**:
  - GeoTIFF (uint8, 1 band, LZW compressed): ~15 KB
  - PNG (RGBA, transparency): ~20 KB
- **Network Transfer**: Negligible (<100ms)
- **Rendering**: Single-tile, instant

### **Scaling Considerations:**

| Area Size | Pixels | PNG Size | Load Time | Method |
|-----------|--------|----------|-----------|--------|
| 1 km² (current) | ~10,000 | 20 KB | <100ms | SingleTile ✅ |
| 10 km² | ~100,000 | 150 KB | <500ms | SingleTile ✅ |
| 100 km² | ~1,000,000 | 1.5 MB | 2-5s | Tile Server ⚠️ |
| 1000 km² | ~10,000,000 | 15 MB | 10-30s | Tile Server Required |

**Recommendation**: Current implementation suitable for monitoring zones (1-10 km²). If expanding to district-level analysis (100+ km²), implement tile server (Phase 7+).

---

## 10. Testing Strategy

### **Unit Tests:**

1. **ML Service** (`test_raster_export.py`):
   - Test classified array generation
   - Test GeoTIFF export with known bbox
   - Test PNG conversion with color mapping
   - Validate georeferencing accuracy

2. **Backend** (`test_overlay_endpoint.ts`):
   - Test overlay endpoint returns PNG
   - Test 404 handling for missing comparison
   - Test CORS headers

3. **Frontend** (manual):
   - Test overlay appears on globe
   - Test toggle visibility
   - Test overlay aligns with location
   - Test overlay transparency

### **Integration Tests:**

1. Complete workflow: Compare → Export → Serve → Display
2. Verify geographic alignment with monitoring zone markers
3. Test with all five monitoring zones
4. Verify color mapping matches change categories

---

## 11. Implementation Estimate

### **Development Time:**

| Phase | Component | Estimated Time |
|-------|-----------|----------------|
| **Phase 1** | ML Service: Return classified array | 1 hour |
| **Phase 2** | ML Service: GeoTIFF export | 2 hours |
| **Phase 3** | ML Service: API endpoint update | 1 hour |
| **Phase 4** | Backend: Overlay serving route | 1 hour |
| **Phase 5** | Frontend: CesiumJS integration | 2 hours |
| **Phase 6** | Frontend: UI controls | 1 hour |
| **Testing** | Unit + Integration tests | 2 hours |
| **Total** | | **10 hours** |

### **Risk Assessment:**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Coordinate misalignment | Medium | High | Test with known landmarks |
| Color mapping issues | Low | Low | Fallback to default colors |
| Performance degradation | Low | Medium | Limit to small areas initially |
| CORS issues | Low | Low | Already configured |

---

## 12. Conclusion

### **Feasibility**: ✅ **FULLY FEASIBLE**

The EcoSense AI codebase has all necessary infrastructure for implementing geographic pixel-level NDVI change detection overlays. The critical missing component is **returning the classified pixel array** from the ML service, which is a straightforward modification.

### **Key Strengths:**

✅ Complete geographic metadata (bbox, CRS, dimensions)
✅ Rasterio installed and ready
✅ CesiumJS imagery layers functional
✅ Per-pixel classification logic already implemented
✅ Small raster sizes enable single-tile approach

### **Implementation Path:**

**Minimal viable implementation** requires modifying 5 files:
1. `ml-service/app/services/ndvi.py` - Return classified array
2. `ml-service/app/services/raster_export.py` - NEW file for export
3. `ml-service/app/routes/ndvi.py` - Add raster output
4. `backend/src/routes/ndvi.ts` - Serve overlay PNG
5. `frontend/src/components/CesiumGlobe.tsx` - Add imagery layer

**No major architectural changes required**. All additions are **incremental** and **non-breaking**.

### **Recommended Next Step:**

Proceed with **Phase 1** (ML Service Enhancement) to validate the approach with minimal changes before implementing the full pipeline.

---

**Report Generated**: November 2, 2026
**Investigation Status**: ✅ Complete
**Implementation Ready**: Yes
**Risk Level**: Low
**Estimated Timeline**: 10 hours for full implementation
