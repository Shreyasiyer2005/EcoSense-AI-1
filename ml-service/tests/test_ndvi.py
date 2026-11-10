"""
Tests for NDVI calculation using synthetic test fixtures.

These tests use artificially generated data to validate the NDVI calculation logic,
masking behavior, and edge cases. They do NOT represent real satellite observations.
"""

import pytest
import numpy as np
from app.services.ndvi import NDVIProcessor


class TestNDVICalculation:
    """Test basic NDVI calculation logic with synthetic data."""

    def test_perfect_vegetation_ndvi(self):
        """Test NDVI calculation for synthetic perfect vegetation (high NIR, low Red)."""
        processor = NDVIProcessor()

        # Create synthetic data: high NIR (8000), low Red (2000)
        # Expected NDVI = (0.8 - 0.2) / (0.8 + 0.2) = 0.6
        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 10), 2000, dtype=np.uint16)

        result = processor.calculate_ndvi(red, nir, scale_input=True)

        assert result["ndvi"].shape == (10, 10)
        assert result["statistics"]["count"] == 100
        assert abs(result["statistics"]["mean"] - 0.6) < 0.01
        assert abs(result["statistics"]["std"]) < 0.01  # Should be nearly uniform

    def test_water_ndvi(self):
        """Test NDVI calculation for synthetic water (low NIR, higher visible)."""
        processor = NDVIProcessor()

        # Water typically has negative NDVI (higher red than NIR)
        # Red: 3000, NIR: 1000 → NDVI = (0.1 - 0.3) / (0.1 + 0.3) = -0.5
        nir = np.full((10, 10), 1000, dtype=np.uint16)
        red = np.full((10, 10), 3000, dtype=np.uint16)

        result = processor.calculate_ndvi(red, nir, scale_input=True)

        assert result["statistics"]["count"] == 100
        assert abs(result["statistics"]["mean"] - (-0.5)) < 0.01
        assert result["statistics"]["min"] >= -1.0
        assert result["statistics"]["max"] <= 1.0

    def test_bare_soil_ndvi(self):
        """Test NDVI calculation for synthetic bare soil (similar NIR and Red)."""
        processor = NDVIProcessor()

        # Bare soil has NDVI near zero (similar red and NIR)
        # Red: 5000, NIR: 5000 → NDVI = 0
        nir = np.full((10, 10), 5000, dtype=np.uint16)
        red = np.full((10, 10), 5000, dtype=np.uint16)

        result = processor.calculate_ndvi(red, nir, scale_input=True)

        assert result["statistics"]["count"] == 100
        # NDVI should be very close to zero for equal reflectance
        assert abs(result["statistics"]["mean"]) < 0.001

    def test_division_by_zero_protection(self):
        """Test that division by zero is handled (both NIR and Red are zero)."""
        processor = NDVIProcessor()

        # All pixels are zero (dark pixels)
        nir = np.zeros((10, 10), dtype=np.uint16)
        red = np.zeros((10, 10), dtype=np.uint16)

        result = processor.calculate_ndvi(red, nir, scale_input=True)

        # Should not raise an error
        # All pixels should be NaN (invalid due to zero denominator)
        assert np.all(np.isnan(result["ndvi"]))
        assert result["statistics"]["count"] == 0

    def test_nodata_handling(self):
        """Test that nodata values are properly masked."""
        processor = NDVIProcessor()

        # Create data with nodata values
        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 10), 2000, dtype=np.uint16)

        # Set some pixels to nodata (e.g., 0)
        nir[0:5, 0:5] = 0
        red[0:5, 0:5] = 0

        result = processor.calculate_ndvi(
            red, nir,
            red_nodata=0,
            nir_nodata=0,
            scale_input=True
        )

        # Only 75 pixels should be valid (10x10 - 5x5 = 75)
        assert result["statistics"]["count"] == 75

        # Nodata pixels should be NaN
        assert np.all(np.isnan(result["ndvi"][0:5, 0:5]))

        # Valid pixels should have NDVI ~ 0.6
        assert abs(result["statistics"]["mean"] - 0.6) < 0.01

    def test_external_quality_mask(self):
        """Test that external quality mask is applied."""
        processor = NDVIProcessor()

        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 10), 2000, dtype=np.uint16)

        # Create quality mask that masks out top half
        quality_mask = np.ones((10, 10), dtype=bool)
        quality_mask[0:5, :] = False

        result = processor.calculate_ndvi(
            red, nir,
            quality_mask=quality_mask,
            scale_input=True
        )

        # Only 50 pixels should be valid
        assert result["statistics"]["count"] == 50
        assert np.all(result["valid_mask"][5:, :])  # Bottom half is valid
        assert not np.any(result["valid_mask"][0:5, :])  # Top half is invalid

    def test_ndvi_range_validation(self):
        """Test that calculated NDVI values are within valid range [-1, 1]."""
        processor = NDVIProcessor()

        # Create various synthetic scenarios
        scenarios = [
            (8000, 2000),  # Healthy vegetation
            (1000, 3000),  # Water
            (5000, 5000),  # Bare soil
            (10000, 0),    # Maximum NIR, zero Red
            (0, 10000),    # Zero NIR, maximum Red
        ]

        for nir_val, red_val in scenarios:
            nir = np.full((10, 10), nir_val, dtype=np.uint16)
            red = np.full((10, 10), red_val, dtype=np.uint16)

            result = processor.calculate_ndvi(red, nir, scale_input=True)

            if result["statistics"]["count"] > 0:
                assert result["statistics"]["min"] >= -1.0 - processor.NDVI_TOLERANCE
                assert result["statistics"]["max"] <= 1.0 + processor.NDVI_TOLERANCE

    def test_shape_mismatch_raises_error(self):
        """Test that mismatched band shapes raise an error."""
        processor = NDVIProcessor()

        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 15), 2000, dtype=np.uint16)  # Different shape

        with pytest.raises(ValueError, match="shape .* does not match"):
            processor.calculate_ndvi(red, nir)

    def test_metadata_contains_processing_info(self):
        """Test that result metadata contains processing information."""
        processor = NDVIProcessor()

        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 10), 2000, dtype=np.uint16)

        result = processor.calculate_ndvi(red, nir, scale_input=True)

        metadata = result["metadata"]
        assert "formula" in metadata
        assert "NDVI" in metadata["formula"]
        assert metadata["red_band"] == "B04"
        assert metadata["nir_band"] == "B08"
        assert metadata["total_pixels"] == 100
        assert metadata["valid_pixels"] <= metadata["total_pixels"]
        assert 0 <= metadata["mask_percentage"] <= 100

    def test_statistics_with_no_valid_pixels(self):
        """Test statistics when all pixels are masked."""
        processor = NDVIProcessor()

        # All pixels are nodata
        nir = np.zeros((10, 10), dtype=np.uint16)
        red = np.zeros((10, 10), dtype=np.uint16)

        result = processor.calculate_ndvi(
            red, nir,
            red_nodata=0,
            nir_nodata=0,
            scale_input=True
        )

        stats = result["statistics"]
        assert stats["count"] == 0
        assert stats["mean"] is None
        assert stats["median"] is None
        assert stats["std"] is None

    def test_unscaled_input(self):
        """Test NDVI calculation with pre-scaled reflectance values."""
        processor = NDVIProcessor()

        # Use reflectance values directly (0.0 to 1.0)
        nir = np.full((10, 10), 0.8, dtype=np.float32)
        red = np.full((10, 10), 0.2, dtype=np.float32)

        result = processor.calculate_ndvi(red, nir, scale_input=False)

        assert result["statistics"]["count"] == 100
        assert abs(result["statistics"]["mean"] - 0.6) < 0.01

    def test_ndvi_interpretation(self):
        """Test NDVI value interpretation function."""
        processor = NDVIProcessor()

        # Test various NDVI ranges aligned with frontend legend
        # < 0.0: Water/Snow
        assert "Water" in processor.interpret_ndvi(-0.5) or "snow" in processor.interpret_ndvi(-0.5).lower()
        # 0.0-0.2: Bare Soil/Urban
        assert "Bare" in processor.interpret_ndvi(0.05) or "urban" in processor.interpret_ndvi(0.05).lower()
        # 0.2-0.4: Sparse Vegetation
        assert "Sparse" in processor.interpret_ndvi(0.3) or "vegetation" in processor.interpret_ndvi(0.3).lower()
        # 0.4-0.6: Moderate Vegetation
        assert "Moderate" in processor.interpret_ndvi(0.5)
        # 0.6-0.8: Dense Vegetation
        assert "Dense" in processor.interpret_ndvi(0.7)
        # 0.8-1.0: Very Dense Vegetation
        assert "Very" in processor.interpret_ndvi(0.9) or "dense" in processor.interpret_ndvi(0.9).lower()
        # Invalid
        assert "Invalid" in processor.interpret_ndvi(np.nan)


class TestNDVIValidation:
    """Test input validation and error handling."""

    def test_non_array_input_raises_error(self):
        """Test that non-numpy array input raises an error."""
        processor = NDVIProcessor()

        with pytest.raises(ValueError, match="must be a numpy array"):
            processor.calculate_ndvi([1, 2, 3], np.array([[1, 2]]))

    def test_non_2d_array_raises_error(self):
        """Test that non-2D array raises an error."""
        processor = NDVIProcessor()

        nir_1d = np.array([1, 2, 3, 4])
        red_2d = np.array([[1, 2], [3, 4]])

        with pytest.raises(ValueError, match="must be 2-dimensional"):
            processor.calculate_ndvi(red_2d, nir_1d)

    def test_invalid_quality_mask_shape_raises_error(self):
        """Test that quality mask with wrong shape raises an error."""
        processor = NDVIProcessor()

        nir = np.full((10, 10), 8000, dtype=np.uint16)
        red = np.full((10, 10), 2000, dtype=np.uint16)
        bad_mask = np.ones((5, 5), dtype=bool)  # Wrong shape

        with pytest.raises(ValueError, match="Quality mask shape"):
            processor.calculate_ndvi(red, nir, quality_mask=bad_mask)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


class TestVegetationCategories:
    """Test vegetation condition categorization."""

    def test_categories_with_diverse_ndvi(self):
        """Test category distribution with diverse NDVI values."""
        processor = NDVIProcessor()

        # Create NDVI array with known distribution
        # 10 pixels each of water (-0.2), bare (0.1), moderate (0.5), dense (0.7)
        ndvi = np.array([
            [-0.2, -0.2, -0.2, -0.2, -0.2, 0.1, 0.1, 0.1, 0.1, 0.1],
            [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.7, 0.7, 0.7, 0.7],
            [-0.2, -0.2, -0.2, -0.2, -0.2, 0.1, 0.1, 0.1, 0.1, 0.1],
            [0.5, 0.5, 0.5, 0.5, 0.5, 0.7, 0.7, 0.7, 0.7, 0.7]
        ], dtype=np.float32)

        valid_mask = np.ones_like(ndvi, dtype=bool)

        categories = processor.categorize_vegetation_condition(ndvi, valid_mask)

        assert categories["has_data"] is True
        assert categories["total_valid_pixels"] == 40
        assert len(categories["categories"]) == 6

        # Find specific categories
        water_cat = next(c for c in categories["categories"] if c["name"] == "Water/Snow")
        bare_cat = next(c for c in categories["categories"] if c["name"] == "Bare/Urban")
        moderate_cat = next(c for c in categories["categories"] if c["name"] == "Moderate Vegetation")
        dense_cat = next(c for c in categories["categories"] if c["name"] == "Dense Vegetation")

        # Check percentages (25% each = 10 pixels out of 40)
        assert abs(water_cat["percentage"] - 25.0) < 1.0
        assert abs(bare_cat["percentage"] - 25.0) < 1.0
        assert abs(moderate_cat["percentage"] - 25.0) < 1.0
        assert abs(dense_cat["percentage"] - 25.0) < 1.0

        # Check pixel counts
        assert water_cat["pixel_count"] == 10
        assert bare_cat["pixel_count"] == 10
        assert moderate_cat["pixel_count"] == 10
        assert dense_cat["pixel_count"] == 10

    def test_categories_boundary_values(self):
        """Test that boundary NDVI values are categorized correctly."""
        processor = NDVIProcessor()

        # Test exact boundary values
        ndvi = np.array([
            [-1.0, -0.01, 0.0, 0.0],  # Water/Snow, Water/Snow, Bare/Urban, Bare/Urban
            [0.2, 0.2, 0.4, 0.4],      # Low, Low, Moderate, Moderate
            [0.6, 0.6, 0.8, 0.8],      # Dense, Dense, Very Dense, Very Dense
            [1.0, 0.99, 0.5, 0.3]      # Very Dense, Very Dense, Moderate, Low
        ], dtype=np.float32)

        valid_mask = np.ones_like(ndvi, dtype=bool)

        categories = processor.categorize_vegetation_condition(ndvi, valid_mask)

        assert categories["total_valid_pixels"] == 16

        # Check that all pixels are categorized (sum should be 100%)
        total_pct = sum(c["percentage"] for c in categories["categories"])
        assert abs(total_pct - 100.0) < 0.1

        # Check that all pixels are counted
        total_count = sum(c["pixel_count"] for c in categories["categories"])
        assert total_count == 16

    def test_categories_with_no_valid_pixels(self):
        """Test categorization with no valid pixels."""
        processor = NDVIProcessor()

        ndvi = np.full((10, 10), np.nan, dtype=np.float32)
        valid_mask = np.zeros((10, 10), dtype=bool)

        categories = processor.categorize_vegetation_condition(ndvi, valid_mask)

        assert categories["has_data"] is False
        assert categories["total_valid_pixels"] == 0
        assert len(categories["categories"]) == 0

    def test_categories_all_same_value(self):
        """Test categorization when all pixels have same NDVI."""
        processor = NDVIProcessor()

        # All pixels have NDVI = 0.5 (moderate vegetation)
        ndvi = np.full((10, 10), 0.5, dtype=np.float32)
        valid_mask = np.ones((10, 10), dtype=bool)

        categories = processor.categorize_vegetation_condition(ndvi, valid_mask)

        assert categories["has_data"] is True
        assert categories["total_valid_pixels"] == 100

        # Find moderate vegetation category
        moderate = next(c for c in categories["categories"] if c["name"] == "Moderate Vegetation")
        assert moderate["percentage"] == 100.0
        assert moderate["pixel_count"] == 100

        # All other categories should have 0%
        for cat in categories["categories"]:
            if cat["name"] != "Moderate Vegetation":
                assert cat["percentage"] == 0.0
                assert cat["pixel_count"] == 0

        # Check dominant category
        assert categories["dominant_category"]["name"] == "Moderate Vegetation"
        assert categories["dominant_category"]["percentage"] == 100.0


class TestEnvironmentalInterpretation:
    """Test environmental interpretation generation."""

    def test_interpretation_with_valid_data(self):
        """Test that interpretation is generated with valid statistics."""
        processor = NDVIProcessor()

        statistics = {
            "mean": 0.65,
            "std": 0.15,
            "min": 0.2,
            "max": 0.9,
            "count": 10000
        }

        categories = {
            "has_data": True,
            "total_valid_pixels": 10000,
            "dominant_category": {"name": "Dense Vegetation", "percentage": 55.0},
            "categories": []
        }

        metadata = {
            "total_pixels": 10500,
            "mask_percentage": 4.76
        }

        interpretation = processor.calculate_environmental_interpretation(
            statistics, categories, metadata
        )

        assert "summary" in interpretation
        assert "insights" in interpretation
        assert "limitations" in interpretation
        assert "confidence_note" in interpretation

        assert len(interpretation["insights"]) > 0
        assert len(interpretation["limitations"]) > 0
        assert isinstance(interpretation["summary"], str)
        assert len(interpretation["summary"]) > 0

    def test_interpretation_with_no_data(self):
        """Test interpretation when no valid data is available."""
        processor = NDVIProcessor()

        statistics = {"mean": None, "std": None, "count": 0}
        categories = {"has_data": False, "total_valid_pixels": 0}
        metadata = {"total_pixels": 100, "mask_percentage": 100.0}

        interpretation = processor.calculate_environmental_interpretation(
            statistics, categories, metadata
        )

        assert interpretation["summary"] == "Insufficient data for interpretation"
        assert len(interpretation["limitations"]) > 0


class TestCategoryPercentageCalculation:
    """Test precise percentage calculations for edge cases."""

    def test_percentage_sum_is_100(self):
        """Test that category percentages sum to exactly 100%."""
        processor = NDVIProcessor()

        # Create various NDVI distributions
        test_cases = [
            np.linspace(-0.5, 1.0, 100),  # Uniform distribution
            np.random.uniform(-0.2, 0.9, 200),  # Random uniform
            np.concatenate([np.full(50, 0.1), np.full(50, 0.7)])  # Bimodal
        ]

        for ndvi in test_cases:
            valid_mask = np.ones_like(ndvi, dtype=bool)
            categories = processor.categorize_vegetation_condition(
                ndvi.reshape(-1, 1),
                valid_mask.reshape(-1, 1)
            )

            if categories["has_data"]:
                total_pct = sum(c["percentage"] for c in categories["categories"])
                # Allow small floating point tolerance
                assert abs(total_pct - 100.0) < 0.01, f"Percentages sum to {total_pct}, not 100%"

                total_count = sum(c["pixel_count"] for c in categories["categories"])
                assert total_count == categories["total_valid_pixels"]

    def test_single_pixel_categorization(self):
        """Test categorization with just one pixel."""
        processor = NDVIProcessor()

        ndvi = np.array([[0.5]], dtype=np.float32)
        valid_mask = np.array([[True]], dtype=bool)

        categories = processor.categorize_vegetation_condition(ndvi, valid_mask)

        assert categories["total_valid_pixels"] == 1

        # Find the category that got the pixel
        non_zero = [c for c in categories["categories"] if c["pixel_count"] > 0]
        assert len(non_zero) == 1
        assert non_zero[0]["percentage"] == 100.0
        assert non_zero[0]["pixel_count"] == 1



# ============================================================================
# Phase 6: Historical NDVI Comparison Tests
# ============================================================================

class TestHistoricalComparison:
    """Test temporal NDVI comparison functionality"""

    def test_identical_images_show_zero_change(self):
        """Identical NDVI images should show zero mean change"""
        processor = NDVIProcessor()

        # Create identical NDVI arrays
        ndvi = np.array([
            [0.3, 0.5, 0.7],
            [0.4, 0.6, 0.8],
            [0.5, 0.7, 0.9]
        ], dtype=np.float32)

        valid_mask = np.ones_like(ndvi, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=ndvi,
            later_ndvi=ndvi,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is True
        assert result["statistics"]["mean"] == 0.0
        assert result["statistics"]["min"] == 0.0
        assert result["statistics"]["max"] == 0.0
        assert result["change_categories"]["stable"]["count"] == 9  # All pixels stable


class TestHistoricalComparisonGreening:
    """Test greening (NDVI increase) detection"""

    def test_uniform_greening(self):
        """Test detection of uniform vegetation increase"""
        processor = NDVIProcessor()

        earlier = np.array([
            [0.2, 0.3, 0.4],
            [0.3, 0.4, 0.5],
            [0.4, 0.5, 0.6]
        ], dtype=np.float32)

        # All pixels increase by 0.15 (moderate increase)
        later = earlier + 0.15

        valid_mask = np.ones_like(earlier, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is True
        assert abs(result["statistics"]["mean"] - 0.15) < 0.01  # Allow floating point tolerance
        assert result["change_categories"]["moderate_increase"]["count"] == 9
        assert result["change_categories"]["stable"]["count"] == 0


class TestHistoricalComparisonBrowning:
    """Test browning (NDVI decrease) detection"""

    def test_strong_browning(self):
        """Test detection of significant vegetation decrease"""
        processor = NDVIProcessor()

        earlier = np.array([
            [0.7, 0.8, 0.9],
            [0.6, 0.7, 0.8],
            [0.5, 0.6, 0.7]
        ], dtype=np.float32)

        # All pixels decrease by 0.25 (strong decrease)
        later = earlier - 0.25

        valid_mask = np.ones_like(earlier, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is True
        assert result["statistics"]["mean"] == -0.25
        assert result["change_categories"]["strong_decrease"]["count"] == 9
        assert "browning" in result["summary"].lower()


class TestHistoricalComparisonMixedChanges:
    """Test mixed vegetation changes (some increase, some decrease)"""

    def test_mixed_changes(self):
        """Test detection of varied changes across landscape"""
        processor = NDVIProcessor()

        earlier = np.array([
            [0.3, 0.5, 0.7],
            [0.4, 0.6, 0.8],
            [0.5, 0.7, 0.9]
        ], dtype=np.float32)

        # Create mixed changes
        later = np.array([
            [0.1, 0.5, 0.85],  # strong decrease, stable, moderate increase
            [0.2, 0.6, 0.95],  # moderate decrease, stable, moderate increase
            [0.45, 0.7, 1.0],  # stable, stable, moderate increase
        ], dtype=np.float32)

        valid_mask = np.ones_like(earlier, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is True
        assert result["change_categories"]["strong_decrease"]["count"] >= 1
        assert result["change_categories"]["moderate_increase"]["count"] >= 1
        assert result["change_categories"]["stable"]["count"] >= 1


class TestHistoricalComparisonPartialOverlap:
    """Test handling of partial valid pixel overlap"""

    def test_partial_mask_overlap(self):
        """Test comparison with different cloud masks"""
        processor = NDVIProcessor()

        earlier = np.full((3, 3), 0.5, dtype=np.float32)
        later = np.full((3, 3), 0.6, dtype=np.float32)

        # Earlier has clouds in top row
        earlier_mask = np.array([
            [False, False, False],
            [True, True, True],
            [True, True, True]
        ], dtype=bool)

        # Later has clouds in bottom row
        later_mask = np.array([
            [True, True, True],
            [True, True, True],
            [False, False, False]
        ], dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=earlier_mask,
            later_valid_mask=later_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is True
        # Only middle 3 pixels overlap (row 1: cols 0,1,2 = 3 pixels)
        # Earlier mask has rows 1-2 valid, later has rows 0-1 valid → only row 1 overlaps
        assert result["overlap_count"] == 3
        assert result["overlap_percentage"] < 100


class TestHistoricalComparisonNoOverlap:
    """Test handling of no valid pixel overlap"""

    def test_no_overlap(self):
        """Test when masks don't overlap at all"""
        processor = NDVIProcessor()

        earlier = np.full((3, 3), 0.5, dtype=np.float32)
        later = np.full((3, 3), 0.6, dtype=np.float32)

        # Earlier valid in top half
        earlier_mask = np.array([
            [True, True, True],
            [True, True, True],
            [False, False, False]
        ], dtype=bool)

        # Later valid in bottom half
        later_mask = np.array([
            [False, False, False],
            [False, False, False],
            [True, True, True]
        ], dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=earlier_mask,
            later_valid_mask=later_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["has_data"] is False
        assert result["overlap_count"] == 0
        assert "message" in result


class TestHistoricalComparisonDimensionValidation:
    """Test dimension mismatch handling"""

    def test_mismatched_dimensions(self):
        """Test that mismatched image sizes raise error"""
        processor = NDVIProcessor()

        earlier = np.full((3, 3), 0.5, dtype=np.float32)
        later = np.full((4, 4), 0.6, dtype=np.float32)

        earlier_mask = np.ones((3, 3), dtype=bool)
        later_mask = np.ones((4, 4), dtype=bool)

        with pytest.raises(ValueError, match="must have same shape"):
            processor.compare_ndvi_temporal(
                earlier_ndvi=earlier,
                later_ndvi=later,
                earlier_valid_mask=earlier_mask,
                later_valid_mask=later_mask,
                earlier_date="2023-01-01",
                later_date="2023-06-01"
            )


class TestHistoricalComparisonChangeThresholds:
    """Test NDVI change categorization thresholds"""

    def test_change_threshold_boundaries(self):
        """Test that change categories use correct thresholds"""
        processor = NDVIProcessor()

        earlier = np.array([
            [0.5, 0.5, 0.5, 0.5, 0.5]
        ], dtype=np.float32)

        # Create changes at threshold boundaries
        later = np.array([
            [0.25,  # -0.25 strong decrease
             0.35,  # -0.15 moderate decrease
             0.5,   # 0.0 stable
             0.65,  # +0.15 moderate increase
             0.75]  # +0.25 strong increase
        ], dtype=np.float32)

        valid_mask = np.ones_like(earlier, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        assert result["change_categories"]["strong_decrease"]["count"] == 1
        assert result["change_categories"]["moderate_decrease"]["count"] == 1
        assert result["change_categories"]["stable"]["count"] == 1
        assert result["change_categories"]["moderate_increase"]["count"] == 1
        assert result["change_categories"]["strong_increase"]["count"] == 1


class TestHistoricalComparisonPercentageSum:
    """Test that change category percentages sum to 100%"""

    def test_percentages_sum_to_100(self):
        """Verify change category percentages total 100%"""
        processor = NDVIProcessor()

        earlier = np.random.uniform(0.2, 0.8, (10, 10)).astype(np.float32)
        later = earlier + np.random.uniform(-0.3, 0.3, (10, 10)).astype(np.float32)
        later = np.clip(later, -1.0, 1.0)

        valid_mask = np.ones_like(earlier, dtype=bool)

        result = processor.compare_ndvi_temporal(
            earlier_ndvi=earlier,
            later_ndvi=later,
            earlier_valid_mask=valid_mask,
            later_valid_mask=valid_mask,
            earlier_date="2023-01-01",
            later_date="2023-06-01"
        )

        total_percentage = sum([
            result["change_categories"]["strong_decrease"]["percentage"],
            result["change_categories"]["moderate_decrease"]["percentage"],
            result["change_categories"]["stable"]["percentage"],
            result["change_categories"]["moderate_increase"]["percentage"],
            result["change_categories"]["strong_increase"]["percentage"]
        ])

        # Allow small floating point error
        assert abs(total_percentage - 100.0) < 0.01
