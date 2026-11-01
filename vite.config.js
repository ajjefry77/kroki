import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api/map-links': {
        target: loadEnv(mode, process.cwd(), 'VITE_').VITE_SERVER || 'https://mapiq.ir:3003',
        changeOrigin: true,
      },
    },
  },
  build: {
    // هشدار صادقانه — chunk سنگین mapbox lazy است و هشدارش طبیعی است
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "mapbox": ["mapbox-gl"],
          "vendor": ["vue", "pinia", "vue-router"],
          "axios": ["axios"],
          "proj4": ["proj4"],
        },
      },
    },
  },
}))
