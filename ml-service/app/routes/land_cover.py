"""
Land Cover Classification API Routes
Rule-based spectral classification (no trained model)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import numpy as np
from app.services.land_cover import land_cover_classifier
import logging

router = APIRouter(prefix="/land-cover", tags=["land-cover"])
logger = logging.getLogger(__name__)


class LandCoverRequest(BaseModel):
    """Request model for land cover classification"""
    blue: List[List[float]] = Field(..., description="Blue band (B02) as 2D array")
    green: List[List[float]] = Field(..., description="Green band (B03) as 2D array")
    red: List[List[float]] = Field(..., description="Red band (B04) as 2D array")
    nir: List[List[float]] = Field(..., description="NIR band (B08) as 2D array")
    swir1: List[List[float]] = Field(..., description="SWIR1 band (B11) as 2D array")
    swir2: List[List[float]] = Field(..., description="SWIR2 band (B12) as 2D array")
    nodata_value: Optional[float] = Field(None, description="No data value")
    bbox: Optional[Dict[str, float]] = Field(default=None, description="Bounding box {west, south, east, north} in EPSG:4326")
    resolution: Optional[int] = Field(default=20, description="Spatial resolution in meters (10 or 20)")


class LandCoverResponse(BaseModel):
    """Response model for land cover classification"""
    success: bool
    classification: List[List[int]] = Field(..., description="Classification mask (class IDs 1-7)")
    statistics: Dict[str, Any]
    classes: Dict[int, Dict[str, str]]
    message: str


@router.post("/classify", response_model=LandCoverResponse)
async def classify_land_cover(request: LandCoverRequest):
    """
    Classify land cover using rule-based spectral analysis.

    Returns 7-class classification:
    1. Water
    2. Dense Vegetation / Forest
    3. Moderate Vegetation / Cropland
    4. Sparse Vegetation / Grassland
    5. Bare Soil
    6. Built-up Area
    7. Barren Land

    NOTE: This uses spectral index thresholds, NOT a trained ML model.
    """
    try:
        # Convert to numpy arrays
        blue = np.array(request.blue, dtype=np.float32)
        green = np.array(request.green, dtype=np.float32)
        red = np.array(request.red, dtype=np.float32)
        nir = np.array(request.nir, dtype=np.float32)
        swir1 = np.array(request.swir1, dtype=np.float32)
        swir2 = np.array(request.swir2, dtype=np.float32)

        # Validate dimensions
        shape = blue.shape
        for band, name in [(green, "green"), (red, "red"), (nir, "nir"),
                           (swir1, "swir1"), (swir2, "swir2")]:
            if band.shape != shape:
                raise HTTPException(
                    status_code=400,
                    detail=f"{name} band shape {band.shape} doesn't match blue band {shape}"
                )

        # Classify
        classification, stats = land_cover_classifier.classify(
            blue=blue,
            green=green,
            red=red,
            nir=nir,
            swir1=swir1,
            swir2=swir2,
            nodata_value=request.nodata_value
        )

        # Get class info
        classes = land_cover_classifier.get_class_info()

        # Calculate area statistics if bbox provided
        area_stats = None
        if request.bbox:
            try:
                # Validate bbox has required fields
                required_fields = ['west', 'south', 'east', 'north']
                if all(field in request.bbox for field in required_fields):
                    area_stats = land_cover_classifier.calculate_area_statistics(
                        statistics=stats,
                        bbox=request.bbox,
                        resolution_meters=request.resolution or 20
                    )
                    logger.info(f"Area statistics calculated: {area_stats['total_area_hectares']:.2f} ha")
                else:
                    logger.warning(f"Bbox missing required fields: {request.bbox}")
            except Exception as e:
                logger.error(f"Area calculation failed: {str(e)}")
                # Don't fail the entire request, just log the error

        response_data = {
            "success": True,
            "classification": classification.tolist(),
            "statistics": stats,
            "classes": classes,
            "message": "Classification complete using rule-based spectral analysis (not a trained ML model)"
        }

        # Add area statistics if available
        if area_stats:
            response_data["statistics"]["area_statistics"] = area_stats

        return response_data

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Land cover classification failed: {str(e)}"
        )


@router.get("/classes")
async def get_classes():
    """Get land cover class definitions"""
    return {
        "success": True,
        "classes": land_cover_classifier.get_class_info(),
        "method": "rule-based spectral classification",
        "note": "This classifier uses spectral index thresholds, not a trained ML model."
    }
