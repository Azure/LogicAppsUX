import { defineProject } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    environment: 'happy-dom',
    setupFiles: ['test-setup.ts'],
    globalSetup: './test-globals.ts',
    root: './',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'build'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'cobertura'] },
    restoreMocks: true,
  },
});
