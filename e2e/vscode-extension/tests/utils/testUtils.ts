import { VSBrowser } from 'vscode-extension-tester';

/**
 * Wait for a specified amount of time
 * @param ms Time to wait in milliseconds
 * @returns Promise that resolves after the specified time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a VSCode browser instance
 * @returns Promise that resolves with a VSBrowser instance
 */
export async function createBrowser(): Promise<VSBrowser> {
  return new VSBrowser();
}

/**
 * Close and cleanup browser instance
 * @param browser VSBrowser instance to close
 */
export async function closeBrowser(browser: VSBrowser): Promise<void> {
  if (browser) {
    await browser.quit();
  }
}