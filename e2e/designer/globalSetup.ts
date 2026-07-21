import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, type FullConfig, type Page } from '@playwright/test';

const WARMUP_TIMEOUT_MS = 120_000;
const MAX_DIAGNOSTIC_ENTRIES = 20;

const addDiagnostic = (diagnostics: string[], message: string) => {
  diagnostics.push(message);
  if (diagnostics.length > MAX_DIAGNOSTIC_ENTRIES) {
    diagnostics.shift();
  }
};

const remainingTime = (deadline: number) => Math.max(1, deadline - Date.now());

const captureFailureState = async (page: Page, outputDir: string) => {
  const screenshotPath = join(outputDir, 'designer-warmup-failure.png');
  await mkdir(outputDir, { recursive: true });

  const bodyText = await page
    .locator('body')
    .innerText({ timeout: 2_000 })
    .then((text) => text.replace(/\s+/g, ' ').slice(0, 1_000))
    .catch(() => '<body text unavailable>');

  const screenshotResult = await page
    .screenshot({ path: screenshotPath, timeout: 5_000 })
    .then(() => screenshotPath)
    .catch((error) => `<screenshot failed: ${error instanceof Error ? error.message : String(error)}>`);

  return {
    url: page.url(),
    bodyText,
    screenshot: screenshotResult,
  };
};

const globalSetup = async (config: FullConfig) => {
  const project = config.projects[0];
  const baseURL = project?.use.baseURL;
  if (typeof baseURL !== 'string') {
    throw new Error('[designer warmup] A string baseURL is required in the first Playwright project.');
  }

  const startedAt = Date.now();
  const deadline = startedAt + WARMUP_TIMEOUT_MS;
  const diagnostics: string[] = [];
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') {
      addDiagnostic(diagnostics, `console.${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => addDiagnostic(diagnostics, `pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    addDiagnostic(diagnostics, `requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? 'unknown error'})`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      addDiagnostic(diagnostics, `response: ${response.status()} ${response.url()}`);
    }
  });

  console.log(`[designer warmup] Waiting up to ${WARMUP_TIMEOUT_MS / 1_000}s for the Local designer shell at ${baseURL}.`);

  try {
    const response = await page.goto(baseURL, {
      waitUntil: 'domcontentloaded',
      timeout: remainingTime(deadline),
    });
    addDiagnostic(diagnostics, `navigation: ${response?.status() ?? 'no response'} ${page.url()}`);

    await page.getByText('Local', { exact: true }).waitFor({
      state: 'visible',
      timeout: remainingTime(deadline),
    });

    console.log(`[designer warmup] Local designer shell ready after ${((Date.now() - startedAt) / 1_000).toFixed(1)}s.`);
  } catch (error) {
    const failureState = await captureFailureState(page, project.outputDir);
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new Error(
      [
        `[designer warmup] Local designer shell was not ready within ${WARMUP_TIMEOUT_MS / 1_000}s.`,
        `Reason: ${reason}`,
        `Page state: ${JSON.stringify(failureState)}`,
        `Recent browser diagnostics:\n${diagnostics.length > 0 ? diagnostics.join('\n') : '<none>'}`,
      ].join('\n')
    );
  } finally {
    await browser.close();
  }
};

export default globalSetup;
