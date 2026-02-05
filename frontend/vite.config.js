import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // Increase limit to suppress warnings for now
    rollupOptions: {
      output: {
         manualChunks: {
           'vendor-react': ['react', 'react-dom', 'react-router-dom'],
           'vendor-ui': ['lucide-react', 'recharts'],
           'vendor-supabase': ['@supabase/supabase-js']
         }
      }
    }
  }
})
