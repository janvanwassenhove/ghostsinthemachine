import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

// Relative base so the built site works from any subpath (e.g. GitHub Pages
// project sites at https://<user>.github.io/<repo>/).
export default defineConfig({
  base: './',
  // Bake the package version in so the menu shows the real build.
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    chunkSizeWarningLimit: 1600, // Phaser is a single large chunk by design
  },
});
