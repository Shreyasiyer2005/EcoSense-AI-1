"""
EcoSense AI ML Service
FastAPI application for NDVI calculation and land cover classification
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import ndvi, land_cover

# Create FastAPI app
app = FastAPI(
    title="EcoSense AI ML Service",
    description="Machine Learning and Analysis Service for Environmental Monitoring",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ndvi.router)
app.include_router(land_cover.router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ecosense-ai-ml",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "EcoSense AI ML Service",
        "docs": "/docs",
        "health": "/health",
        "features": ["NDVI calculation", "Land cover classification (rule-based)"]
    }
