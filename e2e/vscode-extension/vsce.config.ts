/**
 * Configuration for vscode-extension-tester
 * See: https://github.com/redhat-developer/vscode-extension-tester/blob/main/resources/settings.json
 */
export default {
  // Path to the extension vsix file or directory containing the extension
  extensionPath: "../apps/vs-code-designer/dist",
  // VSCode version to test against
  vscodeVersion: "stable",
  // Increase the download timeout for VSCode binary
  downloadTimeout: 60000,
  // Chromium options - show UI when debugging
  chromiumOptions: {
    headless: process.env.UI_SHOW ? false : true,
    args: ["--no-sandbox"]
  }
};