import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app calls the FastAPI backend through a same-origin `/api` proxy.
// Without this, the browser request only succeeded when the page was opened at
// exactly http://localhost:5173 (the only Vite origin FastAPI's CORS allowed);
// 127.0.0.1:5173, [::1]:5173, a fallback port (5174) or `vite preview` (4173)
// made "Run analysis" fail before reaching the existing analysis pipeline.
const backend = process.env.FIELDSHIFT_API_PROXY || 'http://127.0.0.1:8000';
const proxy = { '/api': { target: backend, changeOrigin: true } };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('/research3d/') || id.includes('RealFarmCanvas3D') || id.includes('NasaWeatherStation3D')) {
            return 'research-3d-views';
          }
          if (id.includes('ResearchWorkspaceView') || id.includes('SixSeasonRecommendationView') || id.includes('ComparisonLabView')) {
            return 'research-lab-views';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
