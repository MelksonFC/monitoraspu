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
})