import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      injectRegister: null, // On enregistre manuellement
      manifest: false, // On utilise manifest.webmanifest
      injectManifest: {
        injectionPoint: undefined
      }
    })
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  
  build: {
    minify: mode === 'development' ? false : 'esbuild',
    sourcemap: mode === 'development' ? true : false,
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          
          if (id.includes('node_modules/firebase') || 
              id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          
          if (id.includes('node_modules/lucide-react') || 
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/recharts')) {
            return 'vendor-ui';
          }
          
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
        },
      },
    },
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'framer-motion',
      'lucide-react',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
  },
}));
