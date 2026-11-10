"""
Phase 1: Geographic NDVI Change Overlay - Unit Tests

Tests for pixel array preservation and classification in temporal NDVI comparison.
Verifies that:
1. Pixel arrays are correctly preserved when requested
2. All five change categories are classified correctly
3. Pixel counts match statistical category counts
4. Existing comparison results remain backward-compatible
5. Spatial metadata limitations are clearly documented
"""

import pytest
import numpy as np
from app.services.ndvi import NDVIProcessor


class TestPixelArrayPreservation:
    """Test that pixel arrays are preserved when requested."""

    def test_preserve_arrays_true_includes_pixel_data(self):
        """When preserve_arrays=True, pixel arrays should be included in response."""
        processor = NDVIProcessor()

        # Create synthetic NDVI data with known changes
        # Earlier: uniform 0.5 NDVI
        earlier = np.full((10, 10), 0.5, dtype=np.float32)
        # Later: add strong increase in top-left, strong decrease in bottom-right
        later = earlier.copy()
        later[0:3, 0:3] = 0.75  # +0.25 change (strong increase)
        later[7:10, 7:10] = 0.25  # -0.25 change (strong decrease)

        # Valid masks (all valid)
        earlier_mask = np.ones((10, 10), dtype=bool)
        later_mask = np.ones((10, 10), dtype=bool)

        # Compare with preserve_arrays=True
        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=earlier_mask,
            later_valid_mask=later_mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Verify pixel_arrays key exists
        assert "pixel_arrays" in result
        assert result["pixel_arrays"] is not None

        # Verify array components
        pixel_arrays = result["pixel_arrays"]
        assert "shape" in pixel_arrays
        assert "classified_array" in pixel_arrays
        assert "ndvi_difference" in pixel_arrays
        assert "overlap_mask" in pixel_arrays
        assert "class_counts_verification" in pixel_arrays
        assert "metadata" in pixel_arrays

        # Verify shape
        assert pixel_arrays["shape"]["height"] == 10
        assert pixel_arrays["shape"]["width"] == 10

        # Verify metadata includes spatial warnings
        notes = pixel_arrays["metadata"]["notes"]
        assert any("Geographic coordinates must be provided by caller" in note for note in notes)
        assert any("ML service does not have access to bbox" in note for note in notes)

    def test_preserve_arrays_false_excludes_pixel_data(self):
        """When preserve_arrays=False, pixel arrays should NOT be included."""
        processor = NDVIProcessor()

        earlier = np.full((10, 10), 0.5, dtype=np.float32)
        later = np.full((10, 10), 0.6, dtype=np.float32)
        mask = np.ones((10, 10), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=False
        )

        # Verify pixel_arrays key does NOT exist
        assert "pixel_arrays" not in result

    def test_default_preserve_arrays_true(self):
        """Default behavior should preserve arrays (preserve_arrays defaults to True)."""
        processor = NDVIProcessor()

        earlier = np.full((5, 5), 0.5, dtype=np.float32)
        later = np.full((5, 5), 0.6, dtype=np.float32)
        mask = np.ones((5, 5), dtype=bool)

        # Call without specifying preserve_arrays (should default to True)
        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29"
        )

        # Should include pixel arrays by default
        assert "pixel_arrays" in result


class TestClassificationAccuracy:
    """Test that all five change categories are correctly classified."""

    def test_all_five_categories_classified(self):
        """Verify all five change categories are correctly identified."""
        processor = NDVIProcessor()

        # Create 10x10 grid with one pixel per category (plus nodata)
        earlier = np.full((10, 10), 0.5, dtype=np.float32)
        later = earlier.copy()

        # Strong decrease: -0.25 (row 0, col 0-9)
        later[0, :] = 0.25  # 0.25 - 0.5 = -0.25

        # Moderate decrease: -0.15 (row 1, col 0-9)
        later[1, :] = 0.35  # 0.35 - 0.5 = -0.15

        # Stable: 0.0 (row 2, col 0-9)
        later[2, :] = 0.5  # 0.5 - 0.5 = 0.0

        # Moderate increase: +0.15 (row 3, col 0-9)
        later[3, :] = 0.65  # 0.65 - 0.5 = +0.15

        # Strong increase: +0.25 (row 4, col 0-9)
        later[4, :] = 0.75  # 0.75 - 0.5 = +0.25

        # Rows 5-9 remain at 0.5 (stable)

        mask = np.ones((10, 10), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Check that all categories have > 0 counts
        categories = result["change_categories"]
        assert categories["strong_decrease"]["count"] == 10
        assert categories["moderate_decrease"]["count"] == 10
        assert categories["stable"]["count"] == 60  # rows 2, 5-9
        assert categories["moderate_increase"]["count"] == 10
        assert categories["strong_increase"]["count"] == 10

        # Verify classified array
        classified = np.array(result["pixel_arrays"]["classified_array"], dtype=np.uint8)
        assert np.sum(classified == 1) == 10  # strong_decrease
        assert np.sum(classified == 2) == 10  # moderate_decrease
        assert np.sum(classified == 3) == 60  # stable
        assert np.sum(classified == 4) == 10  # moderate_increase
        assert np.sum(classified == 5) == 10  # strong_increase
        assert np.sum(classified == 0) == 0   # no nodata (all valid)

    def test_classification_boundary_thresholds(self):
        """Test exact threshold boundaries for each category."""
        processor = NDVIProcessor()

        earlier = np.full((6, 1), 0.5, dtype=np.float32)
        later = np.array([
            [0.29],   # -0.21 (just below -0.2, strong decrease)
            [0.3],    # -0.20 (exactly -0.2, moderate decrease)
            [0.4],    # -0.10 (exactly -0.1, stable)
            [0.599],  # +0.099 (just below +0.1, stable)
            [0.611],  # +0.111 (just above +0.1, moderate increase)
            [0.71]    # +0.21 (just above +0.2, strong increase)
        ], dtype=np.float32)

        mask = np.ones((6, 1), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        classified = np.array(result["pixel_arrays"]["classified_array"], dtype=np.uint8)

        # Verify exact classifications
        assert classified[0, 0] == 1  # -0.21 → strong_decrease
        assert classified[1, 0] == 2  # -0.20 → moderate_decrease (>= -0.2)
        assert classified[2, 0] == 3  # -0.10 → stable (>= -0.1)
        assert classified[3, 0] == 3  # +0.099 → stable (<= +0.1)
        assert classified[4, 0] == 4  # +0.111 → moderate_increase (> +0.1)
        assert classified[5, 0] == 5  # +0.21 → strong_increase (> +0.2)


class TestPixelCountVerification:
    """Test that pixel counts in classified array match statistical categories."""

    def test_counts_match_statistics(self):
        """Classified array counts must exactly match change_categories counts."""
        processor = NDVIProcessor()

        # Create diverse change pattern
        np.random.seed(42)
        earlier = np.random.uniform(0.3, 0.7, (20, 20)).astype(np.float32)
        later = earlier + np.random.uniform(-0.3, 0.3, (20, 20)).astype(np.float32)

        # Clip to valid NDVI range
        later = np.clip(later, -0.1, 1.0)

        mask = np.ones((20, 20), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Get counts from both sources
        category_counts = result["change_categories"]
        verification_counts = result["pixel_arrays"]["class_counts_verification"]

        # Verify exact matches
        assert verification_counts["strong_decrease"] == category_counts["strong_decrease"]["count"]
        assert verification_counts["moderate_decrease"] == category_counts["moderate_decrease"]["count"]
        assert verification_counts["stable"] == category_counts["stable"]["count"]
        assert verification_counts["moderate_increase"] == category_counts["moderate_increase"]["count"]
        assert verification_counts["strong_increase"] == category_counts["strong_increase"]["count"]

        # Verify total
        total_classified = sum([
            verification_counts["strong_decrease"],
            verification_counts["moderate_decrease"],
            verification_counts["stable"],
            verification_counts["moderate_increase"],
            verification_counts["strong_increase"]
        ])
        assert total_classified == result["overlap_count"]

    def test_nodata_pixels_classified_as_zero(self):
        """Masked/nodata pixels should be classified as 0."""
        processor = NDVIProcessor()

        earlier = np.full((10, 10), 0.5, dtype=np.float32)
        later = np.full((10, 10), 0.6, dtype=np.float32)

        # Create masks with some invalid pixels
        earlier_mask = np.ones((10, 10), dtype=bool)
        later_mask = np.ones((10, 10), dtype=bool)

        # Make corners invalid in later mask
        later_mask[0:2, 0:2] = False
        later_mask[8:10, 8:10] = False

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=earlier_mask,
            later_valid_mask=later_mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        classified = np.array(result["pixel_arrays"]["classified_array"], dtype=np.uint8)

        # Verify nodata pixels are 0
        assert classified[0, 0] == 0
        assert classified[1, 1] == 0
        assert classified[8, 8] == 0
        assert classified[9, 9] == 0

        # Verify nodata count
        verification = result["pixel_arrays"]["class_counts_verification"]
        assert verification["nodata"] == 8  # 4 + 4 corner pixels


class TestBackwardCompatibility:
    """Test that existing comparison results remain unchanged."""

    def test_existing_fields_unchanged(self):
        """All existing response fields must still be present."""
        processor = NDVIProcessor()

        earlier = np.full((10, 10), 0.5, dtype=np.float32)
        later = np.full((10, 10), 0.6, dtype=np.float32)
        mask = np.ones((10, 10), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Verify all original fields exist
        required_fields = [
            "has_data",
            "earlier_date",
            "later_date",
            "overlap_count",
            "overlap_percentage",
            "statistics",
            "change_categories",
            "summary",
            "insights",
            "limitations",
            "warning"
        ]

        for field in required_fields:
            assert field in result, f"Missing required field: {field}"

        # Verify statistics structure
        stats = result["statistics"]
        assert "min" in stats
        assert "max" in stats
        assert "mean" in stats
        assert "median" in stats
        assert "std" in stats
        assert "count" in stats

        # Verify change_categories structure
        categories = result["change_categories"]
        assert "strong_decrease" in categories
        assert "moderate_decrease" in categories
        assert "stable" in categories
        assert "moderate_increase" in categories
        assert "strong_increase" in categories

        for cat_name, cat_data in categories.items():
            assert "threshold" in cat_data
            assert "count" in cat_data
            assert "percentage" in cat_data
            assert "description" in cat_data

    def test_statistics_values_unchanged(self):
        """Statistical calculations should produce identical results."""
        processor = NDVIProcessor()

        earlier = np.array([[0.3, 0.4], [0.5, 0.6]], dtype=np.float32)
        later = np.array([[0.4, 0.5], [0.6, 0.7]], dtype=np.float32)
        mask = np.ones((2, 2), dtype=bool)

        # Compare with and without preserve_arrays
        result_with = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        result_without = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=False
        )

        # Verify statistics are identical
        assert result_with["statistics"] == result_without["statistics"]
        assert result_with["change_categories"] == result_without["change_categories"]
        assert result_with["overlap_count"] == result_without["overlap_count"]
        assert result_with["summary"] == result_without["summary"]


class TestSpatialMetadataLimitations:
    """Test that spatial metadata limitations are clearly documented."""

    def test_metadata_includes_spatial_warnings(self):
        """Pixel array metadata must include warnings about missing spatial info."""
        processor = NDVIProcessor()

        earlier = np.full((5, 5), 0.5, dtype=np.float32)
        later = np.full((5, 5), 0.6, dtype=np.float32)
        mask = np.ones((5, 5), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        metadata = result["pixel_arrays"]["metadata"]
        notes = metadata["notes"]

        # Verify critical warnings are present
        required_warnings = [
            "Geographic coordinates must be provided by caller",
            "ML service does not have access to bbox",
            "Spatial metadata must be derived from source raster"
        ]

        notes_text = " ".join(notes)
        for warning in required_warnings:
            assert warning in notes_text, f"Missing spatial metadata warning: {warning}"

    def test_class_legend_present(self):
        """Classified array must include class value legend."""
        processor = NDVIProcessor()

        earlier = np.full((3, 3), 0.5, dtype=np.float32)
        later = np.full((3, 3), 0.6, dtype=np.float32)
        mask = np.ones((3, 3), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        legend = result["pixel_arrays"]["metadata"]["class_legend"]

        # Verify all class values documented
        assert "0" in legend  # nodata
        assert "1" in legend  # strong_decrease
        assert "2" in legend  # moderate_decrease
        assert "3" in legend  # stable
        assert "4" in legend  # moderate_increase
        assert "5" in legend  # strong_increase

        # Verify descriptions include thresholds
        assert "< -0.2" in legend["1"]
        assert "-0.2 to -0.1" in legend["2"]
        assert "-0.1 to +0.1" in legend["3"]
        assert "+0.1 to +0.2" in legend["4"]
        assert "> +0.2" in legend["5"]


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_no_overlap_returns_no_pixel_arrays(self):
        """When overlap_count is 0, no pixel arrays should be generated."""
        processor = NDVIProcessor()

        earlier = np.full((5, 5), 0.5, dtype=np.float32)
        later = np.full((5, 5), 0.6, dtype=np.float32)

        # No overlap - masks don't overlap
        earlier_mask = np.zeros((5, 5), dtype=bool)
        later_mask = np.zeros((5, 5), dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=earlier_mask,
            later_valid_mask=later_mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Should return early with no data
        assert result["has_data"] is False
        assert "pixel_arrays" not in result

    def test_single_pixel_comparison(self):
        """Test with minimal 1x1 array."""
        processor = NDVIProcessor()

        earlier = np.array([[0.4]], dtype=np.float32)
        later = np.array([[0.7]], dtype=np.float32)  # +0.3 change
        mask = np.array([[True]], dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=mask,
            later_valid_mask=mask,
            earlier_date="2026-09-27",
            later_date="2026-10-29",
            preserve_arrays=True
        )

        # Should work with 1x1 array
        assert result["has_data"] is True
        assert result["overlap_count"] == 1

        classified = np.array(result["pixel_arrays"]["classified_array"], dtype=np.uint8)
        assert classified.shape == (1, 1)
        assert classified[0, 0] == 5  # +0.3 is strong increase


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
