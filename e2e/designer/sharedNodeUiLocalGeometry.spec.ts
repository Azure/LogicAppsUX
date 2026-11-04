import { expect, test } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test.describe(`Local graph commands, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('collapses and expands all real nested graphs without changing definitions', async ({ page }) => {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await expect(page.locator('#msla-node-Condition')).toHaveCount(1);
      await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Expand all', exact: true })).toBeVisible();
      await expect(page.locator('#msla-node-Condition')).toHaveCount(0);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await page.getByRole('button', { name: 'Expand all', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Collapse all', exact: true })).toBeVisible();
      await expect(page.locator('#msla-node-Condition')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('commits an actual full-enclosure marquee selection of the two parallel actions', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const cards = await Promise.all(
        ['Compose', 'Execute_a_navigation_plan'].map((id) => page.locator(`[id="msla-node-${id}"]`).boundingBox())
      );
      if (!cards[0] || !cards[1]) {
        throw new Error('Both actual parallel operation surfaces must be mounted for full-enclosure selection.');
      }
      const left = Math.min(cards[0].x, cards[1].x) - 8;
      const top = Math.min(cards[0].y, cards[1].y) - 8;
      const right = Math.max(cards[0].x + cards[0].width, cards[1].x + cards[1].width) + 8;
      const bottom = Math.max(cards[0].y + cards[0].height, cards[1].y + cards[1].height) + 8;
      await page.keyboard.down('Shift');
      await page.mouse.move(left, top);
      await page.mouse.down();
      await page.mouse.move(right, bottom, { steps: 12 });
      await page.mouse.up();
      await page.keyboard.up('Shift');
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState()
              .panel.operationContent.selectedNodeIds.slice()
              .sort()
          )
        )
        .toEqual(['Compose', 'Execute_a_navigation_plan']);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('uses host keyboard navigation and native panel focus for the actual adjacent operations', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const initial = page.locator('#msla-node-Init_all');
      await initial.press('Enter');
      await page.getByTestId('msla-panel-header-close-nav').click();
      await initial.focus();
      await page.keyboard.press('ControlOrMeta+ArrowUp');
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent
                .selectedNodeId
          )
        )
        .toBe('Http');
      await expect(page.getByTestId('msla-panel-header-close-nav')).toBeFocused();
      await page.keyboard.press('ControlOrMeta+ArrowDown');
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent
                .selectedNodeId
          )
        )
        .toBe('Init_all');
      await expect(page.locator('#msla-node-Init_all')).toBeFocused();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });
  });
}

test(
  'preserves the actual handoff spline midpoint and removes the handoff through its real menu',
  {
    tag: ['@mock', '@shared-node-ui'],
  },
  async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Basic A2A');
    const before = await getSerializedWorkflowFromStateV2(page);
    const path = page.locator('.react-flow__edge-HANDOFF_EDGE path[data-line="dashedNeutral"]');
    await expect(path).toHaveCount(1);
    const edit = page.getByRole('button', { name: 'Edit handoff', exact: true });
    await expect(edit).toHaveCount(1);
    await waitForViewport(page);
    await expect
      .poll(() =>
        edit.evaluate((button) => {
          const path = document.querySelector<SVGPathElement>('.react-flow__edge-HANDOFF_EDGE path[data-line="dashedNeutral"]');
          if (!path || path.getTotalLength() <= 0 || !path.getScreenCTM()) {
            return Number.POSITIVE_INFINITY;
          }
          const point = path.getPointAtLength(path.getTotalLength() / 2).matrixTransform(path.getScreenCTM()!);
          const rect = button.getBoundingClientRect();
          return Math.max(Math.abs(point.x - rect.x - rect.width / 2), Math.abs(point.y - rect.y - rect.height / 2));
        })
      )
      .toBeLessThan(0.5);
    await edit.focus();
    await edit.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Edit handoff', exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: 'Delete handoff', exact: true }).click();
    await expect(path).toHaveCount(0);
    const after = await getSerializedWorkflowFromStateV2(page);
    expect(after.definition.actions.Another_Agent).toEqual(before.definition.actions.Another_Agent);
    const tools = { ...before.definition.actions.WorkflowAgent.tools };
    delete tools.handoff_from_WorkflowAgent_to_Another_Agent_tool;
    expect(after.definition.actions.WorkflowAgent.tools).toEqual(tools);
    await page.screenshot({ path: testInfo.outputPath('handoff-removed.png'), animations: 'disabled' });
  }
);
