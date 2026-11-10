"""
NDVI Calculation API Routes
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
from app.services.ndvi import ndvi_processor
import logging

router = APIRouter(prefix="/ndvi", tags=["ndvi"])
logger = logging.getLogger(__name__)


class NDVICalculateRequest(BaseModel):
    """Request model for NDVI calculation"""
    red_band: List[List[float]] = Field(..., description="Red band (B04) data as 2D array")
    nir_band: List[List[float]] = Field(..., description="NIR band (B08) data as 2D array")
    scl_mask: Optional[List[List[int]]] = Field(None, description="Scene Classification Layer mask (optional)")
    red_nodata: Optional[float] = Field(None, description="Nodata value for red band")
    nir_nodata: Optional[float] = Field(None, description="Nodata value for NIR band")
    scale_input: bool = Field(True, description="Scale DN values to reflectance (0-1)")


class NDVICalculateResponse(BaseModel):
    """Response model for NDVI calculation"""
    success: bool
    statistics: Dict[str, Any]
    metadata: Dict[str, Any]
    interpretation: str
    vegetation_categories: Dict[str, Any]
    environmental_analysis: Dict[str, Any]
    message: Optional[str] = None


@router.post("/calculate", response_model=NDVICalculateResponse)
async def calculate_ndvi(request: NDVICalculateRequest):
    """
    Calculate NDVI from red and NIR band data.

    Returns summary statistics and metadata without returning the full NDVI array
    (which would be too large for JSON response).
    """
    try:
        # Convert to numpy arrays
        red_array = np.array(request.red_band, dtype=np.float32)
        nir_array = np.array(request.nir_band, dtype=np.float32)

        # Validate dimensions
        if red_array.ndim != 2:
            raise HTTPException(
                status_code=400,
                detail=f"Red band must be 2-dimensional, got {red_array.ndim} dimensions"
            )

        if nir_array.shape != red_array.shape:
            raise HTTPException(
                status_code=400,
                detail=f"NIR band shape {nir_array.shape} does not match red band shape {red_array.shape}"
            )

        # Create quality mask from SCL if provided
        quality_mask = None
        if request.scl_mask is not None:
            scl_array = np.array(request.scl_mask, dtype=np.uint8)

            # SCL values to exclude (clouds, cloud shadows, snow, nodata)
            # Valid values: 4=vegetation, 5=bare soil, 6=water, 7=low cloud prob
            # Invalid values: 0=nodata, 1=saturated, 2=dark, 3=cloud shadow, 8-11=clouds/snow
            invalid_scl = [0, 1, 2, 3, 8, 9, 10, 11]
            quality_mask = ~np.isin(scl_array, invalid_scl)

        # Calculate NDVI
        result = ndvi_processor.calculate_ndvi(
            red_band=red_array,
            nir_band=nir_array,
            red_nodata=request.red_nodata,
            nir_nodata=request.nir_nodata,
            quality_mask=quality_mask,
            scale_input=request.scale_input
        )

        # Get interpretation for mean NDVI
        mean_ndvi = result["statistics"]["mean"]
        interpretation = (
            ndvi_processor.interpret_ndvi(mean_ndvi)
            if mean_ndvi is not None
            else "No valid data"
        )

        # Calculate vegetation categories
        categories = ndvi_processor.categorize_vegetation_condition(
            result["ndvi"],
            result["valid_mask"]
        )

        # Generate environmental interpretation
        environmental_analysis = ndvi_processor.calculate_environmental_interpretation(
            result["statistics"],
            categories,
            result["metadata"]
        )

        return NDVICalculateResponse(
            success=True,
            statistics=result["statistics"],
            metadata=result["metadata"],
            interpretation=interpretation,
            vegetation_categories=categories,
            environmental_analysis=environmental_analysis,
            message=f"NDVI calculated successfully for {result['metadata']['total_pixels']} pixels"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"NDVI calculation failed: {str(e)}"
        )


@router.get("/health")
async def ndvi_health():
    """Health check endpoint for NDVI service"""
    return {
        "status": "ok",
        "service": "ndvi-processor",
        "version": "1.0.0"
    }


class NDVICompareRequest(BaseModel):
    """Request model for historical NDVI comparison"""
    earlier_red_band: List[List[float]] = Field(..., description="Earlier red band (B04) data")
    earlier_nir_band: List[List[float]] = Field(..., description="Earlier NIR band (B08) data")
    later_red_band: List[List[float]] = Field(..., description="Later red band (B04) data")
    later_nir_band: List[List[float]] = Field(..., description="Later NIR band (B08) data")
    earlier_scl_mask: Optional[List[List[int]]] = Field(None, description="Earlier SCL mask")
    later_scl_mask: Optional[List[List[int]]] = Field(None, description="Later SCL mask")
    earlier_date: str = Field(..., description="Earlier observation date (YYYY-MM-DD)")
    later_date: str = Field(..., description="Later observation date (YYYY-MM-DD)")
    red_nodata: Optional[float] = Field(None, description="Nodata value for red bands")
    nir_nodata: Optional[float] = Field(None, description="Nodata value for NIR bands")
    scale_input: bool = Field(True, description="Scale DN values to reflectance")
    preserve_arrays: bool = Field(False, description="Include pixel arrays in response (for overlay generation)")

    # Phase 1.5: Spatial metadata from backend
    bbox: Optional[dict] = Field(None, description="Geographic bounding box {west, south, east, north, crs}")
    spatial_resolution: Optional[float] = Field(None, description="Spatial resolution in meters")
    earlier_crs: Optional[str] = Field(None, description="Earlier raster CRS (e.g., 'EPSG:4326')")
    later_crs: Optional[str] = Field(None, description="Later raster CRS (e.g., 'EPSG:4326')")


class NDVICompareResponse(BaseModel):
    """Response model for historical NDVI comparison"""
    success: bool
    earlier: Dict[str, Any] = Field(..., description="Earlier date NDVI analysis")
    later: Dict[str, Any] = Field(..., description="Later date NDVI analysis")
    comparison: Dict[str, Any] = Field(..., description="Temporal comparison results")
    spatial_metadata: Optional[Dict[str, Any]] = Field(None, description="Geographic metadata (Phase 1.5)")
    message: Optional[str] = None


@router.post("/compare", response_model=NDVICompareResponse)
async def compare_ndvi_temporal(request: NDVICompareRequest):
    """
    Compare NDVI between two dates to detect vegetation changes.

    Calculates NDVI for both dates independently, then computes pixel-by-pixel
    differences for overlapping valid areas.

    IMPORTANT: Results show spectral greenness changes only. Seasonal variation,
    atmospheric conditions, and agricultural cycles can cause large NDVI shifts.
    This is NOT definitive evidence of deforestation or ecosystem degradation.

    SPATIAL METADATA (Phase 1.5):
    Backend can optionally provide bbox, CRS, and resolution for geographic overlay
    generation. ML service validates metadata compatibility and includes it in response.
    """
    try:
        # Phase 1.5: Validate spatial metadata if provided
        spatial_metadata = None
        spatial_warnings = []

        if request.bbox is not None:
            # Validate bbox structure
            required_bbox_fields = ['west', 'south', 'east', 'north', 'crs']
            missing_fields = [f for f in required_bbox_fields if f not in request.bbox]
            if missing_fields:
                spatial_warnings.append(f"Incomplete bbox - missing fields: {missing_fields}")
            else:
                # Validate bbox values
                try:
                    west = float(request.bbox.get('west'))
                    south = float(request.bbox.get('south'))
                    east = float(request.bbox.get('east'))
                    north = float(request.bbox.get('north'))
                    bbox_crs = str(request.bbox.get('crs', 'unknown'))

                    if west >= east:
                        spatial_warnings.append(f"Invalid bbox: west ({west}) >= east ({east})")
                    if south >= north:
                        spatial_warnings.append(f"Invalid bbox: south ({south}) >= north ({north})")

                    # Validate CRS compatibility
                    earlier_crs = request.earlier_crs or bbox_crs
                    later_crs = request.later_crs or bbox_crs

                    if earlier_crs != later_crs:
                        spatial_warnings.append(f"CRS mismatch: earlier={earlier_crs}, later={later_crs}")
                    elif earlier_crs != bbox_crs and bbox_crs != 'unknown':
                        spatial_warnings.append(f"CRS mismatch: raster={earlier_crs}, bbox={bbox_crs}")

                    # Store validated metadata (even with warnings, preserve what we can)
                    spatial_metadata = {
                        "bbox": {
                            "west": west,
                            "south": south,
                            "east": east,
                            "north": north,
                            "crs": bbox_crs
                        },
                        "resolution": request.spatial_resolution,
                        "crs": earlier_crs,
                        "validated": len(spatial_warnings) == 0
                    }

                    if spatial_metadata["validated"]:
                        print(f"[NDVI Compare] Spatial metadata validated: bbox={spatial_metadata['bbox']}, resolution={request.spatial_resolution}m")
                    else:
                        print(f"[NDVI Compare] Spatial metadata validation warnings: {spatial_warnings}")
                        spatial_metadata["warnings"] = spatial_warnings

                except (ValueError, TypeError, AttributeError) as e:
                    spatial_warnings.append(f"Invalid bbox coordinate values: {str(e)}")

        # Convert to numpy arrays
        earlier_red = np.array(request.earlier_red_band, dtype=np.float32)
        earlier_nir = np.array(request.earlier_nir_band, dtype=np.float32)
        later_red = np.array(request.later_red_band, dtype=np.float32)
        later_nir = np.array(request.later_nir_band, dtype=np.float32)

        # Validate dimensions
        if earlier_red.ndim != 2 or earlier_nir.ndim != 2:
            raise HTTPException(
                status_code=400,
                detail="Earlier bands must be 2-dimensional"
            )

        if later_red.ndim != 2 or later_nir.ndim != 2:
            raise HTTPException(
                status_code=400,
                detail="Later bands must be 2-dimensional"
            )

        if earlier_red.shape != earlier_nir.shape:
            raise HTTPException(
                status_code=400,
                detail=f"Earlier red and NIR bands must have same shape"
            )

        if later_red.shape != later_nir.shape:
            raise HTTPException(
                status_code=400,
                detail=f"Later red and NIR bands must have same shape"
            )

        # Check if dimensions match between dates
        if earlier_red.shape != later_red.shape:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Image dimensions must match between dates. "
                    f"Earlier: {earlier_red.shape}, Later: {later_red.shape}. "
                    f"Ensure both images use the same bbox and resolution."
                )
            )

        # Create quality masks from SCL if provided
        earlier_quality_mask = None
        if request.earlier_scl_mask is not None:
            earlier_scl = np.array(request.earlier_scl_mask, dtype=np.uint8)
            invalid_scl = [0, 1, 2, 3, 8, 9, 10, 11]
            earlier_quality_mask = ~np.isin(earlier_scl, invalid_scl)

        later_quality_mask = None
        if request.later_scl_mask is not None:
            later_scl = np.array(request.later_scl_mask, dtype=np.uint8)
            invalid_scl = [0, 1, 2, 3, 8, 9, 10, 11]
            later_quality_mask = ~np.isin(later_scl, invalid_scl)

        # Calculate NDVI for earlier date
        earlier_result = ndvi_processor.calculate_ndvi(
            red_band=earlier_red,
            nir_band=earlier_nir,
            red_nodata=request.red_nodata,
            nir_nodata=request.nir_nodata,
            quality_mask=earlier_quality_mask,
            scale_input=request.scale_input
        )

        # Calculate NDVI for later date
        later_result = ndvi_processor.calculate_ndvi(
            red_band=later_red,
            nir_band=later_nir,
            red_nodata=request.red_nodata,
            nir_nodata=request.nir_nodata,
            quality_mask=later_quality_mask,
            scale_input=request.scale_input
        )

        # Calculate vegetation categories for both dates
        earlier_categories = ndvi_processor.categorize_vegetation_condition(
            earlier_result["ndvi"],
            earlier_result["valid_mask"]
        )

        later_categories = ndvi_processor.categorize_vegetation_condition(
            later_result["ndvi"],
            later_result["valid_mask"]
        )

        # Generate environmental interpretation for both dates
        earlier_env = ndvi_processor.calculate_environmental_interpretation(
            earlier_result["statistics"],
            earlier_categories,
            earlier_result["metadata"]
        )

        later_env = ndvi_processor.calculate_environmental_interpretation(
            later_result["statistics"],
            later_categories,
            later_result["metadata"]
        )

        # Compare NDVI between dates
        comparison = ndvi_processor.compare_ndvi_temporal(
            earlier_ndvi=earlier_result["ndvi"],
            later_ndvi=later_result["ndvi"],
            earlier_valid_mask=earlier_result["valid_mask"],
            later_valid_mask=later_result["valid_mask"],
            earlier_date=request.earlier_date,
            later_date=request.later_date,
            preserve_arrays=request.preserve_arrays
        )

        return NDVICompareResponse(
            success=True,
            earlier={
                "date": request.earlier_date,
                "statistics": earlier_result["statistics"],
                "metadata": earlier_result["metadata"],
                "interpretation": ndvi_processor.interpret_ndvi(
                    earlier_result["statistics"]["mean"]
                ) if earlier_result["statistics"]["mean"] else "No valid data",
                "vegetation_categories": earlier_categories,
                "environmental_analysis": earlier_env
            },
            later={
                "date": request.later_date,
                "statistics": later_result["statistics"],
                "metadata": later_result["metadata"],
                "interpretation": ndvi_processor.interpret_ndvi(
                    later_result["statistics"]["mean"]
                ) if later_result["statistics"]["mean"] else "No valid data",
                "vegetation_categories": later_categories,
                "environmental_analysis": later_env
            },
            comparison=comparison,
            spatial_metadata=spatial_metadata if spatial_metadata else {
                "validated": False,
                "warnings": spatial_warnings if spatial_warnings else ["No spatial metadata provided"]
            },
            message=f"Historical comparison completed. {comparison.get('overlap_count', 0)} overlapping pixels analyzed."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Historical NDVI comparison failed: {str(e)}"
        )



@router.post("/export-geotiff")
async def export_ndvi_change_geotiff(request: Request):
    """
    Export NDVI change classification array as georeferenced GeoTIFF.
    Phase 8D.4: Backend integration endpoint

    Body:
    {
        "classified_array": list[list[int]],  // 2D array with values 0-5
        "spatial_metadata": dict,  // Validated metadata from comparison
        "output_filename": str,  // Desired filename
        "compression": str  // Optional: DEFLATE, LZW, PACKBITS, NONE
    }

    Returns: GeoTIFF file as binary response
    """
    try:
        from app.services.raster_export import raster_export_service
        from fastapi.responses import StreamingResponse
        import tempfile
        import os

        # Parse request body
        body = await request.json()
        classified_array_list = body.get('classified_array')
        spatial_metadata = body.get('spatial_metadata')
        output_filename = body.get('output_filename', 'ndvi_change.tif')
        compression = body.get('compression', 'DEFLATE')

        # Validate inputs
        if not classified_array_list:
            raise HTTPException(
                status_code=400,
                detail="classified_array is required"
            )

        if not spatial_metadata:
            raise HTTPException(
                status_code=400,
                detail="spatial_metadata is required"
            )

        # Convert to numpy array
        classified_array = np.array(classified_array_list, dtype=np.uint8)

        # Create temporary file for export
        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            temp_path = tmp.name

        try:
            # Export GeoTIFF
            result = raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=temp_path,
                compression=compression
            )

            # Check validation
            if not result['validation']['valid']:
                logger.warning(f"[NDVI Export] Validation warnings: {result['validation']['errors']}")

            # Read file for response
            def file_iterator():
                with open(temp_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
                # Cleanup after streaming
                try:
                    os.unlink(temp_path)
                except:
                    pass

            logger.info(f"[NDVI Export] GeoTIFF exported: {output_filename}, size={result['validation'].get('pixel_counts', {})}")

            # Return file as streaming response
            return StreamingResponse(
                file_iterator(),
                media_type='image/tiff',
                headers={
                    'Content-Disposition': f'attachment; filename="{output_filename}"'
                }
            )

        except ValueError as e:
            # Cleanup temp file on error
            try:
                os.unlink(temp_path)
            except:
                pass
            raise HTTPException(
                status_code=400,
                detail=f"GeoTIFF export failed: {str(e)}"
            )
        except Exception as e:
            # Cleanup temp file on error
            try:
                os.unlink(temp_path)
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail=f"GeoTIFF export failed: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GeoTIFF export endpoint failed: {str(e)}"
        )



@router.post("/convert-to-png")
async def convert_geotiff_to_png(request: Request):
    """
    Convert GeoTIFF overlay to PNG with color mapping for CesiumJS.
    Phase 8D.5: PNG conversion endpoint

    Body:
    {
        "geotiff_path": str,  // Path to GeoTIFF file (server-side)
        "output_filename": str  // Desired PNG filename
    }

    Returns: PNG file as binary response with metadata in headers
    """
    try:
        from app.services.png_overlay import png_overlay_service
        from fastapi.responses import StreamingResponse
        import tempfile
        import os
        import json

        # Parse request body
        body = await request.json()
        geotiff_path = body.get('geotiff_path')
        output_filename = body.get('output_filename', 'ndvi_change.png')

        # Validate inputs
        if not geotiff_path:
            raise HTTPException(
                status_code=400,
                detail="geotiff_path is required"
            )

        # Check if GeoTIFF exists
        if not os.path.exists(geotiff_path):
            raise HTTPException(
                status_code=404,
                detail=f"GeoTIFF file not found: {geotiff_path}"
            )

        # Create temporary file for PNG
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            temp_png_path = tmp.name

        try:
            # Convert GeoTIFF to PNG
            result = png_overlay_service.geotiff_to_png(
                geotiff_path=geotiff_path,
                output_png_path=temp_png_path
            )

            # Prepare metadata for response headers
            metadata = {
                'bounds': result['bounds'],
                'crs': result['crs'],
                'width': result['width'],
                'height': result['height']
            }

            # Read PNG file for response
            def file_iterator():
                with open(temp_png_path, 'rb') as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
                # Cleanup after streaming
                try:
                    os.unlink(temp_png_path)
                except:
                    pass

            logger.info(f"[PNG Conversion] Converted: {geotiff_path} -> PNG")

            # Return PNG file with metadata in headers
            return StreamingResponse(
                file_iterator(),
                media_type='image/png',
                headers={
                    'Content-Disposition': f'attachment; filename="{output_filename}"',
                    'X-Overlay-Bounds': json.dumps(result['bounds']),
                    'X-Overlay-CRS': result['crs'],
                    'X-Overlay-Width': str(result['width']),
                    'X-Overlay-Height': str(result['height'])
                }
            )

        except FileNotFoundError as e:
            try:
                os.unlink(temp_png_path)
            except:
                pass
            raise HTTPException(
                status_code=404,
                detail=str(e)
            )
        except ValueError as e:
            try:
                os.unlink(temp_png_path)
            except:
                pass
            raise HTTPException(
                status_code=400,
                detail=f"PNG conversion failed: {str(e)}"
            )
        except Exception as e:
            try:
                os.unlink(temp_png_path)
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail=f"PNG conversion failed: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PNG conversion endpoint failed: {str(e)}"
        )
