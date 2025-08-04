import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['vscode'],
  keepNames: true,
  // Enable linting and type checking after build
  async onSuccess() {
    const { execSync } = await import('child_process');
    try {
      console.log('🔍 Running TypeScript type check...');
      execSync('tsc --noEmit', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ TypeScript type check passed');

      console.log('🔍 Running ESLint...');
      execSync('eslint . --ext ts,tsx --report-unused-disable-directives', { stdio: 'inherit', cwd: __dirname });
      console.log('✅ ESLint passed');

      console.log('✅ Build completed successfully');
    } catch (_error) {
      console.error('❌ Build failed during checks');
    }
  },
});
