import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  if (!env.BASE_URL) {
    throw new Error("Falta configurar BASE_URL en el archivo .env.");
  }

  return {
    plugins: [react()],
    define: {
      __BASE_URL__: JSON.stringify(env.BASE_URL),
    },
  };
});
