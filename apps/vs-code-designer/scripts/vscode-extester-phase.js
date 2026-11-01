/* global console, process, require */
// Suite-owned ExTester worker: run-e2e.ts chooses the phase and files. This is
// not an alternate E2E entry point or a scenario-generation script.
const fs = require('node:fs');
const { ExTester } = require('vscode-extension-tester');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const tester = new ExTester(input.storageFolder, undefined, input.extensionsDir);
tester.runTests(input.files, input.options).then(
  (code) => {
    fs.writeFileSync(input.resultPath, JSON.stringify({ functionalExitCode: code }));
    process.exitCode = code;
  },
  (error) => {
    console.error(error);
    fs.writeFileSync(input.resultPath, JSON.stringify({ functionalExitCode: null, error: 'extester-phase-execution-failed' }));
    process.exitCode = 1;
  }
);
