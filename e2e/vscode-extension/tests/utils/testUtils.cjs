const { VSBrowser } = require('vscode-extension-tester');

/**
 * Wait for a specified amount of time
 * @param {number} ms Time to wait in milliseconds
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a VSCode browser instance
 * @returns {Promise<VSBrowser>} Promise that resolves with a VSBrowser instance
 */
async function createBrowser() {
  return new VSBrowser();
}

/**
 * Close and cleanup browser instance
 * @param {VSBrowser} browser VSBrowser instance to close
 */
async function closeBrowser(browser) {
  if (browser) {
    await browser.quit();
  }
}

module.exports = { wait, createBrowser, closeBrowser };