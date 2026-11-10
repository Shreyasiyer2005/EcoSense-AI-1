"""
Integration Tests for GeoTIFF Export Endpoint
Phase 8D.4: Backend API integration tests
"""

import pytest
import numpy as np
import tempfile
import os
from fastapi.testclient import TestClient
from app.main import app
import rasterio

client = TestClient(app)


class TestGeoTIFFExportEndpoint:
    """Test the /ndvi/export-geotiff endpoint"""

    def test_successful_geotiff_export(self):
        """Export GeoTIFF with valid classified array and metadata"""
        # Create test classified array
        np.random.seed(42)
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

        # Validated spatial metadata
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

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "spatial_metadata": spatial_metadata,
            "output_filename": "test_export.tif",
            "compression": "DEFLATE"
        })

        # Check response
        assert response.status_code == 200
        assert response.headers['content-type'] == 'image/tiff'
        assert 'content-disposition' in response.headers
        assert 'test_export.tif' in response.headers['content-disposition']

        # Verify it's a valid GeoTIFF
        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        try:
            with rasterio.open(tmp_path, 'r') as src:
                assert src.width == 50
                assert src.height == 50
                assert src.count == 1
                assert src.dtypes[0] == 'uint8'

                # Verify CRS is WGS84
                crs_str = src.crs.to_string()
                assert 'WGS 84' in crs_str or 'EPSG:4326' in crs_str

                # Verify bounds
                bounds = src.bounds
                assert abs(bounds.left - 75.7337) < 1e-5
                assert abs(bounds.bottom - 12.4164) < 1e-5
                assert abs(bounds.right - 75.7437) < 1e-5
                assert abs(bounds.top - 12.4264) < 1e-5

                # Verify pixel data
                data = src.read(1)
                assert data.shape == (50, 50)
                assert np.array_equal(data, classified_array)

        finally:
            os.unlink(tmp_path)

    def test_export_with_lwz_compression(self):
        """Export with LZW compression"""
        classified_array = np.random.randint(0, 6, size=(30, 30), dtype=np.uint8)

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

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "spatial_metadata": spatial_metadata,
            "output_filename": "test_lwz.tif",
            "compression": "LZW"
        })

        assert response.status_code == 200
        assert len(response.content) > 0

    def test_export_fails_with_invalid_metadata(self):
        """Export should fail with unvalidated metadata"""
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

        # Unvalidated metadata
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

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "spatial_metadata": spatial_metadata,
            "output_filename": "test_invalid.tif"
        })

        assert response.status_code == 400
        assert 'not validated' in response.json()['detail'].lower()

    def test_export_fails_without_classified_array(self):
        """Export should fail without classified_array"""
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

        response = client.post("/ndvi/export-geotiff", json={
            "spatial_metadata": spatial_metadata,
            "output_filename": "test.tif"
        })

        assert response.status_code == 400
        assert 'classified_array is required' in response.json()['detail']

    def test_export_fails_without_spatial_metadata(self):
        """Export should fail without spatial_metadata"""
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "output_filename": "test.tif"
        })

        assert response.status_code == 400
        assert 'spatial_metadata is required' in response.json()['detail']

    def test_export_with_invalid_bbox(self):
        """Export should fail with invalid bbox coordinates"""
        classified_array = np.random.randint(0, 6, size=(50, 50), dtype=np.uint8)

        # Invalid bbox (west > east)
        spatial_metadata = {
            'validated': True,
            'bbox': {
                'west': 75.8,
                'south': 12.4,
                'east': 75.7,  # Invalid: west > east
                'north': 12.5,
                'crs': 'EPSG:4326'
            },
            'crs': 'EPSG:4326'
        }

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "spatial_metadata": spatial_metadata,
            "output_filename": "test.tif"
        })

        # Should fail during transform creation
        assert response.status_code == 400
        assert 'failed' in response.json()['detail'].lower()

    def test_export_realistic_madikeri_scenario(self):
        """Export with realistic Madikeri monitoring zone data"""
        # Create realistic 110x110 classified array
        np.random.seed(42)
        height, width = 110, 110

        # Simulate realistic distribution
        classified_array = np.zeros((height, width), dtype=np.uint8)
        classified_array.flat[:int(height*width*0.70)] = 3  # 70% stable
        classified_array.flat[int(height*width*0.70):int(height*width*0.85)] = 4  # 15% increase
        classified_array.flat[int(height*width*0.85):int(height*width*0.95)] = 2  # 10% decrease
        classified_array.flat[int(height*width*0.95):int(height*width*0.98)] = 5  # 3% strong increase
        # Rest stay as 0 (nodata)

        # Shuffle
        np.random.shuffle(classified_array.flat)

        # Actual Madikeri bounds
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

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array.tolist(),
            "spatial_metadata": spatial_metadata,
            "output_filename": "madikeri_ndvi_change.tif",
            "compression": "DEFLATE"
        })

        assert response.status_code == 200

        # Verify GeoTIFF properties
        with tempfile.NamedTemporaryFile(suffix='.tif', delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        try:
            with rasterio.open(tmp_path, 'r') as src:
                assert src.width == 110
                assert src.height == 110

                # Check pixel size (~10m at 12.4°N)
                transform = src.transform
                pixel_width_deg = transform.a
                pixel_height_deg = abs(transform.e)

                expected_width = (75.7437 - 75.7337) / 110
                expected_height = (12.4264 - 12.4164) / 110

                assert abs(pixel_width_deg - expected_width) < 1e-8
                assert abs(pixel_height_deg - expected_height) < 1e-8

        finally:
            os.unlink(tmp_path)


class TestEndpointErrorHandling:
    """Test error handling in GeoTIFF export endpoint"""

    def test_malformed_json(self):
        """Endpoint should handle malformed JSON"""
        response = client.post(
            "/ndvi/export-geotiff",
            data="not valid json",
            headers={"Content-Type": "application/json"}
        )

        # FastAPI returns 422 for JSON parse errors or 500 for other errors
        assert response.status_code in [422, 500]

    def test_wrong_array_dtype(self):
        """Endpoint should handle float arrays (silently converted to uint8)"""
        # Send float array - numpy will convert to uint8
        classified_array = (np.random.rand(50, 50) * 5).tolist()  # Values 0-5

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

        response = client.post("/ndvi/export-geotiff", json={
            "classified_array": classified_array,
            "spatial_metadata": spatial_metadata,
            "output_filename": "test.tif"
        })

        # Numpy will convert floats to uint8, so export should succeed
        assert response.status_code == 200
