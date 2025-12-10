import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },

  build: {
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // IMPORTANT: Contrôler strictement l'ordre des chunks
        manualChunks(id) {
          // 1. React et React-DOM en PREMIER (chargés avant tout)
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          
          // 2. Ensuite Firebase
          if (id.includes('node_modules/firebase') || 
              id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          
          // 3. Puis Framer Motion
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer';
          }
          
          // 4. Radix UI (shadcn/ui)
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          
          // 5. Autres bibliothèques UI
          if (id.includes('node_modules/lucide-react') || 
              id.includes('node_modules/cmdk') ||
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/@tanstack/react-query') ||
              id.includes('node_modules/recharts')) {
            return 'vendor-ui';
          }
          
          // 6. React Router
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
