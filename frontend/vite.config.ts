import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// HTTPS (cert autofirmado) para que el micrófono funcione desde el celular en
// desarrollo: los navegadores solo permiten micrófono en contexto seguro.
// En el build de producción (vite build) NO se incluye basicSsl.
// El proxy /api es solo de desarrollo; en Vercel lo reemplaza el rewrite de vercel.json.
export default defineConfig(({ command }) => ({
  plugins: [react(), ...(command === "serve" ? [basicSsl()] : [])],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
}));
