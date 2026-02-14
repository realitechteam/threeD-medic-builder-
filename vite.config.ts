import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const httpsConfig = fs.existsSync('./.cert/localhost.key') && fs.existsSync('./.cert/localhost.crt')
  ? {
    key: fs.readFileSync('./.cert/localhost.key'),
    cert: fs.readFileSync('./.cert/localhost.crt'),
  }
  : undefined;

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    https: httpsConfig,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
