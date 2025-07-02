import { glob } from 'glob';
import path from 'path';
import Mocha from 'mocha';

export async function run(): Promise<void> {
  try {
    // biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
    console.log(`Running tests in VS Code Designer...`);
    const testsRoot = path.resolve(__dirname, '..');
    console.log(`Running tests in: ${testsRoot}`);

    // Create the mocha test
    const mocha = new Mocha({
      ui: 'bdd',
      color: true,
    });

    // Find all test files
    const testFiles = await glob('**/**.test.{js,ts}', { cwd: testsRoot });

    if (testFiles.length === 0) {
      console.log('No test files found');
      return;
    }

    // Add files to the test suite
    testFiles.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    // Run the mocha test
    return new Promise<void>((resolve, reject) => {
      try {
        // Run the mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}
