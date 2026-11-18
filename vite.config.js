import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => ({
  plugins: [vue(), {
    name: 'fontawesome-display-swap',
    enforce: 'pre',
    transform(code, id) {
      if (/fontawesome-free[\\/]css[\\/](solid|regular)\.min\.css/.test(id)) {
        return code.replace(/font-display:block/g, 'font-display:swap')
      }
    },
  }],
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
