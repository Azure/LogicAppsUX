/**
 * This is a special module that exports the VS Code API from the extension host environment
 * Based on: https://github.com/microsoft/vscode-test/issues/37#issuecomment-700167820
 */

// VS Code API is available as process.vscode when running in the extension host
// Export it so tests can import it
// eslint-disable-next-line no-undef
export default process.vscode;
