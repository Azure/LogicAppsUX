import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['vscode'],
  keepNames: true,
  dts: false, // Skip .d.ts generation for performance
  // Enable linting after build (TypeScript checking disabled due to monorepo complexity)
  async onSuccess() {
    const { execSync } = await import('child_process');
    try {
      console.log('🔍 Running ESLint...');
      execSync('eslint . --ext ts,tsx --report-unused-disable-directives', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ ESLint passed');

      console.log('✅ Build completed successfully');
    } catch (_error) {
      console.error('❌ Build failed during checks');
      process.exit(1);
    }
  },
});
