export type LocationType = 'pincode' | 'place' | 'coordinates' | 'polygon';

export interface LocationResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  bbox?: [number, number, number, number];
  type: string;
  country?: string;
  state?: string;
  importance?: number;
  area_km2?: string;
  source: string;
  attribution: string;
}

export interface LocationResponse {
  success: boolean;
  type: LocationType;
  inputValue: any;
  results: LocationResult[];
  message: string;
  note?: string;
  error?: string;
  suggestion?: string;
}

export interface CoordinatesInput {
  latitude: number;
  longitude: number;
}
