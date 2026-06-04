import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    port: 5173,
    // host: true binds to the LAN so a phone can reach the dev server.
    // HTTPS (via basicSsl) is required for camera/getUserMedia on real devices.
    host: true,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
