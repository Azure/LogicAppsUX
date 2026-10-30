import { expect, test } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow as openWorkflow } from './utils/sharedNodeUi';

test.describe('Shared node UI host integration', { tag: ['@mock', '@shared-node-ui'] }, () => {
  for (const flag of ['true', 'false', 'omitted'] as const) {
    test(`selects compatible presentation and geometry with flag ${flag}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openWorkflow(page, 'General Run After', flag);
      const compose = page.locator('#msla-node-Compose');
      await expect(compose).toBeVisible();
      await expect(page.locator('.react-flow__node')).toHaveCount(7);
      if (flag === 'true') {
        await expect(compose).toHaveAttribute('data-node-card', 'action');
        await expect(compose).toHaveCSS('width', '232px');
        await expect(compose).toContainText('Built-in · Compose');
        await expect(compose.locator('img')).toHaveCount(0);
        await expect(page.locator('[data-node-card="trigger"]')).toHaveCount(1);
      } else {
        await expect(page.locator('[data-node-card]')).toHaveCount(0);
        await expect(page.locator('[data-designer-ui-v2]')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
    });
  }

  test('uses rich hover and keyboard activation without portalled selection or duplicate categories', async ({ page }) => {
    await openWorkflow(page, 'General Run After');
    const compose = page.locator('#msla-node-Compose');
    await compose.hover();
    const info = page
      .locator('[data-node-info-card="action"]')
      .filter({ has: page.getByRole('heading', { name: 'Compose', exact: true }) });
    await expect(info).toBeVisible();
    await expect(info).toContainText('Action · Compose');
    await expect(info).not.toContainText('Action · Built-in');
    await info.getByRole('heading', { name: 'Compose', exact: true }).dblclick();
    await expect(compose).not.toHaveAttribute('data-selected', 'true');
    await info.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(info).not.toBeVisible();
    await compose.focus();
    await expect(info).toBeVisible();
    await compose.press('Escape');
    await expect(info).not.toBeVisible();
    await compose.press('Enter');
    await expect(compose).toHaveAttribute('data-selected', 'true');
    await compose.hover();
    await expect(info).not.toBeVisible();
  });

  test('renders every control-flow family, nested frame, merge role and real connection port', async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openWorkflow(page, 'All Scope Nodes');
    for (const role of ['trigger', 'action', 'if', 'switch', 'foreach', 'loop-frame', 'scope', 'merge']) {
      expect(await page.locator(`[data-node-card="${role}"]`).count(), role).toBeGreaterThan(0);
    }
    expect(await page.locator('.react-flow__handle.source').count()).toBeGreaterThan(0);
    expect(await page.locator('.react-flow__handle.target').count()).toBeGreaterThan(0);
    expect(
      await page.locator('.react-flow__handle').evaluateAll((handles) =>
        handles.every((handle) => {
          const bounds = handle.getBoundingClientRect();
          return Number.isFinite(bounds.x) && Number.isFinite(bounds.y) && bounds.width > 0 && bounds.height > 0;
        })
      )
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('control-flow.png'), animations: 'disabled' });
  });

  test('reveals actual edge insertion on keyboard focus and preserves sequential and parallel commands', async ({ page }) => {
    await openWorkflow(page, 'Scope');
    const insert = page.getByRole('button', {
      name: 'Insert a new step between manual and Initialize variable',
      exact: true,
    });
    await insert.focus();
    await expect(insert).toBeFocused();
    await expect(insert).toHaveCSS('opacity', '1');
    await insert.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Add an action', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add a parallel branch', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const terminal = page.getByRole('button', { name: 'Insert a new step after Response', exact: true });
    await terminal.click();
    await expect(page.getByRole('menuitem', { name: 'Add an action', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Add a parallel branch', exact: true })).not.toBeVisible();
  });

  test('preserves nested-scope identity and serialization through collapse and expand', async ({ page }) => {
    await openWorkflow(page, 'Scope');
    const before = await getSerializedWorkflowFromStateV2(page);
    const scope = page.locator('.react-flow__node[data-id="Scope_nested-#scope"] [data-node-card]');
    await scope.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Collapse action', exact: true }).click();
    await expect(page.locator('[data-automation-id="msla-collapsed-card-scope_nested"]')).toBeVisible();
    const collapsed = await getSerializedWorkflowFromStateV2(page);
    expect(collapsed.definition.actions).toEqual(before.definition.actions);
    await page.locator('[data-automation-id="msla-collapsed-card-scope_nested"]').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Expand action', exact: true }).click();
    await expect(scope).toBeVisible();
    const expanded = await getSerializedWorkflowFromStateV2(page);
    expect(expanded.definition.actions).toEqual(before.definition.actions);
  });

  test('keeps real note editing, palette, position and deletion controls under the same flag', async ({ page }) => {
    await openWorkflow(page, 'Notes In Metadata');
    const note = page.locator('[data-testid="rf__node-validNote"]');
    await expect(note).toBeVisible();
    await note.locator('.note-drag-handle').hover();
    const buttons = note.getByRole('button');
    await expect(buttons).toHaveCount(2);
    await buttons.first().click();
    const swatches = page.locator('.fui-SwatchPicker').getByRole('radio');
    await expect(swatches).toHaveCount(6);
    await swatches.nth(1).click();
    await expect(note.locator('.note-drag-handle').locator('..')).toHaveCSS('background-color', 'rgb(204, 229, 255)');
    await page.keyboard.press('Escape');
    await buttons.last().focus();
    await buttons.last().press('Enter');
    await expect(note).toHaveCount(0);
  });
});
