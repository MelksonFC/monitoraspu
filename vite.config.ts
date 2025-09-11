import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  define: {
    'global': {},
    'process.env': {}
  },
  base: "/monitoraspu",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer/',
    },
  },
   optimizeDeps: {
    esbuildOptions: {
      // Define 'global' para o objeto 'window' do navegador
      define: {
        global: 'globalThis',
      },
      // Habilita o suporte para plugins do esbuild, necessário para injetar os polyfills
      plugins: [
        // Adicione outros polyfills de Node aqui se necessário (ex: 'path', 'stream')
      ],
    },
  },
})