"""
PNG Overlay Generation Service
Phase 8D.5: Convert GeoTIFF to PNG with color mapping for CesiumJS
"""

import numpy as np
import rasterio
from PIL import Image
from typing import Dict, Any, Tuple
import logging

logger = logging.getLogger(__name__)


class PNGOverlayService:
    """Service for converting classified GeoTIFF rasters to PNG overlays with color mapping"""

    # Color mapping for NDVI change classification
    # Format: (R, G, B, A) - alpha channel for transparency
    # Must match frontend colors exactly (Tailwind colors)
    COLOR_MAP = {
        0: (0, 0, 0, 0),           # No Data: Transparent
        1: (220, 38, 38, 230),     # Strong Decrease: Red (#DC2626)
        2: (249, 115, 22, 230),    # Moderate Decrease: Orange (#F97316)
        3: (148, 163, 184, 200),   # Stable: Gray (#94A3B8)
        4: (132, 204, 22, 230),    # Moderate Increase: Light Green (#84CC16)
        5: (22, 163, 74, 230)      # Strong Increase: Dark Green (#16A34A)
    }

    @staticmethod
    def geotiff_to_png(
        geotiff_path: str,
        output_png_path: str
    ) -> Dict[str, Any]:
        """
        Convert classified GeoTIFF to PNG with color mapping.

        Args:
            geotiff_path: Path to input GeoTIFF file
            output_png_path: Path to save output PNG file

        Returns:
            Dictionary with conversion metadata and bounds

        Raises:
            FileNotFoundError: If GeoTIFF file not found
            ValueError: If GeoTIFF is invalid or has wrong format
        """
        try:
            # Read GeoTIFF
            with rasterio.open(geotiff_path, 'r') as src:
                # Validate raster properties
                if src.count != 1:
                    raise ValueError(f"Expected single-band raster, got {src.count} bands")

                if src.dtypes[0] != 'uint8':
                    raise ValueError(f"Expected uint8 dtype, got {src.dtypes[0]}")

                # Read classified array
                classified_array = src.read(1)
                height, width = classified_array.shape

                # Get geographic bounds
                bounds = src.bounds
                crs = src.crs
                transform = src.transform

                logger.info(f"[PNG Overlay] Read GeoTIFF: {width}x{height}, bounds={bounds}")

                # Create RGBA image
                rgba_image = np.zeros((height, width, 4), dtype=np.uint8)

                # Apply color mapping
                for class_value, color in PNGOverlayService.COLOR_MAP.items():
                    mask = classified_array == class_value
                    rgba_image[mask] = color

                # Count pixels per class
                unique, counts = np.unique(classified_array, return_counts=True)
                pixel_counts = dict(zip(unique.tolist(), counts.tolist()))

                # Convert to PIL Image
                pil_image = Image.fromarray(rgba_image, mode='RGBA')

                # Save as PNG
                pil_image.save(output_png_path, 'PNG', compress_level=6)

                logger.info(f"[PNG Overlay] Saved PNG: {output_png_path}")

                return {
                    'output_path': output_png_path,
                    'width': width,
                    'height': height,
                    'bounds': {
                        'west': bounds.left,
                        'south': bounds.bottom,
                        'east': bounds.right,
                        'north': bounds.top
                    },
                    'crs': str(crs),
                    'transform': [transform.a, transform.b, transform.c,
                                 transform.d, transform.e, transform.f],
                    'pixel_counts': pixel_counts,
                    'color_map': {
                        str(k): {'rgb': v[:3], 'alpha': v[3], 'label': PNGOverlayService._get_class_label(k)}
                        for k, v in PNGOverlayService.COLOR_MAP.items()
                    }
                }

        except FileNotFoundError:
            raise FileNotFoundError(f"GeoTIFF file not found: {geotiff_path}")
        except Exception as e:
            logger.error(f"[PNG Overlay] Conversion failed: {str(e)}")
            raise ValueError(f"Failed to convert GeoTIFF to PNG: {str(e)}")

    @staticmethod
    def _get_class_label(class_value: int) -> str:
        """Get human-readable label for classification value"""
        labels = {
            0: 'No Data',
            1: 'Strong Decrease (< -0.2)',
            2: 'Moderate Decrease (-0.2 to -0.1)',
            3: 'Stable (-0.1 to +0.1)',
            4: 'Moderate Increase (+0.1 to +0.2)',
            5: 'Strong Increase (> +0.2)'
        }
        return labels.get(class_value, 'Unknown')

    @staticmethod
    def extract_geotiff_bounds(geotiff_path: str) -> Dict[str, Any]:
        """
        Extract geographic bounds from GeoTIFF without full conversion.

        Args:
            geotiff_path: Path to GeoTIFF file

        Returns:
            Dictionary with bounds, CRS, and dimensions
        """
        try:
            with rasterio.open(geotiff_path, 'r') as src:
                bounds = src.bounds
                return {
                    'west': bounds.left,
                    'south': bounds.bottom,
                    'east': bounds.right,
                    'north': bounds.top,
                    'crs': str(src.crs),
                    'width': src.width,
                    'height': src.height
                }
        except Exception as e:
            raise ValueError(f"Failed to extract bounds: {str(e)}")


# Singleton instance
png_overlay_service = PNGOverlayService()
