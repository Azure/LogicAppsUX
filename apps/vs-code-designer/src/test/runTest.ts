import * as path from 'path';
import { runTests, runVSCodeCommand } from '@vscode/test-electron';

// Ensure Node.js environment variables are correctly set
process.env.NODE_ENV = 'test';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../');

    // The path to the extension test script
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');

    // needed for running outside of debug mode
    await runVSCodeCommand(['--install-extension', 'ms-azuretools.vscode-azurefunctions']);
    await runVSCodeCommand(['--install-extension', 'Azurite.azurite']);
    await runVSCodeCommand(['--install-extension', 'ms-dotnettools.csharp']);
    await runVSCodeCommand(['--install-extension', 'ms-dotnettools.csdevkit']);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      //launchArgs: ['--disable-extensions'],
    });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
