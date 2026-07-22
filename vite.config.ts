// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      serverDir: ".vercel/output/functions/__server.func",
      publicDir: ".vercel/output/static",
    },
  },
  vite: {
    base: process.env.GITHUB_PAGES === "true" ? "/jobbidder-impact-proposals/" : "/",
    build: {
      rollupOptions: {
        // officeparser (used only to read Word/Excel/PowerPoint text) statically
        // references these optional heavy deps for features we never call —
        // puppeteer (PDF *generation*) and tesseract.js (OCR). Leave them
        // external so the bundler doesn't try to resolve/inline them; the code
        // paths that would load them are never executed.
        external: ["puppeteer", "tesseract.js"],
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
