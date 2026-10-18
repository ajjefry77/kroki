import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5174,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "mapbox": ["mapbox-gl"],
          "vendor": ["vue"],
          "axios": ["axios"],
          "proj4": ["proj4"],
        },
      },
    },
  },
})
