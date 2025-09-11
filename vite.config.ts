import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// Importe o plugin que acabamos de instalar
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  // A ordem dos plugins não importa aqui
  plugins: [
    react(),
    // Chame o plugin. Ele fará a mágica de encontrar e injetar o 'buffer' e outros.
    nodePolyfills({
      // Opções para garantir que tudo seja incluído
      // Inclui polyfills para variáveis globais
      globals: {
        Buffer: true, // ==> Adiciona o polyfill global para Buffer
        global: true,
        process: true,
      },
      // Especifica quais módulos devem ter polyfill. 'buffer' é o nosso alvo principal.
      protocolImports: true,
    }),
  ],
  base: "/monitoraspu",
  resolve: {
    alias: {
      // Seu alias para o diretório 'src' continua aqui, está perfeito.
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Não precisamos mais das seções 'define' ou 'optimizeDeps' manuais
  // para este problema, pois o plugin cuida disso.
});