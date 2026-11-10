import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'
import type { Plugin } from 'vite'

// Custom plugin to inject Cesium base URL configuration
function cesiumBaseUrlPlugin(): Plugin {
  return {
    name: 'cesium-base-url',
    transformIndexHtml(html) {
      // Inject script to set CESIUM_BASE_URL before any Cesium code loads
      return html.replace(
        '<head>',
        `<head>
    <script>
      // Configure Cesium base URL for GitHub Pages deployment
      window.CESIUM_BASE_URL = '/EcoSense-AI-1/cesium/';
    </script>`
      );
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/EcoSense-AI-1/',
  plugins: [
    react(),
    cesium({
      rebuildCesium: true
    }),
    cesiumBaseUrlPlugin()
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
      '@zip.js/zip.js/lib/zip-no-worker.js': path.resolve(
        __dirname,
        'node_modules/@zip.js/zip.js/lib/zip-no-worker.js'
      )
    }
  },
  optimizeDeps: {
    // Allow Vite to optimize all Cesium dependencies
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
