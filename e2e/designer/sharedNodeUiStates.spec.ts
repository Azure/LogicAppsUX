import { expect, test } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow, setContextSetting, setSharedNodeUi } from './utils/sharedNodeUi';

test.describe('Shared node UI state and command journeys', { tag: ['@mock', '@shared-node-ui'] }, () => {
  test('keeps the actual parameter draft, editor focus and viewport through live flag changes', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    await page.locator('#msla-node-Compose').press('Enter');
    const editor = page.locator('.editor-input[contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    const draft = 'Shared adoption retained parameter draft';
    await editor.fill(draft);
    await expect(editor).toHaveText(draft);
    const originalEditor = await editor.elementHandle();
    const viewport = page.locator('.react-flow__viewport');
    const transform = await viewport.getAttribute('style');
    if (!originalEditor || !transform) {
      throw new Error('Expected the actual focused editor and laid-out viewport before changing presentation.');
    }
    const before = await getSerializedWorkflowFromStateV2(page);

    await setSharedNodeUi(page, false);
    await expect(page.locator('[data-node-card]')).toHaveCount(0);
    expect(await originalEditor.evaluate((element) => element.isConnected && document.activeElement === element)).toBe(true);
    await expect(editor).toHaveText(draft);
    await expect(viewport).toHaveAttribute('style', transform);
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);

    await setSharedNodeUi(page, true);
    await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-node-card', 'action');
    expect(await originalEditor.evaluate((element) => element.isConnected && document.activeElement === element)).toBe(true);
    await expect(editor).toHaveText(draft);
    await expect(viewport).toHaveAttribute('style', transform);
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    await editor.press('Tab');
    await expect.poll(async () => (await getSerializedWorkflowFromStateV2(page)).definition.actions.Compose.inputs).toBe(draft);
  });

  test('copies and pastes a real action with its identity, metadata and insertion semantics', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    const before = await getSerializedWorkflowFromStateV2(page);
    await page.locator('#msla-node-Compose').click({ button: 'right' });
    await page.getByTestId('msla-copy-menu-option').click();
    await expect(page.getByRole('tooltip', { name: 'Copied!', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-node-info-card]')).toHaveCount(0);
    const insert = page.getByRole('button', { name: 'Insert a new step between Init all and Compose', exact: true });
    await page.locator('[data-edge-control="insertion"]').filter({ has: insert }).hover();
    await expect(insert).toHaveCSS('opacity', '1');
    await insert.click();
    await page.getByTestId('msla-paste-button-init_all-compose').click();
    await expect(page.locator('#msla-node-Compose-copy')).toHaveAttribute('data-node-card', 'action');
    const after = await getSerializedWorkflowFromStateV2(page);
    expect(after.definition.actions['Compose-copy'].type).toBe(before.definition.actions.Compose.type);
    expect(after.definition.actions['Compose-copy'].inputs).toEqual(before.definition.actions.Compose.inputs);
    expect(after.definition.actions['Compose-copy'].runAfter).toEqual(before.definition.actions.Compose.runAfter);
    expect(after.definition.actions.Compose.runAfter).toEqual({ 'Compose-copy': ['SUCCEEDED'] });
  });

  test('deletes through the real confirmation and preserves undo and redo', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    const before = await getSerializedWorkflowFromStateV2(page);
    await page.locator('#msla-node-Compose').click({ button: 'right' });
    await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions.Compose).toBeUndefined();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-node-card', 'action');
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions.Compose).toBeUndefined();
  });

  test('retains the actual read-only restriction on insertion while allowing node inspection', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    await setContextSetting(page, 'Read Only', true);
    await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-node-card', 'action');
    await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
    const before = await getSerializedWorkflowFromStateV2(page);
    await page.locator('#msla-node-Compose').press('Enter');
    await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-selected', 'true');
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
  });

  test('shows real monitoring statuses and suppresses editing and rich hover', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Monitoring view conditional');
    await LoadRunFile(page, 'normalState');
    await expect(page.locator('[data-badge-status="succeeded"]').first()).toBeVisible();
    expect(await page.locator('[data-badge-status="skipped"]').count()).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
    const card = page.locator('[data-node-card="action"]').first();
    await card.hover();
    await expect(page.locator('[data-node-info-card]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('monitoring.png'), animations: 'disabled' });
  });

  for (const fixture of ['Agent with MCP Tools', 'Basic A2A']) {
    test(`preserves real model, tool and graph identities in ${fixture}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await openSharedWorkflow(page, fixture);
      await expect(page.locator('[data-node-card="agent"]').first()).toBeVisible();
      expect(await page.locator('[data-node-card="tool"]').count()).toBeGreaterThan(0);
      const ids = await page.locator('[id^="msla-node-"]').evaluateAll((nodes) => nodes.map((node) => node.id));
      expect(new Set(ids).size).toBe(ids.length);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('[data-node-card="tool"]').first().press('Enter');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('agent-tools.png'), animations: 'disabled' });
    });
  }

  test('keeps canonical MCP glyphs unbranded in the actual tool consumer', async ({ page }) => {
    await openSharedWorkflow(page, 'Agent with MCP Tools');
    const tools = page.locator('[data-node-card="tool"][data-tool-kind="mcp"]');
    await expect(tools).toHaveCount(2);
    await expect(tools.first()).toContainText('Type · MCP');
    await expect(tools.last()).toContainText('Type · MCP');
    await expect(tools.locator('[data-category="action"] img')).toHaveCount(0);
    expect(await tools.first().locator('[data-category="action"] svg').count()).toBeGreaterThan(0);
  });

  test('renders the complete control-flow canvas in dark and forced-color reduced-motion modes', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'All Scope Nodes');
    await setContextSetting(page, 'Dark Mode', true);
    await expect(page.locator('[data-designer-ui-v2="dark"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('control-flow-dark.png'), animations: 'disabled' });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    const card = page.locator('[data-node-card="action"]').first();
    await page.keyboard.press('Tab');
    await card.focus();
    await expect(card).toBeFocused();
    expect(await card.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    expect(
      await card.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
      })
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('control-flow-forced-colors.png'), animations: 'disabled' });
  });

  test('lays out the real fifty-node stress fixture with visible, finite card and port geometry', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, '50 Nodes');
    await expect(page.locator('[data-node-card="action"]')).toHaveCount(50);
    expect(
      await page.locator('[data-node-card], .react-flow__handle').evaluateAll((elements) =>
        elements.every((element) => {
          const bounds = element.getBoundingClientRect();
          return Number.isFinite(bounds.x) && Number.isFinite(bounds.y) && bounds.width > 0 && bounds.height > 0;
        })
      )
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('stress-50.png'), animations: 'disabled' });
  });
});
