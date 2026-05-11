import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces (Tailscale accessible)
    port: 1235,
    allowedHosts: ['petrockstudios', 'localhost', '192.168.56.1:1235'],
    hmr: {
      protocol: 'ws',
      clientPort: 1235,
    },
    strictPort: true,
  },
})
