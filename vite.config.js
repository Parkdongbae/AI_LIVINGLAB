import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the build run from the GitHub Pages subpath (/AI_LIVINGLAB/) or any folder.
export default defineConfig({
  base: './',
  plugins: [react()],
});
