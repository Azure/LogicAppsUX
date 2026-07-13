import { test as base, expect } from '@playwright/test';
import type { Browser, BrowserContext, BrowserContextOptions, Page, TestInfo, WorkerInfo } from '@playwright/test';
import { designerStorageState } from '../designerStorageState';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';

type SharedDesignerOptions = {
  mockWorkflow: string | undefined;
};

type SharedDesignerWorkerFixtures = {
  sharedContextManager: {
    getContext: (testFile: string) => Promise<BrowserContext>;
  };
};

type ProjectInfo = Pick<WorkerInfo, 'project'>;

const contextOptions = ({ project }: ProjectInfo, videoDirectory?: string): BrowserContextOptions => {
  const options = project.use;
  return {
    acceptDownloads: options.acceptDownloads,
    baseURL: options.baseURL,
    bypassCSP: options.bypassCSP,
    colorScheme: options.colorScheme,
    deviceScaleFactor: options.deviceScaleFactor,
    extraHTTPHeaders: options.extraHTTPHeaders,
    forcedColors: options.forcedColors,
    geolocation: options.geolocation,
    hasTouch: options.hasTouch,
    httpCredentials: options.httpCredentials,
    ignoreHTTPSErrors: options.ignoreHTTPSErrors,
    isMobile: options.isMobile,
    javaScriptEnabled: options.javaScriptEnabled,
    locale: options.locale,
    offline: options.offline,
    permissions: options.permissions,
    proxy: options.proxy,
    recordVideo: videoDirectory ? { dir: videoDirectory, size: options.viewport ?? undefined } : undefined,
    reducedMotion: options.reducedMotion,
    screen: options.screen,
    serviceWorkers: options.serviceWorkers,
    storageState: options.storageState,
    timezoneId: options.timezoneId,
    userAgent: options.userAgent,
    viewport: options.viewport,
  };
};

const createDesignerContext = async (browser: Browser, projectInfo: ProjectInfo, videoDirectory?: string) => {
  const context = await browser.newContext(contextOptions(projectInfo, videoDirectory));
  const originState = designerStorageState.origins[0];

  await context.addInitScript(
    ({ localStorageEntries, origin }) => {
      if (window.location.origin !== origin) {
        return;
      }

      window.localStorage.clear();
      window.sessionStorage.clear();
      for (const { name, value } of localStorageEntries) {
        window.localStorage.setItem(name, value);
      }
    },
    {
      localStorageEntries: originState.localStorage,
      origin: originState.origin,
    }
  );

  return context;
};

const prepareDesignerPage = async (page: Page, mockWorkflow: string | undefined) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  if (mockWorkflow) {
    await GoToMockWorkflow(page, mockWorkflow);
  }
};

const closeIgnoringTargetClosed = async (close: () => Promise<void>) => {
  try {
    await close();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Target page, context or browser has been closed')) {
      throw error;
    }
  }
};

const attachRetryVideo = async (context: BrowserContext, page: Page, testInfo: TestInfo) => {
  const video = page.video();
  await closeIgnoringTargetClosed(() => page.close());
  await closeIgnoringTargetClosed(() => context.close());

  if (video) {
    await testInfo.attach('video', {
      path: await video.path(),
      contentType: 'video/webm',
    });
  }
};

export const test = base.extend<SharedDesignerOptions, SharedDesignerWorkerFixtures>({
  mockWorkflow: [undefined, { option: true }],
  sharedContextManager: [
    async ({ browser }, use, workerInfo) => {
      // Keep resource caches within a spec file, while pages and browser storage still reset for every test.
      const contexts = new Map<string, BrowserContext>();

      await use({
        getContext: async (testFile) => {
          const existingContext = contexts.get(testFile);
          if (existingContext) {
            return existingContext;
          }

          const context = await createDesignerContext(browser, workerInfo);
          contexts.set(testFile, context);
          return context;
        },
      });

      await Promise.all([...contexts.values()].map((context) => context.close()));
    },
    { scope: 'worker' },
  ],
  page: async ({ browser, mockWorkflow, sharedContextManager }, runTest, testInfo) => {
    const recordRetryArtifacts = testInfo.retry === 1;
    const retryContext =
      testInfo.retry > 0
        ? await createDesignerContext(browser, testInfo, recordRetryArtifacts ? testInfo.outputPath('video') : undefined)
        : undefined;
    const context = retryContext ?? (await sharedContextManager.getContext(testInfo.file));
    const page = await context.newPage();

    try {
      await prepareDesignerPage(page, mockWorkflow);
      await runTest(page);
    } finally {
      if (retryContext) {
        await attachRetryVideo(context, page, testInfo);
      } else {
        await page.close();
      }
    }
  },
});

export { expect };
