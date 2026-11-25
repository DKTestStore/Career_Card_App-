import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2020', sourcemap: false },
  // `npm run serve:local` runs the portfolio API on :4174; the dev server forwards to it.
  server: { proxy: { '/api': 'http://localhost:4174' } },
});
