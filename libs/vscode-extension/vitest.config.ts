import { defineProject } from 'vitest/config'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

export default defineProject({
  plugins: [react()],
  test: {
    name: packageJson.name,
    dir: './src',
    watch: false,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['test-setup.ts'],
    coverage: { enabled: true, provider: 'istanbul', include: ['src/**/*'], reporter: ['html', 'json'] },
    restoreMocks: true,

  },
})