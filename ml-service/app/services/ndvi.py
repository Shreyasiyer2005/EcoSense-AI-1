"""
NDVI (Normalized Difference Vegetation Index) Calculation Service

Processes Sentinel-2 L2A surface reflectance data to compute NDVI values.
NDVI = (NIR - Red) / (NIR + Red)

This module handles:
- Band data validation and preprocessing
- Nodata and mask handling
- NDVI calculation with division-by-zero protection
- Summary statistics computation
- Georeferencing preservation
"""

import numpy as np
from typing import Dict, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)


class NDVIProcessor:
    """
    Process Sentinel-2 bands to calculate NDVI with proper validation and masking.
    """

    # Valid NDVI range (with small tolerance for floating point errors)
    NDVI_MIN = -1.0
    NDVI_MAX = 1.0
    NDVI_TOLERANCE = 0.001

    # Sentinel-2 L2A surface reflectance scale factor
    # Digital Numbers (DN) are stored as uint16 with values 0-10000 representing 0-1.0 reflectance
    REFLECTANCE_SCALE = 10000.0

    def __init__(self):
        self.last_processing_info = {}

    def validate_band_array(
        self,
        band_data: np.ndarray,
        band_name: str,
        expected_shape: Optional[Tuple[int, int]] = None
    ) -> None:
        """
        Validate band data array.

        Args:
            band_data: Band data array
            band_name: Name of the band (for error messages)
            expected_shape: Expected (height, width) if checking consistency

        Raises:
            ValueError: If validation fails
        """
        if not isinstance(band_data, np.ndarray):
            raise ValueError(f"{band_name} must be a numpy array")

        if band_data.ndim != 2:
            raise ValueError(f"{band_name} must be 2-dimensional, got {band_data.ndim} dimensions")

        if expected_shape is not None:
            if band_data.shape != expected_shape:
                raise ValueError(
                    f"{band_name} shape {band_data.shape} does not match expected {expected_shape}"
                )

    def preprocess_band(
        self,
        band_data: np.ndarray,
        nodata_value: Optional[float] = None,
        scale_to_reflectance: bool = True
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Preprocess band data: scale to reflectance and create validity mask.

        Args:
            band_data: Raw band data (typically uint16 DN values)
            nodata_value: Value representing nodata pixels
            scale_to_reflectance: If True, scale DN values to 0-1 reflectance range

        Returns:
            Tuple of (processed_data, valid_mask)
            - processed_data: Float array of reflectance values
            - valid_mask: Boolean array (True = valid pixel)
        """
        # Convert to float for processing
        data_float = band_data.astype(np.float32)

        # Create validity mask
        valid_mask = np.ones(band_data.shape, dtype=bool)

        # Mask nodata values
        if nodata_value is not None:
            valid_mask &= (data_float != nodata_value)

        # Mask NaN and Inf values
        valid_mask &= np.isfinite(data_float)

        # Scale to reflectance if requested
        if scale_to_reflectance:
            # Sentinel-2 L2A: DN values 0-10000 represent 0.0-1.0 reflectance
            # Values outside this range are typically invalid
            valid_mask &= (data_float >= 0) & (data_float <= self.REFLECTANCE_SCALE)
            data_float = data_float / self.REFLECTANCE_SCALE

        # Set invalid pixels to NaN
        data_float[~valid_mask] = np.nan

        return data_float, valid_mask

    def calculate_ndvi(
        self,
        red_band: np.ndarray,
        nir_band: np.ndarray,
        red_nodata: Optional[float] = None,
        nir_nodata: Optional[float] = None,
        quality_mask: Optional[np.ndarray] = None,
        scale_input: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate NDVI from red and NIR bands.

        Args:
            red_band: Red band data (B04 for Sentinel-2)
            nir_band: Near-infrared band data (B08 for Sentinel-2)
            red_nodata: Nodata value for red band
            nir_nodata: Nodata value for NIR band
            quality_mask: Optional boolean mask (True = valid)
            scale_input: If True, scale DN values to reflectance

        Returns:
            Dictionary containing:
                - ndvi: NDVI array (float32, NaN for invalid pixels)
                - valid_mask: Boolean mask of valid pixels
                - statistics: Dict of summary statistics
                - metadata: Processing metadata
        """
        # Validate inputs
        self.validate_band_array(red_band, "Red band")
        self.validate_band_array(nir_band, "NIR band", expected_shape=red_band.shape)

        # Preprocess bands
        red_refl, red_valid = self.preprocess_band(red_band, red_nodata, scale_input)
        nir_refl, nir_valid = self.preprocess_band(nir_band, nir_nodata, scale_input)

        # Combine validity masks
        valid_mask = red_valid & nir_valid

        # Apply external quality mask if provided
        if quality_mask is not None:
            if quality_mask.shape != red_band.shape:
                raise ValueError("Quality mask shape must match band shape")
            valid_mask &= quality_mask

        # Calculate NDVI with division-by-zero protection
        # NDVI = (NIR - Red) / (NIR + Red)
        numerator = nir_refl - red_refl
        denominator = nir_refl + red_refl

        # Avoid division by zero: set denominator to NaN where it's zero or very small
        # This handles dark pixels where NIR + Red approaches zero
        epsilon = 1e-8
        denominator[np.abs(denominator) < epsilon] = np.nan

        # Calculate NDVI
        ndvi = numerator / denominator

        # Apply validity mask
        ndvi[~valid_mask] = np.nan

        # Validate NDVI range (should be -1 to 1)
        finite_ndvi = ndvi[np.isfinite(ndvi)]
        if len(finite_ndvi) > 0:
            ndvi_min = np.nanmin(finite_ndvi)
            ndvi_max = np.nanmax(finite_ndvi)

            # Warn if values are outside expected range (with tolerance)
            if ndvi_min < (self.NDVI_MIN - self.NDVI_TOLERANCE):
                logger.warning(f"NDVI minimum {ndvi_min:.4f} is below theoretical minimum {self.NDVI_MIN}")
            if ndvi_max > (self.NDVI_MAX + self.NDVI_TOLERANCE):
                logger.warning(f"NDVI maximum {ndvi_max:.4f} is above theoretical maximum {self.NDVI_MAX}")

        # Calculate statistics
        statistics = self.calculate_statistics(ndvi, valid_mask)

        # Store processing metadata
        metadata = {
            "formula": "NDVI = (NIR - Red) / (NIR + Red)",
            "red_band": "B04",
            "nir_band": "B08",
            "input_scaled": scale_input,
            "reflectance_scale": self.REFLECTANCE_SCALE if scale_input else None,
            "total_pixels": red_band.size,
            "valid_pixels": int(np.sum(valid_mask)),
            "masked_pixels": int(red_band.size - np.sum(valid_mask)),
            "mask_percentage": float(100.0 * (1.0 - np.sum(valid_mask) / red_band.size))
        }

        # Store for later retrieval
        self.last_processing_info = {
            "ndvi": ndvi,
            "valid_mask": valid_mask,
            "statistics": statistics,
            "metadata": metadata
        }

        return {
            "ndvi": ndvi.astype(np.float32),
            "valid_mask": valid_mask,
            "statistics": statistics,
            "metadata": metadata
        }

    def calculate_statistics(self, ndvi: np.ndarray, valid_mask: np.ndarray) -> Dict[str, Optional[float]]:
        """
        Calculate summary statistics for NDVI values.

        Args:
            ndvi: NDVI array (may contain NaN)
            valid_mask: Boolean mask of valid pixels

        Returns:
            Dictionary of statistics (values are None if no valid pixels)
        """
        valid_ndvi = ndvi[valid_mask & np.isfinite(ndvi)]

        if len(valid_ndvi) == 0:
            return {
                "min": None,
                "max": None,
                "mean": None,
                "median": None,
                "std": None,
                "count": 0,
                "percentile_25": None,
                "percentile_75": None
            }

        return {
            "min": float(np.min(valid_ndvi)),
            "max": float(np.max(valid_ndvi)),
            "mean": float(np.mean(valid_ndvi)),
            "median": float(np.median(valid_ndvi)),
            "std": float(np.std(valid_ndvi)),
            "count": int(len(valid_ndvi)),
            "percentile_25": float(np.percentile(valid_ndvi, 25)),
            "percentile_75": float(np.percentile(valid_ndvi, 75))
        }

    def interpret_ndvi(self, ndvi_value: float) -> str:
        """
        Provide a human-readable interpretation of an NDVI value.

        Note: These are general guidelines. Actual interpretation depends on
        vegetation type, season, and local conditions.

        Thresholds aligned with frontend legend:
        - < 0.0: Water/Snow
        - 0.0-0.2: Bare Soil/Urban
        - 0.2-0.4: Sparse Vegetation
        - 0.4-0.6: Moderate Vegetation
        - 0.6-0.8: Dense Vegetation
        - 0.8-1.0: Very Dense Vegetation

        Args:
            ndvi_value: NDVI value between -1 and 1

        Returns:
            Interpretation string
        """
        if not np.isfinite(ndvi_value):
            return "Invalid/No data"

        if ndvi_value < 0.0:
            return "Water or snow"
        elif ndvi_value < 0.2:
            return "Bare soil or urban areas"
        elif ndvi_value < 0.4:
            return "Sparse vegetation"
        elif ndvi_value < 0.6:
            return "Moderate vegetation"
        elif ndvi_value < 0.8:
            return "Dense vegetation"
        else:
            return "Very dense vegetation"

    def categorize_vegetation_condition(self, ndvi: np.ndarray, valid_mask: np.ndarray) -> Dict[str, Any]:
        """
        Categorize NDVI values into vegetation condition classes.

        Categories are approximate and context-dependent. They indicate vegetation
        presence and greenness, NOT ecosystem health or deforestation status.

        Thresholds are based on general remote sensing literature but should be
        interpreted with local knowledge and seasonal context.

        Categories:
        - Water/Snow: < 0.0 (typically non-vegetated, water bodies, snow/ice)
        - Bare/Urban: 0.0 to 0.2 (bare soil, rock, built areas, very sparse vegetation)
        - Low Vegetation: 0.2 to 0.4 (grassland, shrubs, stressed vegetation)
        - Moderate Vegetation: 0.4 to 0.6 (healthy grassland, crops, sparse forest)
        - Dense Vegetation: 0.6 to 0.8 (dense crops, healthy forest, productive vegetation)
        - Very Dense: 0.8 to 1.0 (very healthy, productive vegetation, peak growing season)

        Args:
            ndvi: NDVI array
            valid_mask: Boolean mask of valid pixels

        Returns:
            Dictionary containing category counts, percentages, and metadata
        """
        # Get valid NDVI values
        valid_ndvi = ndvi[valid_mask & np.isfinite(ndvi)]

        if len(valid_ndvi) == 0:
            return {
                "categories": [],
                "total_valid_pixels": 0,
                "has_data": False,
                "message": "No valid pixels for categorization"
            }

        # Define categories with thresholds
        categories = [
            {
                "name": "Water/Snow",
                "range": "< 0.0",
                "threshold_min": -1.0,
                "threshold_max": 0.0,
                "description": "Water bodies, snow, or ice",
                "color": "#3B82F6"  # blue
            },
            {
                "name": "Bare/Urban",
                "range": "0.0 - 0.2",
                "threshold_min": 0.0,
                "threshold_max": 0.2,
                "description": "Bare soil, rock, urban areas, very sparse vegetation",
                "color": "#9CA3AF"  # gray
            },
            {
                "name": "Low Vegetation",
                "range": "0.2 - 0.4",
                "threshold_min": 0.2,
                "threshold_max": 0.4,
                "description": "Sparse vegetation, grassland, or stressed plants",
                "color": "#FCD34D"  # yellow
            },
            {
                "name": "Moderate Vegetation",
                "range": "0.4 - 0.6",
                "threshold_min": 0.4,
                "threshold_max": 0.6,
                "description": "Healthy grassland, agricultural crops, light forest",
                "color": "#A3E635"  # lime
            },
            {
                "name": "Dense Vegetation",
                "range": "0.6 - 0.8",
                "threshold_min": 0.6,
                "threshold_max": 0.8,
                "description": "Dense forest, healthy mature crops",
                "color": "#22C55E"  # green
            },
            {
                "name": "Very Dense",
                "range": "0.8 - 1.0",
                "threshold_min": 0.8,
                "threshold_max": 1.0,
                "description": "Very dense, highly productive vegetation",
                "color": "#059669"  # emerald
            }
        ]

        # Calculate pixel counts for each category
        total_valid = len(valid_ndvi)
        results = []

        for cat in categories:
            # Count pixels in range (inclusive of lower bound, exclusive of upper for all except last)
            if cat["threshold_max"] == 1.0:
                # Last category: include upper bound
                mask = (valid_ndvi >= cat["threshold_min"]) & (valid_ndvi <= cat["threshold_max"])
            else:
                mask = (valid_ndvi >= cat["threshold_min"]) & (valid_ndvi < cat["threshold_max"])

            count = int(np.sum(mask))
            percentage = float((count / total_valid) * 100.0) if total_valid > 0 else 0.0

            results.append({
                "name": cat["name"],
                "range": cat["range"],
                "description": cat["description"],
                "color": cat["color"],
                "pixel_count": count,
                "percentage": round(percentage, 2)
            })

        # Calculate dominant category
        dominant = max(results, key=lambda x: x["pixel_count"])

        return {
            "categories": results,
            "total_valid_pixels": total_valid,
            "has_data": True,
            "dominant_category": {
                "name": dominant["name"],
                "percentage": dominant["percentage"]
            },
            "metadata": {
                "threshold_source": "General remote sensing literature",
                "context_note": "Thresholds are approximate and context-dependent",
                "interpretation_warning": "Categories indicate vegetation greenness, not ecosystem health or forest type"
            }
        }

    def calculate_environmental_interpretation(
        self,
        statistics: Dict[str, Any],
        categories: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate environmental interpretation with clear limitations and context.

        Args:
            statistics: NDVI statistics dictionary
            categories: Vegetation categories dictionary
            metadata: Processing metadata

        Returns:
            Dictionary with interpretation, insights, and limitations
        """
        if not statistics["mean"] or not categories["has_data"]:
            return {
                "summary": "Insufficient data for interpretation",
                "insights": [],
                "limitations": [
                    "No valid pixels available in selected area"
                ]
            }

        mean_ndvi = statistics["mean"]
        std_ndvi = statistics["std"]
        dominant_cat = categories["dominant_category"]

        # Generate insights based on data
        insights = []

        # Mean NDVI insight
        if mean_ndvi >= 0.6:
            insights.append(f"High average vegetation greenness (NDVI {mean_ndvi:.3f}) suggests dense vegetative cover")
        elif mean_ndvi >= 0.4:
            insights.append(f"Moderate vegetation greenness (NDVI {mean_ndvi:.3f}) indicates mixed land cover")
        elif mean_ndvi >= 0.2:
            insights.append(f"Low vegetation greenness (NDVI {mean_ndvi:.3f}) suggests sparse vegetation or mixed surfaces")
        else:
            insights.append(f"Very low NDVI ({mean_ndvi:.3f}) indicates minimal vegetation or non-vegetated surfaces")

        # Dominant category insight
        if dominant_cat["percentage"] >= 70:
            insights.append(f"{dominant_cat['percentage']:.1f}% of area classified as '{dominant_cat['name']}' - relatively homogeneous landscape")
        elif dominant_cat["percentage"] >= 50:
            insights.append(f"{dominant_cat['percentage']:.1f}% of area classified as '{dominant_cat['name']}' - moderately homogeneous")
        else:
            insights.append(f"Mixed land cover - no single category dominates (largest: {dominant_cat['name']} at {dominant_cat['percentage']:.1f}%)")

        # Variability insight
        if std_ndvi >= 0.2:
            insights.append(f"High variability (σ={std_ndvi:.3f}) indicates diverse land cover types or fragmented landscape")
        elif std_ndvi >= 0.1:
            insights.append(f"Moderate variability (σ={std_ndvi:.3f}) suggests mixed vegetation conditions")
        else:
            insights.append(f"Low variability (σ={std_ndvi:.3f}) indicates uniform vegetation or land cover")

        # Key limitations
        limitations = [
            "Single-date observation - seasonal context unknown",
            "Cloud cover and atmospheric effects may impact values",
            f"Masked pixels ({metadata.get('mask_percentage', 0):.1f}% excluded) may alter representativeness",
            "Soil background affects NDVI in areas with sparse vegetation",
            "Mixed pixels at image boundaries can reduce accuracy",
            "NDVI indicates greenness, not species composition or forest type",
            f"Analysis covers {metadata.get('total_pixels', 0)} pixels - small areas have higher uncertainty"
        ]

        # Summary statement
        cat_summary = ', '.join([
            f"{cat['name']}: {cat['percentage']:.1f}%"
            for cat in categories['categories']
            if cat['percentage'] >= 5
        ])
        summary = (
            f"Area shows {dominant_cat['name'].lower()} characteristics "
            f"(mean NDVI {mean_ndvi:.3f}). "
            f"Vegetation distribution: {cat_summary}"
        )

        return {
            "summary": summary,
            "insights": insights,
            "limitations": limitations,
            "confidence_note": (
                "Interpretation is based on spectral analysis only. "
                "Local knowledge, ground truth, and multi-temporal analysis "
                "are recommended for definitive land cover assessment."
            )
        }

    def compare_ndvi_temporal(
        self,
        earlier_ndvi: np.ndarray,
        later_ndvi: np.ndarray,
        earlier_valid_mask: np.ndarray,
        later_valid_mask: np.ndarray,
        earlier_date: str,
        later_date: str,
        preserve_arrays: bool = True
    ) -> Dict[str, Any]:
        """
        Compare NDVI values between two dates to detect vegetation changes.

        IMPORTANT: This compares spectral greenness only. Changes may result from:
        - Seasonal variation (e.g., wet season vs dry season)
        - Cloud shadows or atmospheric effects
        - Agricultural cycles (planting, harvest)
        - Image alignment differences
        - Sensor calibration variations

        This is NOT definitive evidence of deforestation, forest degradation, or
        ecosystem health changes. Ground truth and context are required.

        Args:
            earlier_ndvi: NDVI array from earlier date
            later_ndvi: NDVI array from later date
            earlier_valid_mask: Valid pixel mask for earlier date
            later_valid_mask: Valid pixel mask for later date
            earlier_date: Date string for earlier observation
            later_date: Date string for later observation
            preserve_arrays: If True, include pixel arrays in response (default: True)

        Returns:
            Dictionary with change analysis, statistics, limitations, and optionally pixel arrays
        """
        # Validate inputs
        if earlier_ndvi.shape != later_ndvi.shape:
            raise ValueError(
                f"NDVI arrays must have same shape. Got {earlier_ndvi.shape} and {later_ndvi.shape}"
            )

        # Find overlapping valid pixels (valid in BOTH dates)
        overlap_mask = earlier_valid_mask & later_valid_mask & \
                      np.isfinite(earlier_ndvi) & np.isfinite(later_ndvi)

        overlap_count = int(np.sum(overlap_mask))
        total_pixels = earlier_ndvi.size
        overlap_percentage = (overlap_count / total_pixels) * 100.0 if total_pixels > 0 else 0.0

        if overlap_count == 0:
            return {
                "has_data": False,
                "message": "No overlapping valid pixels between the two dates",
                "overlap_count": 0,
                "overlap_percentage": 0.0,
                "limitations": [
                    "Images may have different cloud cover patterns",
                    "Different masked areas prevent pixel-by-pixel comparison"
                ]
            }

        # Calculate NDVI difference (later - earlier)
        # Positive difference = vegetation increase (greening)
        # Negative difference = vegetation decrease (browning)
        ndvi_difference = np.full(earlier_ndvi.shape, np.nan, dtype=np.float32)
        ndvi_difference[overlap_mask] = later_ndvi[overlap_mask] - earlier_ndvi[overlap_mask]

        # Extract valid differences
        valid_differences = ndvi_difference[overlap_mask]

        # Calculate statistics
        diff_stats = {
            "min": float(np.min(valid_differences)),
            "max": float(np.max(valid_differences)),
            "mean": float(np.mean(valid_differences)),
            "median": float(np.median(valid_differences)),
            "std": float(np.std(valid_differences)),
            "count": overlap_count
        }

        # Categorize changes using conservative thresholds
        # Note: Small changes (<0.1) could be noise, seasonal variation, or atmospheric effects
        categories = {
            "strong_decrease": {  # NDVI decreased by >0.2
                "threshold": -0.2,
                "count": int(np.sum(valid_differences < -0.2)),
                "description": "Significant vegetation decrease (>0.2 NDVI drop)"
            },
            "moderate_decrease": {  # NDVI decreased by 0.1 to 0.2
                "threshold": -0.1,
                "count": int(np.sum((valid_differences < -0.1) & (valid_differences >= -0.2))),
                "description": "Moderate vegetation decrease (0.1-0.2 NDVI drop)"
            },
            "stable": {  # NDVI changed by <0.1
                "threshold": 0.0,
                "count": int(np.sum((valid_differences >= -0.1) & (valid_differences <= 0.1))),
                "description": "Relatively stable (±0.1 NDVI)"
            },
            "moderate_increase": {  # NDVI increased by 0.1 to 0.2
                "threshold": 0.1,
                "count": int(np.sum((valid_differences > 0.1) & (valid_differences <= 0.2))),
                "description": "Moderate vegetation increase (0.1-0.2 NDVI gain)"
            },
            "strong_increase": {  # NDVI increased by >0.2
                "threshold": 0.2,
                "count": int(np.sum(valid_differences > 0.2)),
                "description": "Significant vegetation increase (>0.2 NDVI gain)"
            }
        }

        # Calculate percentages
        for cat in categories.values():
            cat["percentage"] = (cat["count"] / overlap_count) * 100.0 if overlap_count > 0 else 0.0

        # Create classified pixel array (Phase 1: Geographic overlay support)
        # Class values: 0=nodata, 1=strong_decrease, 2=moderate_decrease, 3=stable, 4=moderate_increase, 5=strong_increase
        if preserve_arrays:
            classified_array = np.zeros(ndvi_difference.shape, dtype=np.uint8)

            # Apply classifications only to valid overlap pixels
            # Use ndvi_difference directly to avoid recomputing masks
            valid_diff_mask = overlap_mask
            classified_array[valid_diff_mask & (ndvi_difference < -0.2)] = 1  # Strong Decrease
            classified_array[valid_diff_mask & (ndvi_difference >= -0.2) & (ndvi_difference < -0.1)] = 2  # Moderate Decrease
            classified_array[valid_diff_mask & (ndvi_difference >= -0.1) & (ndvi_difference <= 0.1)] = 3  # Stable
            classified_array[valid_diff_mask & (ndvi_difference > 0.1) & (ndvi_difference <= 0.2)] = 4  # Moderate Increase
            classified_array[valid_diff_mask & (ndvi_difference > 0.2)] = 5  # Strong Increase
            # 0 remains for nodata/masked pixels

            # Verify classification counts match category statistics
            classified_counts = {
                "strong_decrease": int(np.sum(classified_array == 1)),
                "moderate_decrease": int(np.sum(classified_array == 2)),
                "stable": int(np.sum(classified_array == 3)),
                "moderate_increase": int(np.sum(classified_array == 4)),
                "strong_increase": int(np.sum(classified_array == 5)),
                "nodata": int(np.sum(classified_array == 0))
            }

            # Log verification (development check)
            logger.info(f"[NDVI Compare] Classified array shape: {classified_array.shape}")
            logger.info(f"[NDVI Compare] Classification verification - Strong Dec: {classified_counts['strong_decrease']} vs {categories['strong_decrease']['count']}")
        else:
            classified_array = None
            classified_counts = None

        # Generate interpretation
        mean_change = diff_stats["mean"]

        insights = []

        # Overall trend
        if abs(mean_change) < 0.05:
            insights.append(f"Mean NDVI change is minimal ({mean_change:+.3f}), suggesting relatively stable conditions")
        elif mean_change > 0:
            insights.append(f"Mean NDVI increased by {mean_change:.3f}, indicating overall greening trend")
        else:
            insights.append(f"Mean NDVI decreased by {abs(mean_change):.3f}, indicating overall browning trend")

        # Stability analysis
        stable_pct = categories["stable"]["percentage"]
        if stable_pct >= 70:
            insights.append(f"{stable_pct:.1f}% of pixels show stable NDVI (change <0.1) - minimal landscape change")
        elif stable_pct >= 50:
            insights.append(f"{stable_pct:.1f}% of pixels show stable NDVI, with moderate changes elsewhere")
        else:
            insights.append(f"Only {stable_pct:.1f}% stable - widespread NDVI changes detected across landscape")

        # Strong change detection
        strong_dec_pct = categories["strong_decrease"]["percentage"]
        strong_inc_pct = categories["strong_increase"]["percentage"]

        if strong_dec_pct >= 10:
            insights.append(f"{strong_dec_pct:.1f}% of area shows significant vegetation decrease (>0.2 NDVI drop)")
        if strong_inc_pct >= 10:
            insights.append(f"{strong_inc_pct:.1f}% of area shows significant vegetation increase (>0.2 NDVI gain)")

        # Key limitations for temporal comparison
        limitations = [
            "NDVI changes measure spectral greenness differences, not ecosystem health",
            "Seasonal variations (wet/dry season, growing cycles) can cause large NDVI shifts",
            "Cloud shadows and atmospheric conditions differ between acquisitions",
            f"Only {overlap_percentage:.1f}% of pixels valid in both dates - masked areas may differ",
            "Small image footprints may not represent wider region",
            "Agricultural cycles (planting, harvest) create expected NDVI variation",
            "Soil moisture changes affect NDVI independently of vegetation structure",
            "This comparison alone cannot confirm deforestation or forest degradation"
        ]

        # Summary
        if abs(mean_change) < 0.05:
            change_direction = "minimal change"
        elif mean_change > 0:
            change_direction = "greening"
        else:
            change_direction = "browning"

        summary = (
            f"Between {earlier_date} and {later_date}, mean NDVI showed {change_direction} "
            f"({mean_change:+.3f}). "
            f"{stable_pct:.1f}% of pixels remained stable (±0.1 NDVI)."
        )

        # Build response dictionary
        result = {
            "has_data": True,
            "earlier_date": earlier_date,
            "later_date": later_date,
            "overlap_count": overlap_count,
            "overlap_percentage": round(overlap_percentage, 2),
            "statistics": diff_stats,
            "change_categories": categories,
            "summary": summary,
            "insights": insights,
            "limitations": limitations,
            "warning": (
                "This temporal comparison shows NDVI differences only. "
                "Interpretation requires seasonal context, ground truth, and "
                "understanding of local land use patterns. Changes may reflect "
                "natural cycles rather than environmental degradation or improvement."
            )
        }

        # Add pixel arrays if requested (Phase 1: Geographic overlay support)
        if preserve_arrays and classified_array is not None:
            result["pixel_arrays"] = {
                "shape": {
                    "height": int(classified_array.shape[0]),
                    "width": int(classified_array.shape[1])
                },
                "classified_array": classified_array.tolist(),
                "ndvi_difference": ndvi_difference.tolist(),
                "overlap_mask": overlap_mask.tolist(),
                "class_counts_verification": classified_counts,
                "metadata": {
                    "class_legend": {
                        "0": "nodata/masked",
                        "1": "strong_decrease (< -0.2)",
                        "2": "moderate_decrease (-0.2 to -0.1)",
                        "3": "stable (-0.1 to +0.1)",
                        "4": "moderate_increase (+0.1 to +0.2)",
                        "5": "strong_increase (> +0.2)"
                    },
                    "dtype": "uint8",
                    "notes": [
                        "Pixel arrays are provided for overlay visualization",
                        "Geographic coordinates must be provided by caller (backend)",
                        "ML service does not have access to bbox, CRS, or affine transform",
                        "Spatial metadata must be derived from source raster metadata"
                    ]
                }
            }

        return result


# Module-level instance for convenience
ndvi_processor = NDVIProcessor()
