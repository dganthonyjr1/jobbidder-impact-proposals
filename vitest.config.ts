import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Standalone vitest config — intentionally does NOT load the app's Vite/TanStack
// plugin chain (that pulls in the SSR/router build and is unnecessary for unit
// tests). We just need the "@/..." path alias and a node environment.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
