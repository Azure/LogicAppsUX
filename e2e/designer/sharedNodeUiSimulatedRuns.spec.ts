import { expect, test, type Page } from '@playwright/test';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

type DesignerWindow = Window & { DesignerStoreV2: Pick<AppStore, 'dispatch' | 'getState'> };
const times = { startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T00:00:01Z' };

const enterSimulatedMonitoring = async (page: Page) => {
  await page.evaluate(() => {
    const store = (window as DesignerWindow).DesignerStoreV2;
    store.dispatch({
      type: 'designerOptions/initDesignerOptions',
      payload: { ...store.getState().designerOptions, isMonitoringView: true, readOnly: true },
    });
  });
  const history = page.getByRole('heading', { name: 'Run history', exact: true });
  await expect(history).toBeVisible();
  await page.locator('.fui-DrawerHeaderNavigation button').click();
  await expect(history).not.toBeVisible();
  await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
};

const runIndex = (page: Page, id: string, tool = false) =>
  page.evaluate(
    ({ id, tool }) => {
      const metadata = (window as DesignerWindow).DesignerStoreV2.getState().workflow.nodesMetadata[id];
      return (tool ? metadata.toolRunIndex : metadata.runIndex) ?? 0;
    },
    { id, tool }
  );

for (const flag of ['true', 'false'] as const) {
  test.describe(`Deterministic simulated run metadata, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('pages actual outer and nested Foreach renderers without an observed backend run', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'ForEach', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await enterSimulatedMonitoring(page);
      const metadata = {
        ...times,
        status: 'Succeeded',
        inputsLink: { uri: 'local-component-fixture', metadata: { foreachItemsCount: 3 } },
      };
      await page.evaluate((metadata) => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        for (const nodeId of ['Foreach', 'Foreach_nested']) {
          if (!store.getState().workflow.nodesMetadata[nodeId]) {
            throw new Error(`The admitted Foreach fixture is missing actual node ${nodeId}.`);
          }
          store.dispatch({ type: 'workflow/setRepetitionRunData', payload: { nodeId, runData: metadata } });
          store.dispatch({ type: 'workflow/setRunIndex', payload: { nodeId, page: 0 } });
        }
      }, metadata);
      await testInfo.attach('deterministic-foreach-metadata', {
        body: JSON.stringify({ evidence: 'Simulated component state, not an observed backend run', metadata }),
        contentType: 'application/json',
      });
      for (const id of ['Foreach', 'Foreach_nested']) {
        const pager = page.getByTestId(`msla-pager-v2-${id.toLowerCase()}`);
        await expect(pager).toBeVisible();
        await expect(pager.getByLabel('Previous', { exact: true })).toBeDisabled();
        await pager.getByLabel('Next', { exact: true }).click();
        await expect.poll(() => runIndex(page, id)).toBe(1);
        await pager.getByLabel('Next', { exact: true }).click();
        await expect.poll(() => runIndex(page, id)).toBe(2);
        await expect(pager.getByLabel('Next', { exact: true })).toBeDisabled();
        await pager.getByLabel('Previous', { exact: true }).click();
        await expect.poll(() => runIndex(page, id)).toBe(1);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      expect(await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.getState().workflow.runInstance)).toBeNull();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath('simulated-foreach-paging.png'), animations: 'disabled' });
    });

    test('pages the actual regular and MCP tool renderers using deterministic repetition metadata', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Agent with MCP Tools', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await enterSimulatedMonitoring(page);
      const metadata = {
        ...times,
        status: 'Succeeded',
        tools: {
          Regular_Tool: { status: 'Succeeded', iterations: 3 },
          BuiltIn_MCP_Server: { status: 'Succeeded', iterations: 3 },
        },
      };
      await page.evaluate((metadata) => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        for (const id of Object.keys(metadata.tools)) {
          if (!store.getState().workflow.nodesMetadata[id]) {
            throw new Error(`The admitted Agent fixture is missing actual tool ${id}.`);
          }
        }
        store.dispatch({
          type: 'workflow/updateAgenticMetadata',
          payload: { nodeId: 'WorkflowAgent', scopeRepetitionRunData: metadata },
        });
      }, metadata);
      await testInfo.attach('deterministic-tool-metadata', {
        body: JSON.stringify({ evidence: 'Simulated component state, not an observed backend run', metadata }),
        contentType: 'application/json',
      });
      for (const [id, tool] of [
        ['Regular_Tool', false],
        ['BuiltIn_MCP_Server', true],
      ] as const) {
        const pager = page.getByTestId(`msla-pager-v2-${id.toLowerCase()}`);
        await expect(pager).toBeVisible();
        await expect(pager.getByLabel('Previous', { exact: true })).toBeDisabled();
        await pager.getByLabel('Next', { exact: true }).click();
        await expect.poll(() => runIndex(page, id, tool)).toBe(1);
        await pager.getByLabel('Next', { exact: true }).click();
        await expect.poll(() => runIndex(page, id, tool)).toBe(2);
        await expect(pager.getByLabel('Next', { exact: true })).toBeDisabled();
        await pager.getByLabel('Previous', { exact: true }).click();
        await expect.poll(() => runIndex(page, id, tool)).toBe(1);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      expect(await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.getState().workflow.runInstance)).toBeNull();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath('simulated-tool-paging.png'), animations: 'disabled' });
    });
  });
}
