import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "postmeningeal-homeoplastic-janiyah.ngrok-free.dev",
      "http://crime-gpt-v2.vercel.app"
    ]
  },
  build: {
    // Increase chunk size warning limit to 1MB (default: 500KB)
    chunkSizeWarningLimit: 1000,
    // Optimize chunk splitting for better loading performance
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor chunks for better caching
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('lucide')) {
              return 'ui-vendor';
            }
          }
        }
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Generate source maps for debugging (disable in production if needed)
    sourcemap: false
  }
})
