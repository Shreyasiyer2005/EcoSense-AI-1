/**
 * NDVI Analysis Types
 * Phase 4: Real NDVI calculation from Sentinel-2 imagery
 */

export interface NDVIStatistics {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  count: number;
  percentile_25?: number;
  percentile_75?: number;
}

export interface NDVIMetadata {
  formula: string;
  red_band: string;
  nir_band: string;
  input_scaled: boolean;
  reflectance_scale: number;
  total_pixels: number;
  valid_pixels: number;
  masked_pixels: number;
  mask_percentage: number;
  productId: string;
  acquisitionDate: string;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
    crs: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  resolution: number;
}

export interface VegetationCategory {
  name: string;
  range: string;
  description: string;
  color: string;
  pixel_count: number;
  percentage: number;
}

export interface VegetationCategories {
  categories: VegetationCategory[];
  total_valid_pixels: number;
  has_data: boolean;
  dominant_category?: {
    name: string;
    percentage: number;
  };
  metadata?: {
    threshold_source: string;
    context_note: string;
    interpretation_warning: string;
  };
}

export interface EnvironmentalAnalysis {
  summary: string;
  insights: string[];
  limitations: string[];
  confidence_note: string;
}

export interface NDVIResult {
  statistics: NDVIStatistics;
  metadata: NDVIMetadata;
  interpretation: string;
  vegetation_categories: VegetationCategories;
  environmental_analysis: EnvironmentalAnalysis;
}

export interface NDVIAnalysisRequest {
  productId: string;
  acquisitionDate: string;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  locationName?: string;
}

export interface NDVIAnalysisResponse {
  success: boolean;
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

export interface NDVIStatusResponse {
  success: boolean;
  analysisId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  productId: string;
  acquisitionDate: string;
  locationName?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface NDVIResultResponse {
  success: boolean;
  analysisId: string;
  result: NDVIResult;
  metadata: {
    productId: string;
    acquisitionDate: string;
    locationName?: string;
    processedAt: string;
  };
}

// Phase 6: Historical Comparison Types

export interface NDVIChangeCategories {
  strong_decrease: {
    threshold: number;
    count: number;
    percentage: number;
    description: string;
  };
  moderate_decrease: {
    threshold: number;
    count: number;
    percentage: number;
    description: string;
  };
  stable: {
    threshold: number;
    count: number;
    percentage: number;
    description: string;
  };
  moderate_increase: {
    threshold: number;
    count: number;
    percentage: number;
    description: string;
  };
  strong_increase: {
    threshold: number;
    count: number;
    percentage: number;
    description: string;
  };
}

export interface NDVIComparison {
  has_data: boolean;
  earlier_date: string;
  later_date: string;
  overlap_count: number;
  overlap_percentage: number;
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    count: number;
  };
  change_categories: NDVIChangeCategories;
  summary: string;
  insights: string[];
  limitations: string[];
  warning: string;
  message?: string;
}

export interface HistoricalNDVIResult {
  earlier: {
    date: string;
    statistics: NDVIStatistics;
    metadata: any;
    interpretation: string;
    vegetation_categories: VegetationCategories;
    environmental_analysis: EnvironmentalAnalysis;
  };
  later: {
    date: string;
    statistics: NDVIStatistics;
    metadata: any;
    interpretation: string;
    vegetation_categories: VegetationCategories;
    environmental_analysis: EnvironmentalAnalysis;
  };
  comparison: NDVIComparison;
  metadata: {
    earlierProductId: string;
    laterProductId: string;
    bbox: any;
    dimensions: {
      width: number;
      height: number;
    };
    resolution: number;
  };
}

export interface NDVICompareRequest {
  earlierProductId: string;
  earlierAcquisitionDate: string;
  laterProductId: string;
  laterAcquisitionDate: string;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  locationName?: string;
  resolution?: number;
}

export interface NDVICompareResponse {
  success: boolean;
  comparisonId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  error?: string;
}

export interface HistoricalNDVIResultResponse {
  success: boolean;
  analysisId: string;
  result: HistoricalNDVIResult;
  metadata: any;
}
