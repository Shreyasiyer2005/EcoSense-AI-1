"""
Phase 1.5: Spatial Metadata Integration Tests

Tests for backend-to-ML spatial metadata passing and validation.
Verifies that:
1. Spatial metadata (bbox, CRS, resolution) is correctly received
2. Metadata validation catches incompatible or invalid data
3. Both rasters have compatible geographic extents
4. Missing metadata is safely handled
5. Existing comparison statistics remain unchanged
"""

import pytest
import numpy as np
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestSpatialMetadataAcceptance:
    """Test that spatial metadata is correctly received and validated."""

    def test_valid_spatial_metadata_accepted(self):
        """Valid spatial metadata should be accepted and included in response."""
        # Create simple test data
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            # Phase 1.5: Spatial metadata
            "bbox": {
                "west": 75.7337,
                "south": 12.4164,
                "east": 75.7437,
                "north": 12.4264,
                "crs": "EPSG:4326"
            },
            "spatial_resolution": 10.0,
            "earlier_crs": "EPSG:4326",
            "later_crs": "EPSG:4326"
        })

        assert response.status_code == 200
        result = response.json()

        # Verify spatial metadata is in response
        assert "spatial_metadata" in result
        spatial_meta = result["spatial_metadata"]

        # Verify validation passed
        assert spatial_meta.get("validated") == True
        assert "bbox" in spatial_meta
        assert spatial_meta["bbox"]["west"] == 75.7337
        assert spatial_meta["bbox"]["south"] == 12.4164
        assert spatial_meta["bbox"]["east"] == 75.7437
        assert spatial_meta["bbox"]["north"] == 12.4264
        assert spatial_meta["bbox"]["crs"] == "EPSG:4326"
        assert spatial_meta["resolution"] == 10.0
        assert spatial_meta["crs"] == "EPSG:4326"

    def test_missing_spatial_metadata_handled(self):
        """Missing spatial metadata should not break the comparison."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True
            # No spatial metadata provided
        })

        assert response.status_code == 200
        result = response.json()

        # Verify comparison still succeeds
        assert result["success"] == True
        assert "comparison" in result

        # Verify spatial metadata indicates missing data
        assert "spatial_metadata" in result
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta.get("validated") == False
        assert "warnings" in spatial_meta or "No spatial metadata provided" in str(spatial_meta)


class TestBboxValidation:
    """Test bounding box validation logic."""

    def test_incomplete_bbox_rejected(self):
        """Incomplete bbox (missing fields) should generate warnings."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            "bbox": {
                "west": 75.7337,
                "south": 12.4164
                # Missing east, north, crs
            }
        })

        assert response.status_code == 200
        result = response.json()

        # Comparison should still succeed
        assert result["success"] == True

        # But spatial metadata should have warnings
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta.get("validated") == False
        assert "warnings" in spatial_meta
        warnings_text = str(spatial_meta["warnings"])
        assert "missing fields" in warnings_text.lower() or "incomplete" in warnings_text.lower()

    def test_invalid_bbox_coordinates_rejected(self):
        """Invalid bbox coordinates (west >= east) should generate warnings."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            "bbox": {
                "west": 75.8,  # west > east (invalid)
                "south": 12.4,
                "east": 75.7,
                "north": 12.5,
                "crs": "EPSG:4326"
            }
        })

        assert response.status_code == 200
        result = response.json()

        # Comparison should still succeed
        assert result["success"] == True

        # But spatial metadata should have warnings
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta.get("validated") == False
        assert "warnings" in spatial_meta
        warnings_text = str(spatial_meta["warnings"])
        assert "west" in warnings_text.lower() and "east" in warnings_text.lower()


class TestCRSCompatibility:
    """Test CRS compatibility validation."""

    def test_crs_mismatch_warning(self):
        """Mismatched CRS between earlier and later should generate warning."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            "bbox": {
                "west": 75.7337,
                "south": 12.4164,
                "east": 75.7437,
                "north": 12.4264,
                "crs": "EPSG:4326"
            },
            "earlier_crs": "EPSG:4326",
            "later_crs": "EPSG:3857"  # Different CRS (Web Mercator)
        })

        assert response.status_code == 200
        result = response.json()

        # Comparison should still succeed
        assert result["success"] == True

        # But spatial metadata should have CRS mismatch warning
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta.get("validated") == False
        assert "warnings" in spatial_meta
        warnings_text = str(spatial_meta["warnings"])
        assert "crs" in warnings_text.lower() and "mismatch" in warnings_text.lower()

    def test_matching_crs_validated(self):
        """Matching CRS for both rasters should validate successfully."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            "bbox": {
                "west": 75.7337,
                "south": 12.4164,
                "east": 75.7437,
                "north": 12.4264,
                "crs": "EPSG:4326"
            },
            "spatial_resolution": 10.0,
            "earlier_crs": "EPSG:4326",
            "later_crs": "EPSG:4326"
        })

        assert response.status_code == 200
        result = response.json()

        assert result["success"] == True
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta.get("validated") == True
        assert spatial_meta["crs"] == "EPSG:4326"


class TestBackwardCompatibility:
    """Test that existing comparison functionality is preserved."""

    def test_comparison_without_spatial_metadata(self):
        """Comparison should work exactly as before when no spatial metadata provided."""
        earlier_red = np.full((10, 10), 5000, dtype=np.float32).tolist()
        earlier_nir = np.full((10, 10), 8000, dtype=np.float32).tolist()
        later_red = np.full((10, 10), 5000, dtype=np.float32).tolist()
        later_nir = np.full((10, 10), 8500, dtype=np.float32).tolist()

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True
        })

        assert response.status_code == 200
        result = response.json()

        # Verify all original fields still present
        assert "success" in result
        assert "earlier" in result
        assert "later" in result
        assert "comparison" in result
        assert "message" in result

        # Verify comparison statistics present
        assert "statistics" in result["comparison"]
        assert "change_categories" in result["comparison"]

        # Verify spatial_metadata field exists (even if validation failed)
        assert "spatial_metadata" in result

    def test_statistics_unchanged_with_spatial_metadata(self):
        """Adding spatial metadata should not change comparison statistics."""
        earlier_red = [[5000, 5000], [5000, 5000]]
        earlier_nir = [[8000, 8000], [8000, 8000]]
        later_red = [[5000, 5000], [5000, 5000]]
        later_nir = [[8500, 8500], [8500, 8500]]

        # Compare without spatial metadata
        response_without = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True
        })

        # Compare with spatial metadata
        response_with = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            "bbox": {
                "west": 75.7337,
                "south": 12.4164,
                "east": 75.7437,
                "north": 12.4264,
                "crs": "EPSG:4326"
            },
            "spatial_resolution": 10.0
        })

        assert response_without.status_code == 200
        assert response_with.status_code == 200

        result_without = response_without.json()
        result_with = response_with.json()

        # Statistics should be identical
        assert result_without["comparison"]["statistics"] == result_with["comparison"]["statistics"]
        assert result_without["comparison"]["change_categories"] == result_with["comparison"]["change_categories"]
        assert result_without["earlier"]["statistics"] == result_with["earlier"]["statistics"]
        assert result_without["later"]["statistics"] == result_with["later"]["statistics"]


class TestRealWorldScenario:
    """Test with realistic Madikeri monitoring zone data."""

    def test_madikeri_spatial_metadata(self):
        """Test with actual Madikeri bbox and resolution."""
        # Create realistic test data (10x10 for speed)
        np.random.seed(42)
        earlier_red = (np.random.uniform(2000, 3000, (10, 10))).tolist()
        earlier_nir = (np.random.uniform(7000, 9000, (10, 10))).tolist()
        later_red = (np.random.uniform(2000, 3000, (10, 10))).tolist()
        later_nir = (np.random.uniform(7500, 9500, (10, 10))).tolist()

        response = client.post("/ndvi/compare", json={
            "earlier_red_band": earlier_red,
            "earlier_nir_band": earlier_nir,
            "later_red_band": later_red,
            "later_nir_band": later_nir,
            "earlier_date": "2026-09-27",
            "later_date": "2026-10-29",
            "scale_input": True,
            # Actual Madikeri monitoring zone metadata
            "bbox": {
                "west": 75.7337,
                "south": 12.4164,
                "east": 75.7437,
                "north": 12.4264,
                "crs": "EPSG:4326"
            },
            "spatial_resolution": 10.0,  # Sentinel-2 native resolution
            "earlier_crs": "EPSG:4326",
            "later_crs": "EPSG:4326"
        })

        assert response.status_code == 200
        result = response.json()

        # Verify successful comparison
        assert result["success"] == True
        assert result["comparison"]["has_data"] == True

        # Verify spatial metadata validated
        spatial_meta = result["spatial_metadata"]
        assert spatial_meta["validated"] == True
        assert spatial_meta["bbox"]["west"] == 75.7337
        assert spatial_meta["bbox"]["east"] == 75.7437
        assert spatial_meta["resolution"] == 10.0
        assert spatial_meta["crs"] == "EPSG:4326"

        # Verify comparison results present
        assert "statistics" in result["comparison"]
        assert "change_categories" in result["comparison"]
        assert result["comparison"]["overlap_count"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
