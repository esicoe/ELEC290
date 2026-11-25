import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  publicDir: false,
  build: {
    assetsDir: "a",
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        // Short names: the firmware only accepts 95-byte request lines.
        entryFileNames: "a/[hash].js",
        chunkFileNames: "a/[hash].js",
        assetFileNames: "a/[hash][extname]",
        // One bundle would exceed the per-file limit in scripts/embed.mjs.
        codeSplitting: {
          groups: [{ name: "preact", test: /node_modules[\\/]preact[\\/]dist/ }],
        },
      },
    },
  },
});
