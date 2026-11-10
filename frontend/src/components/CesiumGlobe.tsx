/**
 * CesiumGlobe Component
 * Phase 8B.1: Interactive 3D Earth visualization using CesiumJS
 *
 * Features:
 * - Interactive 3D globe
 * - Smooth camera navigation
 * - Location markers
 * - User-configured Cesium Ion token (environment variable)
 * - Graceful fallback for imagery/terrain authentication failures
 */

import { useEffect, useRef, useState } from 'react';
import { Viewer, Entity } from 'resium';
import {
  Cartesian3,
  Color,
  defined,
  Ion,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Viewer as CesiumViewer,
  createWorldTerrainAsync,
  HeightReference,
  VerticalOrigin,
  IonImageryProvider,
  TerrainProvider,
  SingleTileImageryProvider,
  Rectangle,
  ImageryLayer
} from 'cesium';

// Configure Cesium Ion token from environment variable
const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();

if (CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== 'YOUR_TOKEN_HERE') {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
  console.log('[CesiumGlobe] Using user-configured Cesium Ion token');
} else {
  console.warn('[CesiumGlobe] No valid Cesium Ion token configured. Terrain and premium imagery will not be available.');
  console.warn('[CesiumGlobe] To enable: Add your token to frontend/.env as VITE_CESIUM_ION_TOKEN');
  console.warn('[CesiumGlobe] Get a free token at: https://ion.cesium.com/tokens');
}

interface MonitoringZone {
  name: string;
  latitude: number;
  longitude: number;
  pin?: string;
}

interface CesiumGlobeProps {
  selectedLocation?: {
    name: string;
    latitude: number;
    longitude: number;
  } | null;
  monitoringZones?: MonitoringZone[];
  onLocationClick?: (zone: MonitoringZone) => void;
  comparisonId?: string | null;  // Phase 8D.5: Active comparison for overlay
  overlayVisible?: boolean;  // Phase 8D.5: Overlay visibility control
  onOverlayLoad?: (loaded: boolean) => void;  // Phase 8D.5: Overlay load callback
  onOverlayError?: (error: string) => void;  // Phase 8D.5: Error callback
}

export function CesiumGlobe({
  selectedLocation,
  monitoringZones = [],
  onLocationClick,
  comparisonId = null,
  overlayVisible = true,
  onOverlayLoad,
  onOverlayError
}: CesiumGlobeProps) {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [terrainReady, setTerrainReady] = useState(false);
  const [terrainError, setTerrainError] = useState<string | null>(null);
  const [imageryError, setImageryError] = useState<string | null>(null);

  // Phase 8D.5: NDVI overlay state
  const [overlayLayer, setOverlayLayer] = useState<ImageryLayer | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const overlayBlobUrlRef = useRef<string | null>(null);

  /**
   * Load NDVI change overlay from backend
   * Phase 8D.5: Fetch PNG overlay and display on globe
   */
  const loadOverlay = async (analysisId: string) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Remove existing overlay first
    removeOverlay();

    setOverlayLoading(true);
    console.log(`[CesiumGlobe] Loading NDVI overlay for ${analysisId}`);

    try {
      // Fetch PNG overlay from backend
      const response = await fetch(`/api/v1/ndvi/overlay/${analysisId}/png`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Overlay not available for this comparison');
        }
        throw new Error(`Failed to fetch overlay: ${response.status}`);
      }

      // Extract geographic bounds from response headers
      const westStr = response.headers.get('X-Overlay-West');
      const southStr = response.headers.get('X-Overlay-South');
      const eastStr = response.headers.get('X-Overlay-East');
      const northStr = response.headers.get('X-Overlay-North');

      if (!westStr || !southStr || !eastStr || !northStr) {
        throw new Error('Geographic bounds not found in response headers');
      }

      const west = parseFloat(westStr);
      const south = parseFloat(southStr);
      const east = parseFloat(eastStr);
      const north = parseFloat(northStr);

      // Validate bounds
      if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
        throw new Error('Invalid geographic bounds');
      }

      if (west >= east || south >= north) {
        throw new Error('Invalid bounding box coordinates');
      }

      console.log(`[CesiumGlobe] Overlay bounds: west=${west}, south=${south}, east=${east}, north=${north}`);

      // Get PNG as blob
      const blob = await response.blob();

      // Convert blob to data URL (base64) for better Cesium compatibility
      // Blob URLs may have CORS issues with some imagery providers
      const reader = new FileReader();
      const imageUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      overlayBlobUrlRef.current = imageUrl;

      // Create rectangle from bounds
      const rectangle = Rectangle.fromDegrees(west, south, east, north);

      // Create SingleTileImageryProvider
      // Note: tileWidth and tileHeight are required in Cesium 1.108.0
      // Use 256x256 as standard single-tile dimensions (Cesium will scale to fit rectangle)
      const provider = new SingleTileImageryProvider({
        url: imageUrl,
        rectangle: rectangle,
        tileWidth: 256,
        tileHeight: 256
      });

      // Check if provider indicates alpha channel support
      console.log(`[CesiumGlobe] Provider hasAlphaChannel: ${provider.hasAlphaChannel}`);

      // Add imagery provider to the globe
      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 1.0; // Full opacity to ensure visibility
      layer.show = overlayVisible;

      setOverlayLayer(layer);
      setOverlayLoading(false);

      console.log(`[CesiumGlobe] NDVI overlay loaded successfully`);
      console.log(`[CesiumGlobe] Layer alpha: ${layer.alpha}, show: ${layer.show}`);
      console.log(`[CesiumGlobe] Imagery layers count: ${viewer.imageryLayers.length}`);
      console.log(`[CesiumGlobe] Overlay layer index: ${viewer.imageryLayers.indexOf(layer)}`);

      // Fly camera to overlay bounds for visibility
      viewer.camera.flyTo({
        destination: rectangle,
        duration: 2
      });

      if (onOverlayLoad) {
        onOverlayLoad(true);
      }

    } catch (error: any) {
      console.error('[CesiumGlobe] Failed to load overlay:', error);
      setOverlayLoading(false);

      if (onOverlayError) {
        onOverlayError(error.message || 'Failed to load overlay');
      }

      // Clear data URL reference
      overlayBlobUrlRef.current = null;
    }
  };

  /**
   * Remove NDVI overlay from globe
   * Phase 8D.5: Clean up imagery layer and blob URL
   */
  const removeOverlay = () => {
    const viewer = viewerRef.current;

    if (overlayLayer && viewer) {
      viewer.imageryLayers.remove(overlayLayer);
      console.log('[CesiumGlobe] NDVI overlay removed');
    }

    // Clear data URL reference (data URLs don't need explicit revocation)
    overlayBlobUrlRef.current = null;

    setOverlayLayer(null);

    if (onOverlayLoad) {
      onOverlayLoad(false);
    }
  };

  // Initialize viewer with proper imagery and terrain ONLY when viewer is ready
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Flag to prevent state updates after unmount
    let isMounted = true;

    // Configure terrain if token is available
    if (CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== 'YOUR_TOKEN_HERE') {
      createWorldTerrainAsync({
        requestWaterMask: true,
        requestVertexNormals: true
      })
        .then((terrainProvider: TerrainProvider) => {
          if (!isMounted || !viewerRef.current) return;
          viewerRef.current.scene.terrainProvider = terrainProvider;
          console.log('[CesiumGlobe] Terrain loaded successfully');
          setTerrainReady(true);
          setTerrainError(null);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.warn('[CesiumGlobe] Terrain loading failed:', error.message || error);
          if (error.message && error.message.includes('401')) {
            setTerrainError('Terrain authentication failed. Check your Cesium Ion token.');
          } else {
            setTerrainError('Terrain unavailable. Using basic globe.');
          }
          setTerrainReady(true); // Continue without terrain
        });

      // Explicitly ensure imagery provider is active
      IonImageryProvider.fromAssetId(2, {})
        .then((imageryProvider) => {
          if (!isMounted || !viewerRef.current) return;
          // Replace the base imagery layer with authenticated Bing Maps
          if (viewerRef.current.imageryLayers.length > 0) {
            viewerRef.current.imageryLayers.remove(viewerRef.current.imageryLayers.get(0));
            viewerRef.current.imageryLayers.addImageryProvider(imageryProvider, 0);
            console.log('[CesiumGlobe] Bing Maps imagery provider configured');
          }
          setImageryError(null);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.warn('[CesiumGlobe] Imagery provider initialization failed:', error.message || error);
          setImageryError('Using fallback imagery. Bing Maps unavailable.');
        });
    } else {
      console.log('[CesiumGlobe] No token configured, using default imagery and terrain');
      setTerrainReady(true);
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [viewerRef.current]); // Re-run when viewer becomes available

  // Navigate to Coorg region on mount - ONLY ONCE
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !terrainReady) return;

    const camera = viewer.camera;

    // Set initial view to Coorg region center
    camera.setView({
      destination: Cartesian3.fromDegrees(
        75.7380, // Coorg longitude center
        12.3375, // Coorg latitude center
        150000 // 150km altitude for regional view (closer than before)
      ),
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      }
    });

    console.log('[CesiumGlobe] Initial camera set to Coorg region');
  }, [terrainReady]); // Only run once when terrain is ready

  // Navigate to location when selected - separate effect
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedLocation || !terrainReady) return;

    const camera = viewer.camera;

    // Fly to selected location with smooth animation
    camera.flyTo({
      destination: Cartesian3.fromDegrees(
        selectedLocation.longitude,
        selectedLocation.latitude,
        15000 // 15km altitude for detailed view
      ),
      duration: 2,
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-45),
        roll: 0
      }
    });

    console.log(`[CesiumGlobe] Flying to ${selectedLocation.name}`);
  }, [selectedLocation, terrainReady]);

  // Handle entity clicks for monitoring zones
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.scene || !onLocationClick) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((movement: any) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (defined(pickedObject) && defined(pickedObject.id)) {
        const entity = pickedObject.id;
        const entityName = entity.name;

        // Find the matching monitoring zone
        const zone = monitoringZones.find(z => z.name === entityName);
        if (zone) {
          console.log('[CesiumGlobe] Marker clicked:', zone.name, 'Coordinates:', zone.latitude, zone.longitude);
          onLocationClick(zone);
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Cleanup handler on unmount
    return () => {
      handler.destroy();
    };
  }, [viewerRef.current, monitoringZones, onLocationClick]);

  // Phase 8D.5: Load overlay when comparisonId changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !terrainReady) return;

    if (comparisonId) {
      loadOverlay(comparisonId);
    } else {
      removeOverlay();
    }

    // Cleanup on unmount or comparisonId change
    return () => {
      removeOverlay();
    };
  }, [comparisonId, viewerRef.current, terrainReady]);

  // Phase 8D.5: Update overlay visibility
  useEffect(() => {
    if (overlayLayer) {
      overlayLayer.show = overlayVisible;
    }
  }, [overlayVisible, overlayLayer]);

  return (
    <div className="relative w-full h-full">
      <Viewer
        ref={(viewer) => {
          if (viewer?.cesiumElement) {
            viewerRef.current = viewer.cesiumElement;
          }
        }}
        style={{ width: '100%', height: '100%' }}
        // Viewer configuration
        animation={false}
        timeline={false}
        baseLayerPicker={false} // Disable to prevent accidental imagery removal
        geocoder={false}
        homeButton={true}
        sceneModePicker={true}
        navigationHelpButton={false}
        navigationInstructionsInitiallyVisible={false}
        selectionIndicator={true}
        infoBox={true}
        // Performance optimizations
        requestRenderMode={true}
        maximumRenderTimeChange={Infinity}
        // Ensure imagery is always visible
        shouldAnimate={true}
      >
        {/* Monitoring Zone Markers */}
        {monitoringZones.map((zone, index) => {
          const isSelected = selectedLocation &&
            selectedLocation.name === zone.name &&
            Math.abs(selectedLocation.latitude - zone.latitude) < 0.001 &&
            Math.abs(selectedLocation.longitude - zone.longitude) < 0.001;

          return (
            <Entity
              key={`zone-${index}`}
              name={zone.name}
              description={`
                <div style="padding: 10px;">
                  <h3 style="margin: 0 0 8px 0; color: ${isSelected ? '#3b82f6' : '#16a34a'};">${zone.name}</h3>
                  <p style="margin: 4px 0; font-size: 13px;">
                    <strong>Coordinates:</strong><br/>
                    ${zone.latitude.toFixed(4)}°N, ${zone.longitude.toFixed(4)}°E
                  </p>
                  ${zone.pin ? `<p style="margin: 4px 0; font-size: 13px;"><strong>PIN:</strong> ${zone.pin}</p>` : ''}
                  ${isSelected ? '<p style="margin: 8px 0 0 0; font-size: 12px; color: #3b82f6; font-weight: 600;">✓ SELECTED LOCATION</p>' : '<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Click to analyze this location</p>'}
                </div>
              `}
              position={Cartesian3.fromDegrees(
                zone.longitude,
                zone.latitude,
                0
              )}
              point={{
                pixelSize: isSelected ? 16 : 12,
                color: Color.fromCssColorString(isSelected ? '#3b82f6' : '#16a34a'),
                outlineColor: Color.WHITE,
                outlineWidth: isSelected ? 3 : 2,
                heightReference: HeightReference.CLAMP_TO_GROUND
              }}
              label={{
                text: isSelected ? `📍 ${zone.name}` : zone.name,
                font: isSelected ? 'bold 16px sans-serif' : '14px sans-serif',
                fillColor: Color.WHITE,
                outlineColor: Color.BLACK,
                outlineWidth: 2,
                style: 0, // FILL_AND_OUTLINE
                verticalOrigin: VerticalOrigin.BOTTOM,
                pixelOffset: {
                  x: 0,
                  y: isSelected ? -20 : -15
                } as any,
                heightReference: HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY
              }}
            />
          );
        })}
      </Viewer>

      {/* Loading overlay */}
      {!terrainReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f1419]/90 backdrop-blur-sm pointer-events-none z-10">
          <div className="bg-[#1a2332] border border-gray-700 rounded-lg p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
              <span className="text-sm text-white font-medium">Loading Earth...</span>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8D.5: Overlay loading indicator */}
      {overlayLoading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-[#1a2332] border border-gray-700 rounded-lg p-3 shadow-xl z-20">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-white font-medium">Loading NDVI overlay...</span>
          </div>
        </div>
      )}

      {/* Terrain/Imagery error notification */}
      {terrainReady && (terrainError || imageryError) && (
        <div className="absolute top-4 left-4 right-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3 shadow-md z-10">
          <div className="flex items-start gap-2">
            <span className="text-yellow-400 text-lg">⚠️</span>
            <div className="flex-1">
              {terrainError && (
                <p className="text-sm font-medium text-yellow-400">{terrainError}</p>
              )}
              {imageryError && (
                <p className="text-sm font-medium text-yellow-400 mt-1">{imageryError}</p>
              )}
              <p className="text-xs text-yellow-500/80 mt-1">
                Globe is functional. To enable all features, add your Cesium Ion token to <code className="bg-yellow-900/30 px-1 rounded text-yellow-300">frontend/.env</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-300 bg-black/60 px-2 py-1 rounded pointer-events-none z-10">
        Powered by Cesium {CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== 'YOUR_TOKEN_HERE' ? '(Authenticated)' : '(Basic)'}
      </div>
    </div>
  );
}

export default CesiumGlobe;
