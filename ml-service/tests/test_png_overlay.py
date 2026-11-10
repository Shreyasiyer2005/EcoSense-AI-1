"""
Unit Tests for PNG Overlay Service
Phase 8D.5: PNG conversion with color mapping
"""

import pytest
import numpy as np
import tempfile
import os
from PIL import Image
import rasterio

from app.services.png_overlay import PNGOverlayService, png_overlay_service
from app.services.raster_export import raster_export_service


class TestPNGConversion:
    """Test GeoTIFF to PNG conversion"""

    def test_successful_conversion(self):
        """Convert valid GeoTIFF to PNG with color mapping"""
        # Create test GeoTIFF
        np.random.seed(42)
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7337,
                'south': 12.4164,
                'east': 75.7437,
                'north': 12.4264,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326',
            'resolution': 10.0
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tif_tmp:
            geotiff_path = tif_tmp.name

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_tmp:
            png_path = png_tmp.name

        try:
            # Export GeoTIFF
            raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=geotiff_path
            )

            # Convert to PNG
            result = png_overlay_service.geotiff_to_png(
                geotiff_path=geotiff_path,
                output_png_path=png_path
            )

            # Verify result metadata
            assert result['width'] == 50
            assert result['height'] == 50
            assert 'bounds' in result
            assert abs(result['bounds']['west'] - 75.7337) < 1e-5
            assert abs(result['bounds']['south'] - 12.4164) < 1e-5
            assert result['output_path'] == png_path

            # Verify PNG file exists and is valid
            assert os.path.exists(png_path)

            # Open PNG and verify properties
            img = Image.open(png_path)
            assert img.size == (50, 50)
            assert img.mode == 'RGBA'

            # Verify color mapping
            img_array = np.array(img)

            # Check nodata pixels are transparent (alpha = 0)
            nodata_mask = classified_array == 0
            assert np.all(img_array[nodata_mask, 3] == 0)

            # Check class 3 (stable) pixels are gray
            class3_mask = classified_array == 3
            if np.any(class3_mask):
                # RGB should be ~(158, 158, 158)
                assert np.all(img_array[class3_mask, 0] > 100)  # R
                assert np.all(img_array[class3_mask, 1] > 100)  # G
                assert np.all(img_array[class3_mask, 2] > 100)  # B
                assert np.all(img_array[class3_mask, 3] > 0)    # Not transparent

        finally:
            if os.path.exists(geotiff_path):
                os.unlink(geotiff_path)
            if os.path.exists(png_path):
                os.unlink(png_path)

    def test_color_mapping_accuracy(self):
        """Verify exact color mapping for each class"""
        # Create GeoTIFF with known pattern (one pixel per class)
        classified_array = np.array([
            [0, 1, 2],
            [3, 4, 5],
            [0, 3, 5]
        ], dtype=np.uint8)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tif_tmp:
            geotiff_path = tif_tmp.name

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_tmp:
            png_path = png_tmp.name

        try:
            # Export and convert
            raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=geotiff_path
            )

            result = png_overlay_service.geotiff_to_png(
                geotiff_path=geotiff_path,
                output_png_path=png_path
            )

            # Read PNG
            img = Image.open(png_path)
            img_array = np.array(img)

            # Verify each class has correct color
            # Class 0 (0,0): No Data - Transparent
            assert tuple(img_array[0, 0]) == (0, 0, 0, 0)

            # Class 1 (0,1): Strong Decrease - Red
            assert img_array[0, 1, 0] == 211  # R
            assert img_array[0, 1, 1] == 47   # G
            assert img_array[0, 1, 2] == 47   # B
            assert img_array[0, 1, 3] == 230  # A

            # Class 2 (0,2): Moderate Decrease - Orange
            assert img_array[0, 2, 0] == 255  # R
            assert img_array[0, 2, 1] == 152  # G
            assert img_array[0, 2, 2] == 0    # B

            # Class 3 (1,0): Stable - Gray
            assert img_array[1, 0, 0] == 158  # R
            assert img_array[1, 0, 1] == 158  # G
            assert img_array[1, 0, 2] == 158  # B

            # Class 4 (1,1): Moderate Increase - Light Green
            assert img_array[1, 1, 0] == 139  # R
            assert img_array[1, 1, 1] == 195  # G
            assert img_array[1, 1, 2] == 74   # B

            # Class 5 (1,2): Strong Increase - Dark Green
            assert img_array[1, 2, 0] == 46   # R
            assert img_array[1, 2, 1] == 125  # G
            assert img_array[1, 2, 2] == 50   # B

        finally:
            if os.path.exists(geotiff_path):
                os.unlink(geotiff_path)
            if os.path.exists(png_path):
                os.unlink(png_path)

    def test_transparency_preservation(self):
        """Verify nodata pixels are fully transparent"""
        # All nodata array
        classified_array = np.zeros((30, 30), dtype=np.uint8)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tif_tmp:
            geotiff_path = tif_tmp.name

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_tmp:
            png_path = png_tmp.name

        try:
            raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=geotiff_path
            )

            png_overlay_service.geotiff_to_png(
                geotiff_path=geotiff_path,
                output_png_path=png_path
            )

            # Verify all pixels are transparent
            img = Image.open(png_path)
            img_array = np.array(img)

            # All alpha channel values should be 0
            assert np.all(img_array[:, :, 3] == 0)

        finally:
            if os.path.exists(geotiff_path):
                os.unlink(geotiff_path)
            if os.path.exists(png_path):
                os.unlink(png_path)

    def test_bounds_extraction(self):
        """Test bounds extraction without full conversion"""
        # Create simple GeoTIFF
        classified_array = np.ones((40, 40), dtype=np.uint8) * 3

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7337,
                'south': 12.4164,
                'east': 75.7437,
                'north': 12.4264,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tif_tmp:
            geotiff_path = tif_tmp.name

        try:
            raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=geotiff_path
            )

            # Extract bounds
            bounds = png_overlay_service.extract_geotiff_bounds(geotiff_path)

            assert abs(bounds['west'] - 75.7337) < 1e-5
            assert abs(bounds['south'] - 12.4164) < 1e-5
            assert abs(bounds['east'] - 75.7437) < 1e-5
            assert abs(bounds['north'] - 12.4264) < 1e-5
            assert bounds['width'] == 40
            assert bounds['height'] == 40

        finally:
            if os.path.exists(geotiff_path):
                os.unlink(geotiff_path)

    def test_conversion_fails_with_missing_file(self):
        """Conversion should fail if GeoTIFF doesn't exist"""
        with pytest.raises(ValueError, match="Failed to convert"):
            png_overlay_service.geotiff_to_png(
                geotiff_path='/nonexistent/file.tif',
                output_png_path='/tmp/output.png'
            )

    def test_madikeri_realistic_scenario(self):
        """Test with realistic Madikeri data"""
        # Create realistic 110x110 array
        np.random.seed(42)
        height, width = 110, 110

        classified_array = np.zeros((height, width), dtype=np.uint8)
        classified_array.flat[:int(height*width*0.70)] = 3  # 70% stable
        classified_array.flat[int(height*width*0.70):int(height*width*0.85)] = 4
        classified_array.flat[int(height*width*0.85):int(height*width*0.95)] = 2
        classified_array.flat[int(height*width*0.95):int(height*width*0.98)] = 5
        np.random.shuffle(classified_array.flat)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7337,
                'south': 12.4164,
                'east': 75.7437,
                'north': 12.4264,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326',
            'resolution': 10.0
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tif_tmp:
            geotiff_path = tif_tmp.name

        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_tmp:
            png_path = png_tmp.name

        try:
            raster_export_service.export_classified_geotiff(
                classified_array=classified_array,
                spatial_metadata=spatial_metadata,
                output_path=geotiff_path
            )

            result = png_overlay_service.geotiff_to_png(
                geotiff_path=geotiff_path,
                output_png_path=png_path
            )

            # Verify PNG
            img = Image.open(png_path)
            assert img.size == (110, 110)
            assert img.mode == 'RGBA'

            # Verify bounds match Madikeri
            assert abs(result['bounds']['west'] - 75.7337) < 1e-5
            assert abs(result['bounds']['north'] - 12.4264) < 1e-5

            # Verify pixel counts
            assert 'pixel_counts' in result
            assert 3 in result['pixel_counts']  # Stable pixels present

            # Close image to release file handle
            img.close()

        finally:
            if os.path.exists(geotiff_path):
                os.unlink(geotiff_path)
            if os.path.exists(png_path):
                try:
                    os.unlink(png_path)
                except PermissionError:
                    pass  # File may still be locked on Windows
