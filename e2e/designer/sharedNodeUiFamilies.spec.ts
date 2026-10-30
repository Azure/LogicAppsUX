import { expect, test } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, setContextSetting, waitForViewport } from './utils/sharedNodeUi';

test.describe('Shared node UI additional Local family acceptance', { tag: ['@mock', '@shared-node-ui'] }, () => {
  for (const isDark of [false, true]) {
    test(`retains actual Agent tools and selected-footer hover in ${isDark ? 'dark' : 'light'} mode`, async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Agent with MCP Tools');
      if (isDark) {
        await setContextSetting(page, 'Dark Mode', true);
      }
      const before = await getSerializedWorkflowFromStateV2(page);
      const definition = before.definition.actions.WorkflowAgent;
      const toolIds = Object.keys(definition.tools).map((id) => `msla-node-${id}`);
      const panel = page.locator('[data-testid="agent-tools-panel"]');
      await expect(panel).toHaveCount(1);
      await expect(panel).toHaveAccessibleName(`Tools (${toolIds.length})`);
      const ownership = await panel.getAttribute('aria-owns');
      const panelBounds = await panel.boundingBox();
      if (!ownership || !panelBounds) {
        throw new Error('The actual expanded Agent panel must own its mounted tool nodes and have visible bounds.');
      }
      expect(ownership.split(' ').sort()).toEqual([...toolIds].sort());
      for (const id of toolIds) {
        const tool = page.locator(`[id="${id}"]`);
        await expect(tool).toHaveCount(1);
        const bounds = await tool.boundingBox();
        if (!bounds) {
          throw new Error(`The actual owned tool ${id} must have visible bounds.`);
        }
        expect(bounds.x).toBeGreaterThanOrEqual(panelBounds.x);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(panelBounds.x + panelBounds.width);
        expect(bounds.y).toBeGreaterThanOrEqual(panelBounds.y);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(panelBounds.y + panelBounds.height);
      }
      await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-node-card', 'action');
      await expect(page.locator('[data-node-card="tool"]')).toHaveCount(toolIds.length);
      await page.screenshot({ path: testInfo.outputPath('agent-expanded.png'), animations: 'disabled' });

      const agent = page.locator('#msla-node-WorkflowAgent');
      await agent.press('Enter');
      await expect(agent).toHaveAttribute('data-selected', 'true');
      const footer = agent.getByText(definition.inputs.parameters.deploymentId, { exact: true });
      const pressedToken = await agent.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--colorNeutralBackground3Pressed').trim()
      );
      expect(pressedToken).not.toBe('');
      await expect
        .poll(() =>
          footer.evaluate((element) => getComputedStyle(element).getPropertyValue('--designer-ui-v2-node-card-footer-background').trim())
        )
        .toBe(pressedToken);
      const selectedBackground = await footer.evaluate((element) => getComputedStyle(element).backgroundColor);
      await footer.hover();
      await expect(footer).toHaveCSS('background-color', selectedBackground);
      await expect(agent).toHaveAttribute('data-selected', 'true');
      await page.screenshot({ path: testInfo.outputPath('agent-selected-hover.png'), animations: 'disabled' });

      const collapse = page.locator('button[id="WorkflowAgent-collapse-toggle"]');
      await expect(collapse).toHaveAttribute('aria-expanded', 'true');
      await collapse.press('Enter');
      await expect(collapse).toHaveAttribute('aria-expanded', 'false');
      await expect(panel).not.toHaveAttribute('aria-owns');
      await expect(panel).toHaveAccessibleName(`Tools (${toolIds.length})`);
      await expect(page.locator('[data-node-card="tool"]')).toHaveCount(0);
      await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await page.screenshot({ path: testInfo.outputPath('agent-collapsed.png'), animations: 'disabled' });

      await collapse.press('Enter');
      await expect(collapse).toHaveAttribute('aria-expanded', 'true');
      await expect(panel).toHaveAttribute('aria-owns', ownership);
      await expect(page.locator('[data-node-card="tool"]')).toHaveCount(toolIds.length);
      await expect(page.locator('#msla-node-Compose')).toHaveAttribute('data-node-card', 'action');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });
  }

  test('opens the actual empty-trigger picker by keyboard and respects read-only', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Empty/New');
    const placeholder = page.locator('[data-node-card="placeholder-trigger"]');
    await expect(placeholder).toBeVisible();
    const before = await getSerializedWorkflowFromStateV2(page);
    await placeholder.press('Enter');
    await expect(page.getByRole('heading', { name: /Add a trigger/i })).toBeVisible();
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await page.screenshot({ path: testInfo.outputPath('empty-trigger-discovery.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await setContextSetting(page, 'Read Only', true);
    await expect(placeholder).toHaveAttribute('aria-disabled', 'true');
    await placeholder.press('Enter');
    await expect(page.getByRole('heading', { name: /Add a trigger/i })).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
  });

  test('adds, edits and deletes a real Switch case without changing existing branches', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Switch');
    const before = await getSerializedWorkflowFromStateV2(page);
    const switchCard = page.locator('#msla-node-Switch');
    const initialPorts = await switchCard.locator('.react-flow__handle.source').count();
    await page.getByRole('button', { name: 'Add case', exact: true }).press('Enter');
    await expect
      .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions.Switch.cases).length)
      .toBe(Object.keys(before.definition.actions.Switch.cases).length + 1);
    const added = await getSerializedWorkflowFromStateV2(page);
    const newCaseId = Object.keys(added.definition.actions.Switch.cases).find((id) => !before.definition.actions.Switch.cases[id]);
    if (!newCaseId) {
      throw new Error('The real Add case command must create a new case identity.');
    }
    await expect(switchCard.locator('.react-flow__handle.source')).toHaveCount(initialPorts + 1);
    const caseCard = page.locator(`[id="msla-node-${newCaseId}"]`);
    await caseCard.press('Enter');
    const editor = page.locator('.editor-input[contenteditable="true"]').first();
    await editor.fill('adoption-case');
    await editor.press('Tab');
    await expect
      .poll(async () => (await getSerializedWorkflowFromStateV2(page)).definition.actions.Switch.cases[newCaseId].case)
      .toBe('adoption-case');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
    await waitForViewport(page);
    await page.screenshot({ path: testInfo.outputPath('switch-added-case.png'), animations: 'disabled', timeout: 60_000 });
    await caseCard.click({ button: 'right' });
    await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(caseCard).toHaveCount(0);
    await expect(switchCard.locator('.react-flow__handle.source')).toHaveCount(initialPorts);
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
  });

  test('preserves matched mounted graph identities without adding DOM ID collisions', async ({ page }, testInfo) => {
    let legacyGraphIds: (string | null)[] | undefined;
    for (const flag of ['false', 'true'] as const) {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.keyboard.press('Tab');
      for (const id of [
        'ForEach_empty',
        'ForEach_empty-#scope',
        'Scope_empty',
        'Scope_empty-#scope',
        'Until-#subgraph',
        'Until-#footer',
        'Until_Nested-#subgraph',
        'Until_Nested-#footer',
      ]) {
        await expect(page.locator(`.react-flow__node[data-id="${id}"]`)).toHaveCount(1);
      }
      const identities = await page.evaluate(() => {
        const counts = new Map<string, number>();
        for (const element of document.querySelectorAll('.react-flow [id]')) {
          counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
        }
        return {
          graphIds: [...document.querySelectorAll('.react-flow__node')].map((node) => node.getAttribute('data-id')).sort(),
          duplicateIds: [...counts]
            .filter(([, count]) => count > 1)
            .map(([id]) => id)
            .sort(),
        };
      });
      expect(identities.duplicateIds).toEqual(['msla-edge-button-foreach_empty-undefined', 'msla-edge-button-scope_empty-undefined']);
      if (flag === 'false') {
        legacyGraphIds = identities.graphIds;
      } else {
        expect(identities.graphIds).toEqual(legacyGraphIds);
      }
      for (const id of ['Until', 'Until_Nested']) {
        await expect(page.locator(`[id="msla-node-${id}"]`)).toHaveCount(1);
        await expect(page.locator(`button[id="${id}-collapse-toggle"]`)).toHaveCount(1);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await page.screenshot({ path: testInfo.outputPath(`dom-identity-${flag}.png`), animations: 'disabled' });
    }
  });

  for (const [fixture, id] of [
    ['General Run After', 'Http'],
    ['All Scope Nodes', 'Condition'],
    ['All Scope Nodes', 'Switch'],
    ['All Scope Nodes', 'ForEach'],
    ['All Scope Nodes', 'Until'],
    ['Scope', 'Scope'],
    ['Agent with MCP Tools', 'WorkflowAgent'],
    ['Agent with MCP Tools', 'Regular_Tool'],
  ]) {
    test(`shows the real ${id} family hover without activating its editor`, async ({ page }, testInfo) => {
      await openSharedWorkflow(page, fixture);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator(`[id="msla-node-${id}"]`);
      const label = await card.getAttribute('aria-label');
      if (!label) {
        throw new Error('The actual family card must have an accessible display name.');
      }
      const title = label.replace(/^(?:MCP tool|Tool): /, '').replace(/\s+operation(?:,.*)?$/, '');
      await card.hover();
      const info = page.locator('[data-node-info-card]').filter({
        has: page.getByRole('heading', { name: title, exact: true }),
      });
      await expect(info).toBeVisible();
      await expect(card).not.toHaveAttribute('data-selected', 'true');
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await info.screenshot({ path: testInfo.outputPath('family-hover.png'), animations: 'disabled' });
      await info.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(info).not.toBeVisible();
    });
  }
});
