import { expect, test, type Locator, type Page } from '@playwright/test';
import switchFixture from '../../__mocks__/workflows/Switch.json' with { type: 'json' };
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

async function expectCanvasSize(page: Page, target: Locator, width: number, height: number) {
  await expect(target).toBeVisible();
  const bounds = await target.boundingBox();
  const scale = await page.locator('.react-flow__viewport').evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.hypot(matrix.a, matrix.b);
  });
  if (!bounds || scale <= 0) {
    throw new Error('The accepted canvas target must have finite visible bounds and a positive zoom scale.');
  }
  // Fit view scales SVG slots and HTML controls alike; compare their unscaled canvas geometry.
  expect(Math.abs(bounds.width / scale - width)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.height / scale - height)).toBeLessThanOrEqual(1);
}

test.describe('Standard shared presentation contract', { tag: ['@mock', '@shared-node-ui'] }, () => {
  test('flag-on If keeps distinct true/false exits', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Conditionals');
    const before = await getSerializedWorkflowFromStateV2(page);
    const card = page.locator('#msla-node-Condition');
    await expect(card).toHaveAttribute('data-node-card', 'if');
    await expect(card.locator('[data-branch="true"]')).toHaveCount(1);
    await expect(card.locator('[data-branch="false"]')).toHaveCount(1);
    await expect(card.locator('.react-flow__handle.source')).toHaveCount(2);
    await expect(card.locator('[data-mode="trunk"]')).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('standard-if-authoring', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  });

  test('flag-on Switch defaults to multiOutput', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Switch');
    const before = await getSerializedWorkflowFromStateV2(page);
    const card = page.locator('#msla-node-Switch');
    await expect(card).toHaveAttribute('data-node-card', 'switch');
    const outputs = card.locator('[data-testid="node-output-handles"]');
    await expect(outputs).toHaveCount(1);
    const switchDefinition = switchFixture.definition.actions.Switch;
    const expectedBranchCount = Object.keys(switchDefinition.cases).length + Number('default' in switchDefinition);
    await expect(outputs.locator('[data-handle="neutral"]')).toHaveCount(expectedBranchCount);
    await expect(card.locator('.react-flow__handle.source')).toHaveCount(expectedBranchCount);
    // The default output group deliberately has no data-mode attribute; only trunk is marked.
    await expect(card.locator('[data-mode="trunk"]')).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('standard-switch-authoring', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  });

  test('flag-on Agent retains below tools and real tool identities', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Agent with MCP Tools');
    const before = await getSerializedWorkflowFromStateV2(page);
    const agent = page.locator('#msla-node-WorkflowAgent');
    const panel = agent.locator('[data-testid="agent-tools-panel"]');
    await expect(agent).toHaveAttribute('data-node-card', 'agent');
    await expect(panel).toBeVisible();
    // Below preserves the old DOM contract: verify no side marker and the actual panel position.
    await expect(agent.locator('[data-testid="agent-tools-side"]')).toHaveCount(0);
    await expect(page.locator('[data-tools-placement="side"]')).toHaveCount(0);
    const titleBounds = await agent.getByText('WorkflowAgent', { exact: true }).boundingBox();
    const panelBounds = await panel.boundingBox();
    if (!titleBounds || !panelBounds) {
      throw new Error('The real Agent title and tools panel must be visible before checking below placement.');
    }
    expect(panelBounds.y).toBeGreaterThan(titleBounds.y + titleBounds.height);
    await expect(page.locator('#msla-node-Regular_Tool')).toBeVisible();
    await expect(page.locator('#msla-node-BuiltIn_MCP_Server')).toHaveAttribute('data-tool-kind', 'mcp');
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('standard-agent-below', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  });

  test('flag-on uses the shared run-after slot and terminal target without definition changes', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'General Run After');
    const before = await getSerializedWorkflowFromStateV2(page);
    const slot = page.locator('foreignObject[id="msla-run-after-traffic-light"]').first();
    await expect(slot.locator('[data-run-after]')).toHaveCount(1);
    await expectCanvasSize(page, slot, 44, 16);
    const terminal = page.locator('[data-edge-control="terminal"]').first();
    await expectCanvasSize(page, terminal.getByRole('button'), 32, 32);
    const stem = terminal.locator('svg[data-line]');
    const horizontal = (await stem.getAttribute('width')) === '8';
    await expectCanvasSize(page, stem, horizontal ? 8 : 20, horizontal ? 20 : 8);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('standard-shared-geometry', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  });

  for (const flag of ['omitted', 'false', '1', 'True', 'TRUE'] as const) {
    test(`flag ${flag} preserves legacy surfaces and run-after geometry`, async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await expect(page.locator('[data-node-card], [data-edge-control], [data-edge-hit-target], [data-run-after]')).toHaveCount(0);
      await expect(page.locator('#msla-node-Compose')).toBeVisible();
      await expect(page.getByTestId('card-compose')).toBeVisible();
      await expectCanvasSize(page, page.locator('foreignObject[id="msla-run-after-traffic-light"]').first(), 36, 12);
      await expect(page.getByRole('button', { name: /Insert a new step/ }).first()).toBeVisible();
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      await testInfo.attach(`standard-legacy-${flag}`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    });
  }

  test('the opt-in does not change the initial serialized definition', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After', 'omitted');
    const legacy = await getSerializedWorkflowFromStateV2(page);
    await openSharedWorkflow(page, 'General Run After', 'true');
    await expect(page.locator('[data-node-card]').first()).toBeVisible();
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(legacy.definition);
  });
});
