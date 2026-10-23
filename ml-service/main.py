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

from app.routes import health

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

@app.get("/")
async def root():
    return {
        "service": "ecosense-ai-ml-service",
        "status": "ready",
        "version": "1.0.0-phase1",
        "endpoints": {
            "health": "/health",
            "ndvi": "/api/v1/ndvi (Phase 4)",
            "land_cover": "/api/v1/land-cover (Phase 5)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
