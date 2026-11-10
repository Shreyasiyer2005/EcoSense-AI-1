"""
Rule-Based Land Cover Classification
Uses spectral indices and thresholds for 7-class classification
NO PRETRAINED MODEL - Uses spectral analysis only
"""

import numpy as np
from typing import Dict, Any, Tuple, List
import logging

logger = logging.getLogger(__name__)


class LandCoverClassifier:
    """
    Rule-based land cover classifier using spectral indices.

    Classes:
    1. Water (Blue high, NIR low)
    2. Dense Vegetation / Forest (NDVI > 0.6)
    3. Moderate Vegetation / Cropland (NDVI 0.3-0.6)
    4. Sparse Vegetation / Grassland (NDVI 0.2-0.3)
    5. Bare Soil (Low NDVI, moderate SWIR)
    6. Built-up / Urban (NIR low, SWIR high, Red moderate)
    7. Barren / Rock (Very low NDVI, high brightness)

    NOTE: This is NOT a trained deep learning model. It uses simple spectral rules.
    Accuracy is limited compared to ML models but provides interpretable results.
    """

    def __init__(self):
        self.classes = {
            1: {"name": "Water", "color": "#1E3A8A"},
            2: {"name": "Dense Vegetation", "color": "#166534"},
            3: {"name": "Moderate Vegetation", "color": "#84CC16"},
            4: {"name": "Sparse Vegetation", "color": "#BEF264"},
            5: {"name": "Bare Soil", "color": "#A16207"},
            6: {"name": "Built-up Area", "color": "#DC2626"},
            7: {"name": "Barren Land", "color": "#78716C"}
        }

    def classify(
        self,
        blue: np.ndarray,
        green: np.ndarray,
        red: np.ndarray,
        nir: np.ndarray,
        swir1: np.ndarray,
        swir2: np.ndarray,
        nodata_value: float = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Classify land cover using rule-based spectral analysis.

        Args:
            blue: Blue band (B02)
            green: Green band (B03)
            red: Red band (B04)
            nir: NIR band (B08)
            swir1: SWIR1 band (B11)
            swir2: SWIR2 band (B12)
            nodata_value: Value representing no data

        Returns:
            classification_mask: 2D array with class IDs (1-7)
            metadata: Classification statistics and info
        """
        logger.info("Starting rule-based land cover classification")

        # Validate shapes
        shape = blue.shape
        for band, name in [(green, "green"), (red, "red"), (nir, "nir"),
                           (swir1, "swir1"), (swir2, "swir2")]:
            if band.shape != shape:
                raise ValueError(f"{name} band shape {band.shape} doesn't match blue band {shape}")

        # Create valid pixel mask
        valid_mask = np.ones(shape, dtype=bool)
        if nodata_value is not None:
            for band in [blue, green, red, nir, swir1, swir2]:
                valid_mask &= (band != nodata_value)

        # Calculate spectral indices
        ndvi = self._calculate_ndvi(red, nir)
        ndwi = self._calculate_ndwi(green, nir)  # Water index
        ndbi = self._calculate_ndbi(swir1, nir)  # Built-up index
        brightness = (blue + green + red + nir) / 4

        # Initialize classification array
        classification = np.zeros(shape, dtype=np.uint8)

        # Classification rules (order matters - first match wins)

        # 1. Water: High NDWI, low NIR
        water_mask = (ndwi > 0.3) & (nir < 0.2) & valid_mask
        classification[water_mask] = 1

        # 2. Dense Vegetation / Forest: High NDVI
        forest_mask = (ndvi > 0.6) & (nir > 0.3) & ~water_mask & valid_mask
        classification[forest_mask] = 2

        # 3. Moderate Vegetation / Cropland: Medium-high NDVI
        cropland_mask = (ndvi > 0.3) & (ndvi <= 0.6) & ~water_mask & ~forest_mask & valid_mask
        classification[cropland_mask] = 3

        # 4. Sparse Vegetation / Grassland: Low-medium NDVI
        grassland_mask = (ndvi > 0.15) & (ndvi <= 0.3) & ~water_mask & ~forest_mask & ~cropland_mask & valid_mask
        classification[grassland_mask] = 4

        # 6. Built-up / Urban: High NDBI, moderate brightness
        urban_mask = (ndbi > 0.1) & (brightness > 0.15) & (brightness < 0.4) & (ndvi < 0.25) & ~water_mask & valid_mask
        classification[urban_mask] = 6

        # 5. Bare Soil: Low NDVI, moderate SWIR, not urban
        soil_mask = (ndvi > -0.1) & (ndvi <= 0.15) & (swir1 > 0.1) & (classification == 0) & valid_mask
        classification[soil_mask] = 5

        # 7. Barren / Rock: Very low NDVI or high brightness
        barren_mask = ((ndvi <= -0.1) | (brightness > 0.5)) & (classification == 0) & valid_mask
        classification[barren_mask] = 7

        # Calculate statistics
        stats = self._calculate_statistics(classification, valid_mask)

        logger.info(f"Classification complete. Valid pixels: {stats['total_valid']}")

        return classification, stats

    def _calculate_ndvi(self, red: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Calculate NDVI with safe division"""
        with np.errstate(divide='ignore', invalid='ignore'):
            ndvi = (nir - red) / (nir + red)
            ndvi = np.where(np.isfinite(ndvi), ndvi, 0)
        return ndvi

    def _calculate_ndwi(self, green: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Calculate NDWI (water index)"""
        with np.errstate(divide='ignore', invalid='ignore'):
            ndwi = (green - nir) / (green + nir)
            ndwi = np.where(np.isfinite(ndwi), ndwi, 0)
        return ndwi

    def _calculate_ndbi(self, swir: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Calculate NDBI (built-up index)"""
        with np.errstate(divide='ignore', invalid='ignore'):
            ndbi = (swir - nir) / (swir + nir)
            ndbi = np.where(np.isfinite(ndbi), ndbi, 0)
        return ndbi

    def _calculate_statistics(
        self,
        classification: np.ndarray,
        valid_mask: np.ndarray
    ) -> Dict[str, Any]:
        """Calculate class-wise statistics"""
        total_valid = np.sum(valid_mask)

        class_stats = []
        for class_id, class_info in self.classes.items():
            class_mask = (classification == class_id) & valid_mask
            count = np.sum(class_mask)
            percentage = (count / total_valid * 100) if total_valid > 0 else 0

            class_stats.append({
                "class_id": class_id,
                "name": class_info["name"],
                "color": class_info["color"],
                "pixel_count": int(count),
                "percentage": float(percentage)
            })

        # Sort by percentage (descending)
        class_stats.sort(key=lambda x: x["percentage"], reverse=True)

        return {
            "total_valid": int(total_valid),
            "class_distribution": class_stats,
            "method": "rule-based spectral classification",
            "note": "This is NOT a trained ML model. Results are based on spectral index thresholds."
        }

    def get_class_info(self) -> Dict[int, Dict[str, str]]:
        """Get class definitions"""
        return self.classes

    def calculate_area_statistics(
        self,
        statistics: Dict[str, Any],
        bbox: Dict[str, float],
        resolution_meters: int = 20
    ) -> Dict[str, Any]:
        """
        Calculate land-cover area in hectares accounting for Earth's curvature.

        Uses cosine correction for latitude to calculate accurate pixel area.
        At the equator, a degree of longitude is ~111km. At 45°N, it's ~78km.

        Args:
            statistics: Classification statistics with pixel counts
            bbox: {'west', 'south', 'east', 'north'} in EPSG:4326 (decimal degrees)
            resolution_meters: Spatial resolution (10 or 20 meters)

        Returns:
            {
                'pixel_area_m2': float,
                'pixel_area_hectares': float,
                'total_area_hectares': float,
                'class_areas': [
                    {
                        'class_id': int,
                        'name': str,
                        'pixel_count': int,
                        'area_m2': float,
                        'area_hectares': float,
                        'percentage': float
                    }
                ]
            }
        """
        import math

        # Calculate average latitude for cosine correction
        avg_latitude = (bbox['north'] + bbox['south']) / 2.0
        lat_radians = math.radians(avg_latitude)

        # Pixel area at this latitude
        # At equator: 20m x 20m = 400 m²
        # At 45°N: effectively 20m x 14.14m ≈ 283 m² (cos(45°) ≈ 0.707)
        pixel_area_m2 = resolution_meters * resolution_meters * math.cos(lat_radians)
        pixel_area_hectares = pixel_area_m2 / 10000.0  # 1 hectare = 10,000 m²

        # Calculate total area
        total_valid_pixels = statistics['total_valid']
        total_area_hectares = total_valid_pixels * pixel_area_hectares

        # Calculate per-class areas
        class_areas = []
        for class_info in statistics['class_distribution']:
            pixel_count = class_info['pixel_count']
            area_m2 = pixel_count * pixel_area_m2
            area_hectares = area_m2 / 10000.0

            class_areas.append({
                'class_id': class_info['class_id'],
                'name': class_info['name'],
                'pixel_count': pixel_count,
                'area_m2': float(area_m2),
                'area_hectares': float(area_hectares),
                'percentage': class_info['percentage']
            })

        logger.info(f"Area calculation: {resolution_meters}m resolution at {avg_latitude:.2f}°N")
        logger.info(f"Pixel area: {pixel_area_m2:.2f} m² ({pixel_area_hectares:.4f} ha)")
        logger.info(f"Total area: {total_area_hectares:.2f} hectares")

        return {
            'pixel_area_m2': float(pixel_area_m2),
            'pixel_area_hectares': float(pixel_area_hectares),
            'total_area_hectares': float(total_area_hectares),
            'class_areas': class_areas,
            'latitude_correction_applied': True,
            'average_latitude': float(avg_latitude),
            'resolution_meters': resolution_meters
        }


# Global classifier instance
land_cover_classifier = LandCoverClassifier()
