import { expect, test, type Locator, type Page } from '@playwright/test';
import scopeRun from '../../__mocks__/runs/simpleScoped/simpleScoped.json' with { type: 'json' };
import { composeManifest } from '../../libs/logic-apps-shared/src/designer-client-services/lib/consumption/manifests/compose';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

// Fluent's data-icon-name is only provided by the unit-test mock; match the real Braces SVG paths.
const bracesPath = { regular: 'M6.5 3A2.5 2.5', filled: 'M3.5 5.75A2.75 2.75' };

async function expectComposeIcon(
  surface: Locator,
  shared: boolean,
  legacyArtwork: string | RegExp,
  variant: keyof typeof bracesPath = 'regular'
) {
  const tile = surface.locator('[data-node-glyph]');
  if (shared) {
    await expect(surface.locator(`[data-tone="violet"] [data-node-glyph] svg:has(path[d^="${bracesPath[variant]}"])`)).toBeVisible();
    await expect(tile.locator('img')).toHaveCount(0);
  } else {
    const artwork = surface.locator('img[src]');
    await expect(artwork).toBeVisible();
    await expect(artwork).toHaveAttribute('src', legacyArtwork);
    await expect(tile).toHaveCount(0);
  }
}

async function enableScopeRunRawControls(page: Page) {
  const action = scopeRun.properties.actions.Increment_variable_3;
  // The local run service supplies the recorded values, but the fixture omits URLs needed to expose the raw buttons.
  const actions = {
    ...scopeRun.properties.actions,
    Increment_variable_3: {
      ...action,
      inputsLink: { ...action.inputsLink, uri: '/mock/scope-run/inputs' },
      outputsLink: { ...action.outputsLink, uri: '/mock/scope-run/outputs' },
    },
  };
  const { id, type, properties } = scopeRun;
  await page.route(/\/__mocks__\/runs\/simpleScoped\/simpleScoped\.json(?:\?|$)/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const id = ${JSON.stringify(id)}; export const type = ${JSON.stringify(type)};
        export const properties = ${JSON.stringify({ ...properties, actions })};`,
    })
  );
}

async function resizeDetailsDrawer(page: Page, drawer: Locator, width: number) {
  await expect(drawer).toBeVisible();
  // The operation drawer has no named resize control; its direct col-resize child handles mouse drags.
  const { x, y, right } = await drawer.evaluate((element) => {
    const handle = Array.from(element.children).find((child) => getComputedStyle(child).cursor === 'col-resize');
    if (!handle) {
      throw new Error('Operation drawer is missing its resize handle');
    }
    const bounds = handle.getBoundingClientRect();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, right: element.getBoundingClientRect().right };
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(Math.round(right - width), y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Math.round((await drawer.boundingBox())?.width ?? 0)).toBe(width);
}

async function expectPayloadLayout(panel: Locator, layout: 'stacked' | 'side-by-side') {
  const headers = panel.getByRole('button', { name: /^(Inputs|Outputs)$/ });
  await expect(headers).toHaveText(['Inputs', 'Outputs']);
  for (const label of ['Show raw inputs', 'Show raw outputs']) {
    const button = panel.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }
  await expect
    .poll(async () => {
      // Measure the header rows, not their contents, so icon/text widths cannot change the layout assertion.
      const [inputs, outputs] = await Promise.all([headers.nth(0).locator('..').boundingBox(), headers.nth(1).locator('..').boundingBox()]);
      if (!inputs || !outputs) {
        return 'not laid out';
      }
      if (Math.abs(inputs.x - outputs.x) <= 2 && outputs.y >= inputs.y + inputs.height - 2) {
        return 'stacked';
      }
      return Math.abs(inputs.y - outputs.y) <= 2 && outputs.x >= inputs.x + inputs.width - 2 ? 'side-by-side' : 'misaligned';
    })
    .toBe(layout);
}

test.use({ viewport: { width: 1600, height: 1000 } });

for (const flag of ['true', 'false'] as const) {
  const shared = flag === 'true';
  test.describe(`Standard Otto parity, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('uses the Compose glyph or legacy artwork across the canvas, operation drawer, and picker', async ({ page }) => {
      // Keep the legacy Avatar from switching to its error glyph due to a remote image load.
      await page.route('**/icons/compose.svg', (route) =>
        route.fulfill({ contentType: 'image/svg+xml', path: 'libs/designer-v2/src/lib/common/images/builtinoperationicons/compose.svg' })
      );
      await openSharedWorkflow(page, 'General Run After', flag);
      const compose = page.locator('#msla-node-Compose');
      const manifestArtwork = composeManifest.properties.iconUri;
      await expectComposeIcon(compose, shared, manifestArtwork);
      await compose.click();
      await expectComposeIcon(compose, shared, manifestArtwork, 'filled');

      const drawer = page.locator('.msla-panel-container').filter({ has: page.locator('#msla-node-details-panel-Compose') });
      await expectComposeIcon(drawer.locator('.msla-panel-card-header'), shared, manifestArtwork);
      await drawer.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(drawer).toBeHidden();

      await page.getByRole('button', { name: 'Insert a new step between Init all and Compose', exact: true }).press('Enter');
      await page.getByRole('menuitem', { name: 'Add an action', exact: true }).click();
      await page.getByRole('searchbox', { name: 'Search for an action', exact: true }).fill('compose');
      const result = page.locator('.msla-result-list').getByRole('button', { name: 'Compose', exact: true });
      await expectComposeIcon(result, shared, /\/icons\/compose\.svg$/);
    });

    test('lays out recorded Inputs and Outputs by drawer width without losing DOM order or raw controls', async ({ page }) => {
      await enableScopeRunRawControls(page);
      await openSharedWorkflow(page, 'Scope', flag);
      await LoadRunFile(page, 'simpleScoped');

      const history = page.locator('.fui-InlineDrawer').filter({ has: page.getByRole('heading', { name: 'Run history', exact: true }) });
      if (await history.isVisible()) {
        await history.locator('.fui-DrawerHeaderNavigation button').click();
        await expect(history).toBeHidden();
      }
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      const increment = page.locator('#msla-node-Increment_variable_3');
      await expect(
        shared
          ? increment.locator('[data-node-subtitle-kind="status"]').getByText('Succeeded', { exact: true })
          : increment.getByAltText('Succeeded', { exact: true })
      ).toBeVisible();
      await increment.click();
      const panel = page.locator('#msla-node-details-panel-Increment_variable_3');
      const drawer = page.locator('.msla-panel-container').filter({ has: panel });
      await expect(drawer).toHaveCSS('width', '480px');
      await expect(panel.locator('[data-monitoring-payload-comparison] [data-monitoring-payload-grid]')).toHaveCount(shared ? 1 : 0);
      await expectPayloadLayout(panel, 'stacked');

      await resizeDetailsDrawer(page, drawer, 880);
      await expectPayloadLayout(panel, shared ? 'side-by-side' : 'stacked');
    });
  });
}
