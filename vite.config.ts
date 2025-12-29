import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Não precisamos mais de plugins de polyfill!

export default defineConfig({
  plugins: [react()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Todas as configurações manuais de 'define', 'optimizeDeps' e 'nodePolyfills'
  // podem ser removidas.
});