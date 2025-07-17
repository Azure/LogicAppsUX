import * as path from "path";
import Mocha from "mocha";
import * as glob from "glob";

export async function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: "tdd", // Using TDD interface (suite, test, setup, teardown)
    color: true,
  });

  const testsRoot = path.resolve(__dirname, "..");

  try {
    // Find all test files
    const testFiles = glob.sync("**/**.testE2E.js", { cwd: testsRoot });

    // Add files to the test suite
    testFiles.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    // Run the mocha tests
    return new Promise<void>((resolve, reject) => {
      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}
