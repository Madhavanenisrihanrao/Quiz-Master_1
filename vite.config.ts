import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_BASE || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // optional: rewrite if your backend expects a different path
        // rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  }
});
