"""
EcoSense AI ML Service
Python + FastAPI service for geospatial analysis and machine learning
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import sys

# Load environment variables
load_dotenv()

# Add app directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.routes import health, ndvi, land_cover

app = FastAPI(
    title="EcoSense AI ML Service",
    description="Geospatial analysis and ML service for environmental monitoring",
    version="1.0.0-phase1"
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health.router, tags=["health"])
app.include_router(ndvi.router, tags=["ndvi"])
app.include_router(land_cover.router, prefix="/api/v1", tags=["land-cover"])

@app.get("/")
async def root():
    return {
        "service": "ecosense-ai-ml-service",
        "status": "ready",
        "version": "1.0.0-phase1",
        "endpoints": {
            "health": "/health",
            "ndvi": "/api/v1/ndvi",
            "land_cover": "/api/v1/land-cover (rule-based spectral classification)"
        }
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    print(f"Starting EcoSense AI ML Service on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )