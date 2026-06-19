import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "postmeningeal-homeoplastic-janiyah.ngrok-free.dev"
    ]
  }
})
