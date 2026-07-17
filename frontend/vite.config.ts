import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// HTTPS (cert autofirmado) para que el micrófono funcione desde el celular:
// los navegadores solo permiten micrófono en contexto seguro (https o localhost).
// El proxy manda /api al backend por debajo, así la página HTTPS no cae en
// "contenido mixto" al llamar a la API (todo sale por el mismo origen).
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
