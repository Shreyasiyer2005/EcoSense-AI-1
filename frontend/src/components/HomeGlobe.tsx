/**
 * HomeGlobe Component - Reliable Rotating 3D Earth
 * Uses Three.js for guaranteed visible textured Earth
 */

import ThreeGlobe from './ThreeGlobe';

export function HomeGlobe() {
  // Use Three.js implementation directly for reliability
  return <ThreeGlobe />;
}

export default HomeGlobe;

// Legacy Cesium implementation (keeping for reference but not used)
/*
import { useEffect, useRef, useState } from 'react';
import { Viewer } from 'resium';
import {
  Cartesian3,
  Ion,
  Math as CesiumMath,
  Viewer as CesiumViewer,
  IonImageryProvider,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  OpenStreetMapImageryProvider
} from 'cesium';

const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();

if (CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== 'YOUR_TOKEN_HERE') {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
  console.log('[HomeGlobe] Cesium Ion token configured');
} else {
  console.warn('[HomeGlobe] No Cesium Ion token - using fallback imagery');
}

export function HomeGlobeCesium() {
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const rotationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const imagerySetupDone = useRef<boolean>(false);

  // Initialize viewer imagery ONCE when viewer becomes available
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || imagerySetupDone.current) return;

    imagerySetupDone.current = true;
    console.log('[HomeGlobe] Setting up imagery...');

    // Set up OSM fallback imagery
    try {
      const fallbackImagery = new OpenStreetMapImageryProvider({
        url: 'https://a.tile.openstreetmap.org/'
      });

      // Remove default Bing imagery
      if (viewer.imageryLayers.length > 0) {
        viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
      }

      // Add OSM imagery
      const osmLayer = viewer.imageryLayers.addImageryProvider(fallbackImagery);
      console.log('[HomeGlobe] OSM imagery provider added, waiting for tiles...');

      // Wait for first tiles to load before marking as ready
      const checkImageryReady = () => {
        if (!viewerRef.current) {
          return;
        }

        // Check if imagery layer is ready and has loaded tiles
        if (osmLayer.ready) {
          console.log('[HomeGlobe] ✓ OSM imagery tiles loaded');
          setIsReady(true);

          // Try to upgrade to Cesium Ion imagery (optional)
          if (CESIUM_ION_TOKEN && CESIUM_ION_TOKEN !== 'YOUR_TOKEN_HERE') {
            console.log('[HomeGlobe] Attempting Ion upgrade...');

            IonImageryProvider.fromAssetId(2, {})
              .then((imageryProvider) => {
                if (!viewerRef.current) return;
                // Replace OSM with Ion imagery
                if (viewerRef.current.imageryLayers.length > 0) {
                  viewerRef.current.imageryLayers.remove(viewerRef.current.imageryLayers.get(0));
                }
                viewerRef.current.imageryLayers.addImageryProvider(imageryProvider);
                console.log('[HomeGlobe] ✓ Ion imagery upgraded');
              })
              .catch((error) => {
                console.warn('[HomeGlobe] Ion upgrade failed, keeping OSM:', error.message);
              });
          }
        } else {
          // Not ready yet, check again soon
          setTimeout(checkImageryReady, 100);
        }
      };

      // Start checking if imagery is ready
      setTimeout(checkImageryReady, 100);

      // Fallback timeout - mark ready after 5 seconds even if tiles haven't loaded
      setTimeout(() => {
        if (!isReady) {
          console.warn('[HomeGlobe] Imagery timeout, marking ready anyway');
          setIsReady(true);
        }
      }, 5000);

    } catch (error: any) {
      console.error('[HomeGlobe] Imagery setup failed:', error);
      // Mark as ready so loading screen disappears
      setIsReady(true);
    }
  }, [viewerRef.current]);

  // Set initial camera position when ready
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady) return;

    try {
      viewer.camera.setView({
        destination: Cartesian3.fromDegrees(0, 20, 20000000),
        orientation: {
          heading: 0.0,
          pitch: -CesiumMath.PI_OVER_TWO * 0.5,
          roll: 0.0
        }
      });
      console.log('[HomeGlobe] ✓ Camera positioned');
    } catch (error: any) {
      console.error('[HomeGlobe] Camera setup failed:', error);
    }
  }, [isReady]);

  // Automatic rotation animation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady) return;

    const rotateGlobe = () => {
      if (!isUserInteractingRef.current && viewerRef.current) {
        rotationRef.current += 0.0003;
        const longitude = rotationRef.current * 180 / Math.PI;

        try {
          viewerRef.current.camera.setView({
            destination: Cartesian3.fromDegrees(longitude, 20, 20000000),
            orientation: {
              heading: 0.0,
              pitch: -CesiumMath.PI_OVER_TWO * 0.5,
              roll: 0.0
            }
          });
        } catch (error) {
          // Silently handle rotation errors
        }
      }

      animationFrameRef.current = requestAnimationFrame(rotateGlobe);
    };

    animationFrameRef.current = requestAnimationFrame(rotateGlobe);
    console.log('[HomeGlobe] ✓ Rotation started');

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReady]);

  // Detect user interaction to pause rotation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !isReady || !viewer.scene || !viewer.scene.canvas) return;

    try {
      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      eventHandlerRef.current = handler;

      const pauseRotation = () => {
        isUserInteractingRef.current = true;
        if (interactionTimeoutRef.current) {
          clearTimeout(interactionTimeoutRef.current);
        }
        interactionTimeoutRef.current = setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 3000);
      };

      handler.setInputAction(pauseRotation, ScreenSpaceEventType.LEFT_DOWN);
      handler.setInputAction(pauseRotation, ScreenSpaceEventType.WHEEL);
      console.log('[HomeGlobe] ✓ Event handlers ready');
    } catch (error: any) {
      console.error('[HomeGlobe] Event handler setup failed:', error);
    }

    return () => {
      if (eventHandlerRef.current && !eventHandlerRef.current.isDestroyed()) {
        try {
          eventHandlerRef.current.destroy();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [isReady]);

  // Cesium implementation - kept for reference
  return null;
}
*/
