/**
 * ThreeGlobe - Reliable 3D Earth using Three.js
 * Fallback implementation with locally available texture
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function ThreeGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    earth: THREE.Mesh;
    animationId: number | null;
    isUserInteracting: boolean;
    autoRotationSpeed: number;
    interactionTimeout: NodeJS.Timeout | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[ThreeGlobe] Initializing Three.js Earth...');

    try {
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 3;

      // Create renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      // Create Earth sphere with basic texture
      const geometry = new THREE.SphereGeometry(1, 64, 64);

      // Create a canvas-based procedural Earth texture
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;

      // Create gradient for oceans and land
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1e3a5f'); // Deep ocean
      gradient.addColorStop(0.3, '#2d5a8c'); // Ocean
      gradient.addColorStop(0.5, '#4a7ba7'); // Coastal water
      gradient.addColorStop(0.7, '#6b9d59'); // Lowland
      gradient.addColorStop(0.85, '#8db85f'); // Plains
      gradient.addColorStop(1, '#a0c97d'); // Highlands

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add some land-like patterns
      ctx.fillStyle = 'rgba(139, 184, 95, 0.3)';
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 150 + 50;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 100 + 30;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const proceduralTexture = new THREE.CanvasTexture(canvas);
      proceduralTexture.needsUpdate = true;

      const proceduralMaterial = new THREE.MeshPhongMaterial({
        map: proceduralTexture,
        bumpScale: 0.05,
        specular: new THREE.Color('grey'),
        shininess: 5
      });

      // Create Earth mesh with procedural texture
      const earth = new THREE.Mesh(geometry, proceduralMaterial);

      // Load real Earth texture from NASA - use reliable CDN
      const textureLoader = new THREE.TextureLoader();

      // Try multiple sources for Earth texture
      const textureUrls = [
        // NASA Blue Marble - higher resolution, more reliable
        'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
        // Alternative: NASA Visible Earth
        'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg',
        // Fallback: Three.js CDN
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'
      ];

      let textureLoaded = false;

      const tryLoadTexture = (index: number) => {
        if (index >= textureUrls.length || textureLoaded) {
          if (!textureLoaded) {
            console.warn('[ThreeGlobe] All texture sources failed, using procedural');
          }
          return;
        }

        textureLoader.load(
          textureUrls[index],
          // Success callback
          (realTexture) => {
            if (textureLoaded) return; // Already loaded from another source
            textureLoaded = true;
            console.log(`[ThreeGlobe] ✓ Real Earth texture loaded from source ${index + 1}`);
            const realMaterial = new THREE.MeshPhongMaterial({
              map: realTexture,
              bumpScale: 0.05,
              specular: new THREE.Color('grey'),
              shininess: 5
            });
            earth.material.dispose(); // Clean up procedural material
            earth.material = realMaterial;
            realTexture.needsUpdate = true;
          },
          // Progress callback
          (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            console.log(`[ThreeGlobe] Loading texture: ${percent.toFixed(0)}%`);
          },
          // Error callback - try next source
          (error) => {
            console.warn(`[ThreeGlobe] Source ${index + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
            tryLoadTexture(index + 1);
          }
        );
      };

      // Start loading from first source
      tryLoadTexture(0);

      scene.add(earth);

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      // Add directional light (sun)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 3, 5);
      scene.add(directionalLight);

      // Store scene data
      sceneRef.current = {
        scene,
        camera,
        renderer,
        earth,
        animationId: null,
        isUserInteracting: false,
        autoRotationSpeed: 0.001,
        interactionTimeout: null
      };

      // Animation loop
      const animate = () => {
        if (!sceneRef.current) return;

        sceneRef.current.animationId = requestAnimationFrame(animate);

        // Auto-rotate when not interacting
        if (!sceneRef.current.isUserInteracting) {
          sceneRef.current.earth.rotation.y += sceneRef.current.autoRotationSpeed;
        }

        sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
      };

      animate();

      // Mouse interaction
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };

      const onMouseDown = () => {
        isDragging = true;
        if (sceneRef.current) {
          sceneRef.current.isUserInteracting = true;
          if (sceneRef.current.interactionTimeout) {
            clearTimeout(sceneRef.current.interactionTimeout);
          }
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging || !sceneRef.current) return;

        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        sceneRef.current.earth.rotation.y += deltaX * 0.005;
        sceneRef.current.earth.rotation.x += deltaY * 0.005;

        // Limit vertical rotation
        sceneRef.current.earth.rotation.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, sceneRef.current.earth.rotation.x)
        );

        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        isDragging = false;
        if (sceneRef.current) {
          // Resume auto-rotation after 2 seconds of no interaction
          sceneRef.current.interactionTimeout = setTimeout(() => {
            if (sceneRef.current) {
              sceneRef.current.isUserInteracting = false;
            }
          }, 2000);
        }
      };

      const onMouseWheel = (e: WheelEvent) => {
        if (!sceneRef.current) return;
        e.preventDefault();

        const delta = e.deltaY * 0.001;
        sceneRef.current.camera.position.z += delta;
        sceneRef.current.camera.position.z = Math.max(1.5, Math.min(5, sceneRef.current.camera.position.z));
      };

      renderer.domElement.addEventListener('mousedown', onMouseDown);
      renderer.domElement.addEventListener('mousemove', (event) => {
        previousMousePosition = { x: event.clientX, y: event.clientY };
        onMouseMove(event);
      });
      renderer.domElement.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('mouseleave', onMouseUp);
      renderer.domElement.addEventListener('wheel', onMouseWheel);

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !sceneRef.current) return;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        sceneRef.current.camera.aspect = width / height;
        sceneRef.current.camera.updateProjectionMatrix();
        sceneRef.current.renderer.setSize(width, height);
      };

      window.addEventListener('resize', handleResize);

      console.log('[ThreeGlobe] ✓ Earth initialized and rotating');

      // Cleanup
      return () => {
        console.log('[ThreeGlobe] Cleaning up...');

        if (sceneRef.current) {
          if (sceneRef.current.animationId !== null) {
            cancelAnimationFrame(sceneRef.current.animationId);
          }
          if (sceneRef.current.interactionTimeout) {
            clearTimeout(sceneRef.current.interactionTimeout);
          }

          sceneRef.current.renderer.dispose();
          sceneRef.current.earth.geometry.dispose();
          if (sceneRef.current.earth.material instanceof THREE.Material) {
            sceneRef.current.earth.material.dispose();
          }
        }

        window.removeEventListener('resize', handleResize);

        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      };

    } catch (err: any) {
      console.error('[ThreeGlobe] Initialization failed:', err);
      setError(err.message);
    }
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f1419]">
        <div className="text-center p-6">
          <div className="text-red-500 text-sm mb-2">Failed to initialize 3D Earth</div>
          <div className="text-gray-400 text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0f1419]"
      style={{ cursor: 'grab' }}
    />
  );
}

export default ThreeGlobe;
