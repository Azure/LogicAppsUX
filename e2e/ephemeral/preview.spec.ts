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

test('trusted hosting config blocks SWA auth paths in the static harness', async ({ request }) => {
  // This verifies the config contract and local harness, not SWA's live auth service.
  const configurationResponse = await request.get('/staticwebapp.config.json');
  expect(configurationResponse.status()).toBe(200);
  const configuration = await configurationResponse.json();
  expect(configuration.routes).toEqual([{ route: '/.auth/*', statusCode: 404 }]);

  for (const path of ['/.auth/login/aad', '/.auth/login/github', '/.auth/me']) {
    for (const method of ['GET', 'POST', 'HEAD']) {
      const response = await request.fetch(path, { method, maxRedirects: 0 });
      expect(response.status()).toBe(404);
      expect(response.headers().location).toBeUndefined();
      expect(await response.text()).toBe('');
    }
  }
});

const allScopeActionIds = [
  'Recurrence',
  'Switch',
  'Condition',
  'Terminate',
  'Increment_variable_4',
  'Terminate_2',
  'ForEach',
  'ForEach_Action_1',
  'ForEach_nested',
  'ForEach_Action_2',
  'ForEach_Action_3',
  'ForEach_empty',
  'Scope',
  'Scope_Action_1',
  'Scope_Action_2',
  'Scope_nested',
  'Scope_Action_3',
  'Scope_empty',
  'Until',
  'Until_Action_1',
  'Until_Action_2',
  'Until_Nested',
  'Until_Action_3',
  'Default-Compose',
  'Initialize_owner',
];

const selectAllScopeWorkflow = async (page: Page) => {
  await expectLocalOnlySettings(page);
  await page.getByRole('combobox', { name: 'Workflow File To Load' }).click();
  await page.getByRole('option', { name: 'All Scope Nodes', exact: true }).click();
  await expect(page.locator('[id="msla-node-Recurrence"]')).toBeVisible();
  await page.getByRole('button', { name: 'Toolbox' }).click();
};

const expectSelectedAndFocused = async (page: Page, nodeId: string) => {
  await expect(page.locator(`.msla-panel-card-header input[id="${nodeId}-title"]`), `${nodeId} operation details`).toBeVisible();
  await expect(page.locator(`[id="msla-node-${nodeId}"]`), `${nodeId} keyboard focus`).toBeFocused();
};

const renderedOperationOrder = (page: Page) =>
  page
    .locator(
      '.react-flow__node-OPERATION_NODE [id^="msla-node-"][tabindex], .react-flow__node-SCOPE_CARD_NODE [id^="msla-node-"][tabindex]'
    )
    .evaluateAll((elements) =>
      elements
        .filter((element): element is HTMLElement => element instanceof HTMLElement && element.tabIndex > 0)
        .map((element) => ({ id: element.id.slice('msla-node-'.length), index: element.tabIndex }))
        .sort((left, right) => left.index - right.index)
    );

for (const path of ['/', '/v2']) {
  for (const modifier of ['Control', 'Meta']) {
    test(`${path} ${modifier}+arrows traverse branches and nested scopes without wrapping or stealing editor keys`, async ({
      page,
      baseURL,
    }) => {
      const assertHealthyPreview = await observePreview(page, baseURL!);
      await page.goto(path);
      await selectAllScopeWorkflow(page);
      await page.locator('[id="msla-node-Recurrence"]').click();
      await expect(page.locator('.msla-panel-card-header input[id="Recurrence-title"]')).toBeVisible();
      await page.locator('[id="msla-node-Recurrence"]').focus();
      await expectSelectedAndFocused(page, 'Recurrence');

      await page.keyboard.press(`${modifier}+ArrowUp`);
      await expectSelectedAndFocused(page, 'Recurrence');
      await page.keyboard.press(`${modifier}+ArrowDown`);
      await expectSelectedAndFocused(page, 'Switch');

      await expect.poll(async () => (await renderedOperationOrder(page)).length).toBe(allScopeActionIds.length);
      const ordered = await renderedOperationOrder(page);
      expect(ordered.map(({ id }) => id).sort()).toEqual([...allScopeActionIds].sort());
      expect(ordered.slice(0, 2).map(({ id }) => id)).toEqual(['Recurrence', 'Switch']);

      for (const { id } of ordered.slice(2)) {
        await page.keyboard.press(`${modifier}+ArrowDown`);
        await expectSelectedAndFocused(page, id);
      }
      const lastId = ordered[ordered.length - 1].id;
      await page.keyboard.press(`${modifier}+ArrowDown`);
      await page.keyboard.press(`${modifier}+ArrowDown`);
      await expectSelectedAndFocused(page, lastId);

      for (const { id } of ordered.slice(0, -1).reverse()) {
        await page.keyboard.press(`${modifier}+ArrowUp`);
        await expectSelectedAndFocused(page, id);
      }
      await page.keyboard.press(`${modifier}+ArrowUp`);
      await expectSelectedAndFocused(page, 'Recurrence');

      const interval = page.getByPlaceholder('Specify the interval.');
      await interval.fill('7');
      await interval.press(`${modifier}+ArrowDown`);
      await interval.press(`${modifier}+ArrowUp`);
      await expect(interval).toBeFocused();
      await expect(page.locator('.msla-panel-card-header input[id="Recurrence-title"]')).toBeVisible();
      assertHealthyPreview();
    });
  }

  test(`${path} next selection mounts and focuses an offscreen scope without fit-to-view`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1440, height: 550 });
    const assertHealthyPreview = await observePreview(page, baseURL!);
    await page.goto(path);
    await selectAllScopeWorkflow(page);
    const first = page.locator('[id="msla-node-Recurrence"]');
    await first.click();

    const pane = await page.locator('.react-flow__pane').boundingBox();
    const firstBounds = await first.boundingBox();
    expect(pane).not.toBeNull();
    expect(firstBounds).not.toBeNull();
    if (!pane || !firstBounds) {
      throw new Error('Cannot pan the production canvas: the pane or trigger has no bounding box.');
    }
    // Pan with real pointer input so the immediate next card is virtualized out.
    const deltaY = pane.y + pane.height - 12 - (firstBounds.y + firstBounds.height);
    await page.mouse.move(pane.x + 20, pane.y + 30);
    await page.mouse.down();
    await page.mouse.move(pane.x + 20, pane.y + 30 + deltaY, { steps: 8 });
    await page.mouse.up();
    await expect(first).toBeInViewport();
    await expect(page.locator('[id="msla-node-Switch"]'), 'The next scope must be absent before keyboard navigation').toHaveCount(0);
    await first.click();
    await first.focus();
    await expectSelectedAndFocused(page, 'Recurrence');

    await page.keyboard.press('Control+ArrowDown');
    await expectSelectedAndFocused(page, 'Switch');
    await expect(page.locator('[id="msla-node-Switch"]')).toBeInViewport();
    await page.keyboard.press('Control+ArrowUp');
    await expectSelectedAndFocused(page, 'Recurrence');
    assertHealthyPreview();
  });
}
