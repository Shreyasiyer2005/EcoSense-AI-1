import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    cesium()
  ],
  server: {
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/overlays': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      // Fix for Cesium's @zip.js/zip.js import path not being properly exported
      // See: https://github.com/CesiumGS/cesium/issues/12883
      '@zip.js/zip.js/lib/zip-no-worker.js': path.resolve(
        __dirname,
        'node_modules/@zip.js/zip.js/lib/zip-no-worker.js'
      )
    }
  },
  optimizeDeps: {
    // Allow Vite to optimize all Cesium dependencies (including @cesium/engine, @cesium/widgets)
    // vite-plugin-cesium handles the runtime cesium library externalization
    // All CommonJS dependencies will be automatically converted to ESM during pre-bundling
  }
})
