/**
 * Global declarations for VS Code API in tests
 */

// AI attempt to fix this issue that did not work https://github.com/microsoft/vscode-test/issues/37
// Tell TypeScript about the global vscode object
declare global {
  // eslint-disable-next-line no-var
  var vscode: any;
}

export {};
