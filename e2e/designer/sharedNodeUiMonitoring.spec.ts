import { expect, test } from '@playwright/test';
import agentRun from '../../__mocks__/runs/Agent/sucessState.json' with { type: 'json' };
import { nodeHoverCardTiming } from '../../libs/designer-ui-v2/src/nodes/metrics';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test(
    `retains actual Agent iteration paging and monitoring restrictions with flag ${flag}`,
    { tag: ['@mock', '@shared-node-ui'] },
    async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Simple Agent', flag);
      const agent = page.locator('#msla-node-WorkflowAgent');
      const agentTitle = agent.getByText('WorkflowAgent', { exact: true });
      if (flag === 'true') {
        await agentTitle.hover();
        const info = page.locator('[data-node-info-card]');
        await expect(info).toBeVisible();
        await info.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(info).toBeHidden();
      }
      await LoadRunFile(page, 'sucessState');
      const pager = page.getByTestId('msla-pager-v2-workflowagent');
      await expect(pager).toBeVisible();
      const readIndex = () =>
        page.evaluate(
          () =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow.nodesMetadata
              .WorkflowAgent.runIndex ?? 0
        );
      const original = await readIndex();
      const before = await getSerializedWorkflowFromStateV2(page);
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      expect(original).toBe(agentRun.properties.actions.WorkflowAgent.iterationCount - 1);
      await pager.getByLabel('Previous', { exact: true }).click();
      await expect.poll(readIndex).toBe(original - 1);
      await pager.getByLabel('Next', { exact: true }).click();
      await expect.poll(readIndex).toBe(original);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      if (flag === 'true') {
        await agentTitle.hover();
        await page.waitForTimeout(nodeHoverCardTiming.openDelay + 100);
        await expect(page.locator('[data-node-info-card]')).toHaveCount(0);
      }
      await page.screenshot({ path: testInfo.outputPath('agent-monitoring-pager.png'), animations: 'disabled' });
    }
  );
}
