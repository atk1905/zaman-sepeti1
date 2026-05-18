/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({ base: process.env.GITHUB_PAGES === 'true' ? '/zaman-sepeti1/' : '/', plugins: [react()], test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' } });
