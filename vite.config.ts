import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Aqui está a mágica: estamos dizendo ao Vite
      // que qualquer import que comece com '@'
      // deve ser resolvido a partir da pasta 'src'.
      "@": path.resolve(__dirname, "./src"),
    },
  },
})