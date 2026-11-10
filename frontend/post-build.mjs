/**
 * Post-build script to fix Cesium files location
 * 
 * Issue: vite-plugin-cesium places Cesium files at dist/EcoSense-AI-1/cesium/
 * but they need to be at dist/cesium/ for GitHub Pages deployment
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const nestedCesiumDir = path.join(distDir, 'EcoSense-AI-1', 'cesium');
const targetCesiumDir = path.join(distDir, 'cesium');

async function fixCesiumLocation() {
  try {
    console.log('🔧 Post-build: Fixing Cesium files location...');
    
    // Check if nested Cesium directory exists
    if (!fs.existsSync(nestedCesiumDir)) {
      console.log('⚠️  No nested Cesium directory found at:', nestedCesiumDir);
      console.log('   Cesium files might already be in the correct location.');
      return;
    }
    
    // Remove existing target if it exists
    if (fs.existsSync(targetCesiumDir)) {
      console.log('   Removing existing cesium directory at dist root...');
      await fs.remove(targetCesiumDir);
    }
    
    // Copy Cesium files to dist root
    console.log('   Copying Cesium files from:', nestedCesiumDir);
    console.log('   to:', targetCesiumDir);
    await fs.copy(nestedCesiumDir, targetCesiumDir);
    
    // Remove the nested EcoSense-AI-1 directory since we don't need it
    const nestedBaseDir = path.join(distDir, 'EcoSense-AI-1');
    console.log('   Removing nested directory:', nestedBaseDir);
    await fs.remove(nestedBaseDir);
    
    console.log('✅ Cesium files relocated successfully!');
    console.log('   Cesium files are now at: dist/cesium/');
    
  } catch (error) {
    console.error('❌ Error fixing Cesium location:', error);
    process.exit(1);
  }
}

fixCesiumLocation();
