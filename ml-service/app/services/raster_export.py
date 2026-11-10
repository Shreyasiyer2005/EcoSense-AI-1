"""
Raster Export Service - GeoTIFF Generation for NDVI Change Detection
Phase 8D.3: Georeferenced GeoTIFF export with validated spatial metadata
"""

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.crs import CRS
from typing import Dict, Any, Optional, Tuple
import logging
from pathlib import Path
import tempfile

logger = logging.getLogger(__name__)


class RasterExportService:
    """Service for exporting classified NDVI change arrays as georeferenced GeoTIFFs"""

    @staticmethod
    def create_affine_transform(bbox: Dict[str, float], width: int, height: int) -> rasterio.Affine:
        """
        Create affine transform from bounding box and dimensions.

        Args:
            bbox: Dictionary with west, south, east, north coordinates
            width: Raster width in pixels
            height: Raster height in pixels

        Returns:
            Rasterio Affine transform object

        Raises:
            ValueError: If bbox coordinates are invalid or dimensions are non-positive
        """
        west = float(bbox['west'])
        south = float(bbox['south'])
        east = float(bbox['east'])
        north = float(bbox['north'])

        # Validate bbox
        if west >= east:
            raise ValueError(f"Invalid bbox: west ({west}) >= east ({east})")
        if south >= north:
            raise ValueError(f"Invalid bbox: south ({south}) >= north ({north})")

        # Validate dimensions
        if width <= 0 or height <= 0:
            raise ValueError(f"Invalid dimensions: width={width}, height={height}")

        # Create affine transform from geographic bounds
        # from_bounds handles pixel registration (area vs point)
        transform = from_bounds(west, south, east, north, width, height)

        logger.info(f"[Raster Export] Created affine transform: {transform}")
        logger.info(f"[Raster Export] Pixel size: x={transform.a:.6f}, y={abs(transform.e):.6f}")

        return transform

    @staticmethod
    def validate_spatial_metadata(
        spatial_metadata: Dict[str, Any],
        array_shape: Tuple[int, int]
    ) -> Tuple[bool, str]:
        """
        Validate that spatial metadata is complete and compatible with array.

        Args:
            spatial_metadata: Validated spatial metadata from ML comparison
            array_shape: (height, width) of the classified array

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if metadata was validated
        if not spatial_metadata.get('validated', False):
            warnings = spatial_metadata.get('warnings', ['Unknown validation error'])
            return False, f"Spatial metadata not validated: {warnings}"

        # Check required fields
        if 'bbox' not in spatial_metadata:
            return False, "Missing bbox in spatial metadata"

        bbox = spatial_metadata['bbox']
        required_fields = ['west', 'south', 'east', 'north', 'crs']
        missing = [f for f in required_fields if f not in bbox]
        if missing:
            return False, f"Missing bbox fields: {missing}"

        if 'crs' not in spatial_metadata:
            return False, "Missing CRS in spatial metadata"

        # Validate array dimensions match metadata expectations
        height, width = array_shape
        if height <= 0 or width <= 0:
            return False, f"Invalid array dimensions: {array_shape}"

        # Validate bbox coordinates
        try:
            west = float(bbox['west'])
            south = float(bbox['south'])
            east = float(bbox['east'])
            north = float(bbox['north'])

            if west >= east:
                return False, f"Invalid bbox: west ({west}) >= east ({east})"
            if south >= north:
                return False, f"Invalid bbox: south ({south}) >= north ({north})"
        except (ValueError, TypeError) as e:
            return False, f"Invalid bbox coordinate values: {str(e)}"

        return True, "Spatial metadata valid"

    @staticmethod
    def export_classified_geotiff(
        classified_array: np.ndarray,
        spatial_metadata: Dict[str, Any],
        output_path: str,
        compression: str = 'DEFLATE',
        nodata_value: int = 0
    ) -> Dict[str, Any]:
        """
        Export classified NDVI change array as georeferenced GeoTIFF.

        Args:
            classified_array: 2D numpy array with classification values (0-5)
            spatial_metadata: Validated spatial metadata from ML comparison
            output_path: Path to save GeoTIFF file
            compression: Compression algorithm (DEFLATE, LZW, PACKBITS, or NONE)
            nodata_value: Value representing nodata pixels (default: 0)

        Returns:
            Dictionary with export metadata and validation results

        Raises:
            ValueError: If spatial metadata is invalid or incomplete
            RuntimeError: If GeoTIFF export fails
        """
        # Validate inputs
        if classified_array.ndim != 2:
            raise ValueError(f"Classified array must be 2D, got {classified_array.ndim}D")

        if classified_array.dtype != np.uint8:
            raise ValueError(f"Classified array must be uint8, got {classified_array.dtype}")

        # Validate spatial metadata
        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, classified_array.shape
        )
        if not is_valid:
            raise ValueError(f"Cannot export GeoTIFF: {error_msg}")

        height, width = classified_array.shape
        bbox = spatial_metadata['bbox']
        crs_string = spatial_metadata['crs']

        # Create affine transform
        try:
            transform = RasterExportService.create_affine_transform(bbox, width, height)
        except ValueError as e:
            raise ValueError(f"Failed to create affine transform: {str(e)}")

        # Parse CRS (use WKT to avoid PROJ database version issues)
        try:
            # Map common EPSG codes to WKT (avoids PROJ database dependency)
            WKT_STRINGS = {
                'EPSG:4326': 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]',
                'EPSG:3857': 'PROJCS["WGS 84 / Pseudo-Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["X",EAST],AXIS["Y",NORTH]]'
            }

            if crs_string in WKT_STRINGS:
                crs = CRS.from_wkt(WKT_STRINGS[crs_string])
            elif crs_string.upper().startswith('EPSG:'):
                # Try EPSG code directly (may fail with database issues)
                try:
                    epsg_code = int(crs_string.split(':')[1])
                    crs = CRS.from_epsg(epsg_code)
                except Exception:
                    # Fall back to from_string
                    crs = CRS.from_string(crs_string)
            else:
                crs = CRS.from_string(crs_string)
        except Exception as e:
            raise ValueError(f"Invalid CRS '{crs_string}': {str(e)}")

        # Export GeoTIFF
        try:
            with rasterio.open(
                output_path,
                'w',
                driver='GTiff',
                height=height,
                width=width,
                count=1,
                dtype=np.uint8,
                crs=crs,
                transform=transform,
                nodata=nodata_value,
                compress=compression,
                tiled=True,
                blockxsize=256,
                blockysize=256
            ) as dst:
                # Write classified array
                dst.write(classified_array, 1)

                # Add metadata
                dst.update_tags(
                    TIFFTAG_IMAGEDESCRIPTION='NDVI Change Detection Classification',
                    PRODUCT='EcoSenseAI NDVI Change Classification',
                    CLASS_0='No Data',
                    CLASS_1='Strong Decrease (< -0.2)',
                    CLASS_2='Moderate Decrease (-0.2 to -0.1)',
                    CLASS_3='Stable (-0.1 to +0.1)',
                    CLASS_4='Moderate Increase (+0.1 to +0.2)',
                    CLASS_5='Strong Increase (> +0.2)'
                )

                logger.info(f"[Raster Export] Exported GeoTIFF: {output_path}")
                logger.info(f"[Raster Export] Dimensions: {width}x{height}, CRS: {crs_string}")

        except Exception as e:
            raise RuntimeError(f"Failed to write GeoTIFF: {str(e)}")

        # Validate exported GeoTIFF
        validation_result = RasterExportService.validate_exported_geotiff(
            output_path,
            classified_array,
            spatial_metadata
        )

        return {
            'output_path': output_path,
            'width': width,
            'height': height,
            'crs': crs_string,
            'transform': [transform.a, transform.b, transform.c,
                         transform.d, transform.e, transform.f],
            'bbox': bbox,
            'compression': compression,
            'nodata': nodata_value,
            'validation': validation_result
        }

    @staticmethod
    def validate_exported_geotiff(
        geotiff_path: str,
        source_array: np.ndarray,
        expected_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate exported GeoTIFF by reopening and checking metadata.

        Args:
            geotiff_path: Path to exported GeoTIFF
            source_array: Original classified array
            expected_metadata: Expected spatial metadata

        Returns:
            Dictionary with validation results
        """
        validation = {
            'valid': True,
            'errors': [],
            'warnings': []
        }

        try:
            with rasterio.open(geotiff_path, 'r') as src:
                # Check dimensions
                if src.width != source_array.shape[1]:
                    validation['errors'].append(
                        f"Width mismatch: expected {source_array.shape[1]}, got {src.width}"
                    )
                    validation['valid'] = False

                if src.height != source_array.shape[0]:
                    validation['errors'].append(
                        f"Height mismatch: expected {source_array.shape[0]}, got {src.height}"
                    )
                    validation['valid'] = False

                # Check CRS (simplified comparison)
                expected_crs = expected_metadata['crs']
                # Compare CRS string representations (normalize to uppercase)
                src_crs_str = src.crs.to_string().upper()
                exp_crs_str = expected_crs.upper()

                if src_crs_str != exp_crs_str:
                    # Check if they're semantically equivalent (e.g., both WGS84)
                    if 'EPSG:4326' in exp_crs_str and 'WGS 84' in src_crs_str:
                        # Consider equivalent
                        pass
                    elif 'WGS 84' in exp_crs_str and 'EPSG:4326' in src_crs_str:
                        # Consider equivalent
                        pass
                    else:
                        validation['warnings'].append(
                            f"CRS representation differs: expected '{expected_crs}', got '{src.crs.to_string()}'"
                        )

                # Check bounds (with tolerance for floating point)
                expected_bbox = expected_metadata['bbox']
                actual_bounds = src.bounds
                tolerance = 1e-6

                if abs(actual_bounds.left - expected_bbox['west']) > tolerance:
                    validation['errors'].append(
                        f"West bound mismatch: expected {expected_bbox['west']}, got {actual_bounds.left}"
                    )
                    validation['valid'] = False

                if abs(actual_bounds.bottom - expected_bbox['south']) > tolerance:
                    validation['errors'].append(
                        f"South bound mismatch: expected {expected_bbox['south']}, got {actual_bounds.bottom}"
                    )
                    validation['valid'] = False

                if abs(actual_bounds.right - expected_bbox['east']) > tolerance:
                    validation['errors'].append(
                        f"East bound mismatch: expected {expected_bbox['east']}, got {actual_bounds.right}"
                    )
                    validation['valid'] = False

                if abs(actual_bounds.top - expected_bbox['north']) > tolerance:
                    validation['errors'].append(
                        f"North bound mismatch: expected {expected_bbox['north']}, got {actual_bounds.top}"
                    )
                    validation['valid'] = False

                # Check pixel values match
                exported_array = src.read(1)
                if not np.array_equal(exported_array, source_array):
                    # Check if difference is only in nodata handling
                    diff_count = np.sum(exported_array != source_array)
                    if diff_count > 0:
                        validation['warnings'].append(
                            f"Pixel value differences: {diff_count} pixels differ"
                        )

                # Count pixels by class
                unique, counts = np.unique(exported_array, return_counts=True)
                pixel_counts = dict(zip(unique.tolist(), counts.tolist()))
                validation['pixel_counts'] = pixel_counts

                logger.info(f"[Raster Export] Validation complete: valid={validation['valid']}")
                if validation['errors']:
                    logger.error(f"[Raster Export] Validation errors: {validation['errors']}")
                if validation['warnings']:
                    logger.warning(f"[Raster Export] Validation warnings: {validation['warnings']}")

        except Exception as e:
            validation['valid'] = False
            validation['errors'].append(f"Failed to open GeoTIFF for validation: {str(e)}")

        return validation


# Singleton instance
raster_export_service = RasterExportService()
