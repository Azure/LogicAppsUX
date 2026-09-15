import { expect, test, type Page, type Request } from '@playwright/test';

test.skip(({ baseURL }) => baseURL !== 'http://127.0.0.1:4280', 'Requires the production-only ephemeral Playwright configuration.');

const observePreview = async (page: Page, baseURL: string) => {
  const origin = new URL(baseURL).origin;
  const prohibitedRequests: string[] = [];
  const assetFailures: string[] = [];
  const pageErrors: string[] = [];

  const isRequiredAsset = (request: Request) => {
    const url = new URL(request.url());
    return (
      url.origin === origin &&
      (['document', 'script', 'stylesheet', 'font'].includes(request.resourceType()) ||
        url.pathname.startsWith('/assets/') ||
        url.pathname === '/vite.svg')
    );
  };

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const credentialRequest =
      /^\/(?:__dev|\.auth)\//.test(url.pathname) || /\/(?:armToken|foundryToken|subscriptionIds)\.json$/i.test(url.pathname);
    const externalApiRequest = url.origin !== origin && ['fetch', 'xhr'].includes(request.resourceType());
    if (credentialRequest || externalApiRequest) {
      prohibitedRequests.push(`${url.origin}${url.pathname}`);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && isRequiredAsset(response.request())) {
      assetFailures.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText;
    if (isRequiredAsset(request) && failure !== 'net::ERR_ABORTED') {
      assetFailures.push(`${failure} ${new URL(request.url()).pathname}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  return () => {
    expect(prohibitedRequests, 'The local-only preview must not request credentials or external APIs').toEqual([]);
    expect(assetFailures, 'Required static documents and assets must load successfully').toEqual([]);
    expect(pageErrors, 'The production app must not raise uncaught page errors').toEqual([]);
  };
};

const expectLocalOnlySettings = async (page: Page) => {
  await expect(page.getByRole('radio', { name: 'Local', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Azure', exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox', { name: 'Workflow File To Load' })).toBeVisible();
};

const selectRecurrenceWorkflow = async (page: Page, hasBackground: boolean) => {
  await page.getByRole('combobox', { name: 'Workflow File To Load' }).click();
  await page.getByRole('option', { name: 'Recurrence', exact: true }).click();
  await expect(page.getByTestId('card-recurrence')).toBeVisible();
  if (hasBackground) {
    await expect(page.locator('.react-flow__background')).toHaveCSS('pointer-events', 'none');
  }
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('Zoom view to fit').click();
};

for (const path of ['/', '/v2']) {
  test(`${path} loads and edits a local workflow, then survives a direct reload`, async ({ page, baseURL }) => {
    const assertHealthyPreview = await observePreview(page, baseURL!);

    const initialResponse = await page.goto(path);
    expect(initialResponse?.status()).toBe(200);
    await expectLocalOnlySettings(page);

    await selectRecurrenceWorkflow(page, path === '/v2');
    await page.getByTestId('card-recurrence').click();
    const interval = page.getByPlaceholder('Specify the interval.');
    await interval.fill('3');
    await interval.press('Tab');
    await page.getByRole('tab', { name: 'About', exact: true }).click();
    await page.getByRole('tab', { name: 'Parameters', exact: true }).click();
    await expect(interval).toHaveValue('3');

    const reloadResponse = await page.reload();
    expect(reloadResponse?.status()).toBe(200);
    expect(reloadResponse?.headers()['content-type']).toContain('text/html');
    await expectLocalOnlySettings(page);
    await selectRecurrenceWorkflow(page, path === '/v2');
    await expect(page.getByTestId('card-recurrence')).toBeVisible();

    assertHealthyPreview();
  });
}

test('missing static assets return 404 instead of the SPA fallback', async ({ request }) => {
  for (const path of ['/assets/preview-smoke-missing.js', '/assets/preview-smoke-missing.css']) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('<div id="root">');
  }
});

test('trusted hosting config retains exact provider blocks in the static harness', async ({ request }) => {
  // This verifies static routing only; SWA may handle reserved /.auth/me and /.auth/logout ahead of these rules.
  // Both exact provider 404s still require live verification after a trusted-main deployment, without following redirects.
  const configurationResponse = await request.get('/staticwebapp.config.json');
  expect(configurationResponse.status()).toBe(200);
  const configuration = await configurationResponse.json();
  expect(configuration.routes).toEqual([
    { route: '/.auth/login/aad', statusCode: 404 },
    { route: '/.auth/login/github', statusCode: 404 },
    { route: '/.auth/*', statusCode: 404 },
  ]);

  for (const path of ['/.auth/login/aad', '/.auth/login/github', '/.auth/me']) {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const response = await request.fetch(path, { method, maxRedirects: 0 });
      expect(response.status()).toBe(404);
      expect(response.headers().location).toBeUndefined();
      expect(await response.text()).toBe('');
    }
  }
});
