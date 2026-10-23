"""
Health check endpoint for ML service
"""

from fastapi import APIRouter
from datetime import datetime
import os
import sys

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify service status and dependencies
    """
    
    # Check Python version
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    
    # Check available packages
    dependencies = {
        "fastapi": True,
        "numpy": False,
        "rasterio": False,
        "torch": False,
        "geopandas": False
    }
    
    try:
        import numpy
        dependencies["numpy"] = True
    except ImportError:
        pass
    
    try:
        import rasterio
        dependencies["rasterio"] = True
    except ImportError:
        pass
    
    try:
        import torch
        dependencies["torch"] = True
        dependencies["torch_cuda"] = torch.cuda.is_available()
    except ImportError:
        pass
    
    try:
        import geopandas
        dependencies["geopandas"] = True
    except ImportError:
        pass
    
    return {
        "status": "ok",
        "service": "ecosense-ai-ml-service",
        "timestamp": datetime.utcnow().isoformat(),
        "python_version": python_version,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0-phase1",
        "dependencies": dependencies,
        "capabilities": {
            "ndvi_calculation": dependencies["numpy"] and dependencies["rasterio"],
            "unet_inference": dependencies["torch"],
            "geospatial_processing": dependencies["geopandas"] and dependencies["rasterio"]
        }
    }
