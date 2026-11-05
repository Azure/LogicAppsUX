import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['vscode'],
  noExternal: ['btm-data-mapper'],
  keepNames: true,
  // Enable linting and type checking after build
  async onSuccess() {
    const { execSync } = await import('child_process');
    const startTime = Date.now();

    const runCheck = async (name: string, command: string, emoji: string) => {
      const checkStart = Date.now();
      console.log(`${emoji} Running ${name}...`);

      try {
        execSync(command, {
          stdio: 'inherit',
          cwd: __dirname,
          env: { ...process.env, FORCE_COLOR: '1' }, // Preserve colors in CI
        });
        const duration = Date.now() - checkStart;
        console.log(`✅ ${name} passed (${duration}ms)`);
        return true;
      } catch (error) {
        const duration = Date.now() - checkStart;
        console.error(`❌ ${name} failed (${duration}ms)`);
        if (error instanceof Error && 'status' in error) {
          console.error(`Exit code: ${(error as any).status}`);
        }
        throw error;
      }
    };

    try {
      await runCheck('TypeScript type check', 'tsc --noEmit --pretty', '🔍');

      await runCheck('ESLint', 'eslint . --ext ts,tsx --report-unused-disable-directives', '🧹');

      const totalDuration = Date.now() - startTime;
      console.log(`🎉 All checks passed! Total time: ${totalDuration}ms`);
    } catch {
      const totalDuration = Date.now() - startTime;
      console.error(`💥 Build checks failed after ${totalDuration}ms`);
    }
  },
});
