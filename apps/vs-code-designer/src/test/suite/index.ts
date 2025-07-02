import * as path from 'path';
import { glob } from 'glob';
import { startVitest } from 'vitest/node';

export async function run(): Promise<void> {
  try {
    const testsRoot = path.resolve(__dirname, '..');
    
    // Find all test files
    const testFiles = await glob('**/**.test.{js,ts}', { cwd: testsRoot });
    
    if (testFiles.length === 0) {
      console.log('No test files found');
      return;
    }

    // Start Vitest programmatically
    const vitest = await startVitest('test', [], {
      mode: 'test',
      watch: false,
      reporters: ['default'],
      include: testFiles.map(f => path.resolve(testsRoot, f)),
      // Use the same config as in vitest.config.ts
      environment: 'node',
    });
    
    // Wait for tests to complete
    await vitest.start();
    
    // If there are failures, throw an error
    if (vitest.state.getCountOfFailedTests() > 0) {
      throw new Error(`${vitest.state.getCountOfFailedTests()} tests failed.`);
    }
  } catch (err) {
    console.error(err);
    throw err;
  }
}
