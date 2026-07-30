import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (!env.API_PROXY_TARGET) {
    throw new Error("Falta configurar API_PROXY_TARGET en el archivo .env.");
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/ai": {
          target: env.API_PROXY_TARGET,
          changeOrigin: true,
          secure: true,
          rewrite: () => "/chat",
        },
      },
    },
  };
});
