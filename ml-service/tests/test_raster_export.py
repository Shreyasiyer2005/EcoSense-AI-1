"""
Unit Tests for Raster Export Service
Phase 8D.3: GeoTIFF export validation
"""

import pytest
import numpy as np
import tempfile
import os
from pathlib import Path
import rasterio
from rasterio.crs import CRS

from app.services.raster_export import RasterExportService, raster_export_service


class TestAffineTransformCreation:
    """Test affine transform generation from bbox and dimensions"""

    def test_valid_bbox_creates_transform(self):
        """Valid bbox and dimensions should create correct affine transform"""
        bbox = {
            'west': 75.7337,
            'south': 12.4164,
            'east': 75.7437,
            'north': 12.4264,
            'crs': 'EPSG:4326'
        }
        width = 100
        height = 100

        transform = RasterExportService.create_affine_transform(bbox, width, height)

        # Verify transform properties
        assert transform is not None
        assert transform.a > 0  # Pixel width (positive)
        assert transform.e < 0  # Pixel height (negative, top-to-bottom)

        # Verify pixel size matches bbox extent
        expected_pixel_width = (bbox['east'] - bbox['west']) / width
        expected_pixel_height = (bbox['north'] - bbox['south']) / height
        assert abs(transform.a - expected_pixel_width) < 1e-10
        assert abs(abs(transform.e) - expected_pixel_height) < 1e-10

        # Verify origin (top-left corner)
        assert abs(transform.c - bbox['west']) < 1e-10
        assert abs(transform.f - bbox['north']) < 1e-10

    def test_invalid_bbox_west_east_raises_error(self):
        """Bbox with west >= east should raise ValueError"""
        bbox = {
            'west': 75.8,
            'south': 12.4,
            'east': 75.7,  # west > east (invalid)
            'north': 12.5,
            'crs': 'EPSG:4326'
        }

        with pytest.raises(ValueError, match="west.*>=.*east"):
            RasterExportService.create_affine_transform(bbox, 100, 100)

    def test_invalid_bbox_south_north_raises_error(self):
        """Bbox with south >= north should raise ValueError"""
        bbox = {
            'west': 75.7,
            'south': 12.5,
            'east': 75.8,
            'north': 12.4,  # south > north (invalid)
            'crs': 'EPSG:4326'
        }

        with pytest.raises(ValueError, match="south.*>=.*north"):
            RasterExportService.create_affine_transform(bbox, 100, 100)

    def test_zero_width_raises_error(self):
        """Zero width should raise ValueError"""
        bbox = {
            'west': 75.7,
            'south': 12.4,
            'east': 75.8,
            'north': 12.5,
            'crs': 'EPSG:4326'
        }

        with pytest.raises(ValueError, match="Invalid dimensions"):
            RasterExportService.create_affine_transform(bbox, 0, 100)

    def test_negative_height_raises_error(self):
        """Negative height should raise ValueError"""
        bbox = {
            'west': 75.7,
            'south': 12.4,
            'east': 75.8,
            'north': 12.5,
            'crs': 'EPSG:4326'
        }

        with pytest.raises(ValueError, match="Invalid dimensions"):
            RasterExportService.create_affine_transform(bbox, 100, -50)


class TestSpatialMetadataValidation:
    """Test spatial metadata validation logic"""

    def test_valid_metadata_passes_validation(self):
        """Complete and validated metadata should pass"""
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
        array_shape = (100, 100)

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, array_shape
        )

        assert is_valid is True
        assert error_msg == "Spatial metadata valid"

    def test_unvalidated_metadata_fails(self):
        """Metadata with validated=False should fail"""
        spatial_metadata = {
            'validated': False,
            'warnings': ['CRS mismatch detected'],
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, (100, 100)
        )

        assert is_valid is False
        assert "not validated" in error_msg

    def test_missing_bbox_fails(self):
        """Missing bbox should fail validation"""
        spatial_metadata = {
            'validated': True,
            'crs': 'EPSG:4326'
        }

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, (100, 100)
        )

        assert is_valid is False
        assert "bbox" in error_msg.lower()

    def test_incomplete_bbox_fails(self):
        """Bbox missing required fields should fail"""
        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                # Missing east and north
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, (100, 100)
        )

        assert is_valid is False
        assert "missing" in error_msg.lower()

    def test_missing_crs_fails(self):
        """Missing CRS should fail validation"""
        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            }
            # Missing top-level crs
        }

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, (100, 100)
        )

        assert is_valid is False
        assert "crs" in error_msg.lower()

    def test_invalid_array_dimensions_fails(self):
        """Zero or negative array dimensions should fail"""
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

        is_valid, error_msg = RasterExportService.validate_spatial_metadata(
            spatial_metadata, (0, 100)
        )

        assert is_valid is False
        assert "dimensions" in error_msg.lower()


class TestGeoTIFFExport:
    """Test GeoTIFF export functionality"""

    def test_export_valid_geotiff(self):
        """Export classified array with valid metadata"""
        # Create test data
        np.random.seed(42)
        classified_array = np.random.randint(0, 6, size=(100, 100), dtype=np.uint8)

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

        # Export to temporary file
        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            # Verify result metadata
            assert result['output_path'] == output_path
            assert result['width'] == 100
            assert result['height'] == 100
            assert result['crs'] == 'EPSG:4326'
            assert result['bbox'] == spatial_metadata['bbox']
            assert result['compression'] == 'DEFLATE'
            assert result['nodata'] == 0

            # Verify validation passed
            assert result['validation']['valid'] is True
            assert len(result['validation']['errors']) == 0

            # Verify file exists and is valid GeoTIFF
            assert os.path.exists(output_path)
            with rasterio.open(output_path, 'r') as src:
                assert src.width == 100
                assert src.height == 100
                assert src.count == 1
                assert src.dtypes[0] == 'uint8'
                # CRS should be WGS84 (stored as WKT)
                assert 'WGS 84' in src.crs.to_string() or 'EPSG:4326' in src.crs.to_string()

                # Verify pixel values match
                exported_data = src.read(1)
                assert np.array_equal(exported_data, classified_array)

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_with_lwz_compression(self):
        """Export with LZW compression"""
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path,
                compression='LZW'
            )

            assert result['compression'] == 'LZW'
            assert result['validation']['valid'] is True

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_with_custom_nodata(self):
        """Export with custom nodata value"""
        classified_array = np.random.randint(1, 6, size=(50, 50), dtype=np.uint8)
        classified_array[0, 0] = 255  # Set one pixel to nodata

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path,
                nodata_value=255
            )

            assert result['nodata'] == 255

            with rasterio.open(output_path, 'r') as src:
                assert src.nodata == 255

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_fails_with_invalid_metadata(self):
        """Export should fail with invalid spatial metadata"""
        classified_array = np.random.randint(0, 6, size=(100, 100), dtype=np.uint8)

        # Invalid metadata (not validated)
        spatial_metadata = {
            'validated': False,
            'warnings': ['CRS mismatch'],
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            with pytest.raises(ValueError, match="Cannot export GeoTIFF"):
                RasterExportService.export_classified_geotiff(
                    classified_array,
                    spatial_metadata,
                    output_path
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_fails_with_non_2d_array(self):
        """Export should fail with non-2D array"""
        classified_array = np.random.randint(0, 6, size=(10, 10, 3), dtype=np.uint8)

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            with pytest.raises(ValueError, match="must be 2D"):
                RasterExportService.export_classified_geotiff(
                    classified_array,
                    spatial_metadata,
                    output_path
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_fails_with_wrong_dtype(self):
        """Export should fail with non-uint8 array"""
        classified_array = np.random.randint(0, 6, size=(100, 100)).astype(np.float32)

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            with pytest.raises(ValueError, match="must be uint8"):
                RasterExportService.export_classified_geotiff(
                    classified_array,
                    spatial_metadata,
                    output_path
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_export_fails_with_invalid_crs(self):
        """Export should fail with invalid CRS string"""
        classified_array = np.random.randint(0, 6, size=(100, 100), dtype=np.uint8)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.8,
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'INVALID:CRS:STRING'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            with pytest.raises(ValueError, match="Invalid CRS"):
                RasterExportService.export_classified_geotiff(
                    classified_array,
                    spatial_metadata,
                    output_path
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


class TestGeoTIFFValidation:
    """Test exported GeoTIFF validation"""

    def test_validation_detects_correct_properties(self):
        """Validation should confirm correct GeoTIFF properties"""
        # Create and export test GeoTIFF
        np.random.seed(42)
        classified_array = np.random.randint(0, 6, size=(100, 100), dtype=np.uint8)

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            validation = result['validation']

            # Check validation passed
            assert validation['valid'] is True
            assert len(validation['errors']) == 0

            # Check pixel counts
            assert 'pixel_counts' in validation
            unique_classes = list(validation['pixel_counts'].keys())
            assert all(c in range(0, 6) for c in unique_classes)

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_validation_detects_missing_file(self):
        """Validation should fail for missing file"""
        classified_array = np.random.randint(0, 6, size=(100, 100), dtype=np.uint8)

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

        validation = RasterExportService.validate_exported_geotiff(
            '/nonexistent/path/to/file.tif',
            classified_array,
            spatial_metadata
        )

        assert validation['valid'] is False
        assert len(validation['errors']) > 0


class TestRealWorldScenario:
    """Test with realistic Madikeri monitoring zone data"""

    def test_madikeri_export(self):
        """Export GeoTIFF for Madikeri monitoring zone"""
        # Create realistic classified array (110x110 pixels, 10m resolution)
        np.random.seed(42)
        height, width = 110, 110

        # Simulate realistic NDVI change classification distribution
        classified_array = np.zeros((height, width), dtype=np.uint8)

        # 70% stable (class 3)
        stable_count = int(height * width * 0.70)
        classified_array.flat[:stable_count] = 3

        # 15% moderate increase (class 4)
        increase_count = int(height * width * 0.15)
        classified_array.flat[stable_count:stable_count+increase_count] = 4

        # 10% moderate decrease (class 2)
        decrease_count = int(height * width * 0.10)
        classified_array.flat[stable_count+increase_count:stable_count+increase_count+decrease_count] = 2

        # 3% strong increase (class 5)
        strong_inc = int(height * width * 0.03)
        classified_array.flat[stable_count+increase_count+decrease_count:stable_count+increase_count+decrease_count+strong_inc] = 5

        # 2% nodata (class 0)
        # Remaining pixels stay as 0

        # Shuffle to randomize spatial distribution
        np.random.shuffle(classified_array.flat)

        # Actual Madikeri monitoring zone bounds
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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            # Verify export succeeded
            assert result['validation']['valid'] is True
            assert result['width'] == 110
            assert result['height'] == 110

            # Verify geographic properties
            with rasterio.open(output_path, 'r') as src:
                # Check CRS (WGS84 in WKT format)
                assert 'WGS 84' in src.crs.to_string() or 'EPSG:4326' in src.crs.to_string()

                # Check bounds match Madikeri zone
                bounds = src.bounds
                assert abs(bounds.left - 75.7337) < 1e-6
                assert abs(bounds.bottom - 12.4164) < 1e-6
                assert abs(bounds.right - 75.7437) < 1e-6
                assert abs(bounds.top - 12.4264) < 1e-6

                # Check pixel size (~10m in degrees at this latitude)
                transform = src.transform
                pixel_width_deg = transform.a
                pixel_height_deg = abs(transform.e)

                # At 12.4°N latitude, 10m ≈ 0.00009° longitude, 0.00009° latitude
                expected_width_deg = (75.7437 - 75.7337) / 110
                expected_height_deg = (12.4264 - 12.4164) / 110

                assert abs(pixel_width_deg - expected_width_deg) < 1e-8
                assert abs(pixel_height_deg - expected_height_deg) < 1e-8

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_single_pixel_export(self):
        """Export 1x1 pixel GeoTIFF"""
        classified_array = np.array([[3]], dtype=np.uint8)

        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.7,
                'south': 12.4,
                'east': 75.701,
                'north': 12.401,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            assert result['validation']['valid'] is True
            assert result['width'] == 1
            assert result['height'] == 1

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_large_extent_small_pixels(self):
        """Export small pixel array over large geographic extent (low resolution)"""
        classified_array = np.random.randint(0, 6, size=(10, 10), dtype=np.uint8)

        # 1 degree extent with 10x10 pixels = 0.1 degree per pixel (~11km at equator)
        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.0,
                'south': 12.0,
                'east': 76.0,
                'north': 13.0,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326',
            'resolution': 11000.0  # Approximate meters per pixel
        }

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            assert result['validation']['valid'] is True

            with rasterio.open(output_path, 'r') as src:
                transform = src.transform
                # 1 degree / 10 pixels = 0.1 degree per pixel
                assert abs(transform.a - 0.1) < 1e-10
                assert abs(abs(transform.e) - 0.1) < 1e-10

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    def test_all_nodata_pixels(self):
        """Export GeoTIFF with all nodata pixels"""
        classified_array = np.zeros((50, 50), dtype=np.uint8)

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

        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            output_path = tmp.name

        try:
            result = RasterExportService.export_classified_geotiff(
                classified_array,
                spatial_metadata,
                output_path
            )

            assert result['validation']['valid'] is True
            assert result['validation']['pixel_counts'][0] == 2500  # All pixels are class 0

        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
