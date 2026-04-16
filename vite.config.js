import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
 
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    target: "esnext",
    outDir: "dist",
  },
  resolve: {
    alias: {
      "node:buffer": "buffer",
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});
 
