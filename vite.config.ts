import { defineConfig } from 'vite';

// Relative base so the built site works from any subpath (e.g. GitHub Pages
// project sites at https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1600, // Phaser is a single large chunk by design
  },
});
