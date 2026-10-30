import { expect, test } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test(
    `collapses an actual Switch case independently with its pointer control, flag ${flag}`,
    {
      tag: ['@mock', '@shared-node-ui'],
    },
    async ({ page }) => {
      await openSharedWorkflow(page, 'Switch', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const branch = await page.evaluate(() => {
        const metadata = (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow
          .nodesMetadata;
        return metadata['Action-1-Compose'].graphId;
      });
      const collapse = page.locator(`button[id="${branch}"]`);
      await collapse.click();
      await expect(page.locator('[id="msla-node-Action-1-Compose"]')).toHaveCount(0);
      await expect(page.locator('[id="msla-node-Default-Compose"]')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await collapse.click();
      await expect(page.locator('[id="msla-node-Action-1-Compose"]')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    }
  );

  test(
    `inserts through the actual If lane and preserves independent collapse, flag ${flag}`,
    {
      tag: ['@mock', '@shared-node-ui'],
    },
    async ({ page }) => {
      await openSharedWorkflow(page, 'Conditionals', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const branches = await page.evaluate(() =>
        Object.entries(
          (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow.nodesMetadata
        )
          .filter(([, value]) => value.graphId === 'Condition' && value.subgraphType === 'CONDITIONAL_TRUE')
          .map(([id]) => id)
      );
      expect(branches).toHaveLength(1);
      const branch = branches[0];
      const collapse = page.locator(`button[id="${branch}"]`);
      await expect(collapse).toHaveCount(1);
      await collapse.press('Enter');
      if (flag === 'true') {
        await expect(collapse).toHaveAttribute('aria-expanded', 'false');
      }
      await expect(page.locator('#msla-node-Terminate')).toHaveCount(0);
      await expect(page.locator('#msla-node-Terminate_2')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await collapse.press('Enter');
      await expect(page.locator('#msla-node-Terminate')).toHaveCount(1);
      const insert = page.getByRole('button', { name: /^Insert a new step between .* and Terminate$/ });
      await insert.press('Enter');
      await page.getByRole('menuitem', { name: 'Add an action', exact: true }).click();
      await page.getByRole('searchbox', { name: 'Search for an action', exact: true }).fill('scope');
      await page.getByLabel('Scope', { exact: true }).click();
      await expect
        .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions.Condition.actions).length)
        .toBe(Object.keys(before.definition.actions.Condition.actions).length + 1);
      const after = await getSerializedWorkflowFromStateV2(page);
      const created = Object.keys(after.definition.actions.Condition.actions).find(
        (id) => !before.definition.actions.Condition.actions[id]
      );
      if (!created) {
        throw new Error('The actual True-lane insertion must create one real action.');
      }
      expect(after.definition.actions.Condition.actions[created]).toEqual({ type: 'Scope', actions: {} });
      expect(after.definition.actions.Condition.actions.Terminate.runAfter).toEqual({ [created]: ['SUCCEEDED'] });
      expect(after.definition.actions.Condition.else).toEqual(before.definition.actions.Condition.else);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    }
  );
}

test(
  'records native accessibility exposure and keyboard behavior of nested collapse controls in both modes',
  {
    tag: ['@mock', '@shared-node-ui'],
  },
  async ({ page }, testInfo) => {
    const audits = [];
    for (const flag of ['false', 'true'] as const) {
      await openSharedWorkflow(page, 'Agent with MCP Tools', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const selector = 'button[id="Regular_Tool"]';
      const collapse = page.locator(selector);
      await expect(collapse).toHaveCount(1);
      const client = await page.context().newCDPSession(page);
      const { root } = await client.send('DOM.getDocument');
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      expect(nodeId).not.toBe(0);
      const { node } = await client.send('DOM.describeNode', { nodeId });
      const { nodes } = await client.send('Accessibility.getPartialAXTree', { backendNodeId: node.backendNodeId });
      const actual = nodes.find((entry) => entry.backendDOMNodeId === node.backendNodeId);
      expect(actual?.ignored).toBe(false);
      expect(actual?.role?.value).toBe('button');
      if (flag === 'true') {
        expect(actual?.name?.value).toBe('Collapse');
      }
      audits.push({
        flag,
        actual,
        nestedInteractiveAncestors: await collapse.evaluate((button) => {
          const ancestors = [];
          for (let ancestor = button.parentElement; ancestor; ancestor = ancestor.parentElement) {
            if (ancestor.matches('button, [role="button"], a[href], input, select, textarea')) {
              ancestors.push({ id: ancestor.id, role: ancestor.getAttribute('role'), tag: ancestor.tagName });
            }
          }
          return ancestors;
        }),
      });
      await client.detach();
      await collapse.focus();
      await expect(collapse).toBeFocused();
      await collapse.press('Enter');
      if (flag === 'true') {
        await expect(collapse).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
      } else {
        await testInfo.attach('legacy-nested-keyboard-result', {
          body: JSON.stringify({
            evidence: 'Observed legacy nested-button Enter, not waived as keyboard acceptance',
            childCount: await page.locator('#msla-node-Compose').count(),
            selectedNode: await page.evaluate(
              () =>
                (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent
                  .selectedNodeId
            ),
          }),
          contentType: 'application/json',
        });
        const close = page.getByTestId('msla-panel-header-close-nav');
        if (await close.isVisible()) {
          await close.click();
        }
        await collapse.click();
        await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
      }
      await collapse.click();
      if (flag === 'true') {
        await expect(collapse).toHaveAttribute('aria-expanded', 'true');
      }
      await expect(page.locator('#msla-node-Compose')).toHaveCount(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    }
    await testInfo.attach('native-nested-collapse-ax', {
      body: JSON.stringify({ limit: 'Native child exposure/focus only; structural nested-interactive findings are not waived', audits }),
      contentType: 'application/json',
    });
  }
);
