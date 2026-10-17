import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        admin: resolve(process.cwd(), "index.html"),
        guest: resolve(process.cwd(), "src/guest.html"),
      },
    },
  },
});
