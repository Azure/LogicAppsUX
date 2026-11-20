import { expect, test, type Locator, type Page } from '@playwright/test';
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

async function exerciseFourIterations(page: Page, pager: Locator, id: string, shared: boolean, tool = false) {
  const previous = pager.getByLabel(shared ? 'Previous iteration' : 'Previous', { exact: true });
  const next = pager.getByLabel(shared ? 'Next iteration' : 'Next', { exact: true });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect.poll(() => runIndex(page, id, tool)).toBe(1);
  if (shared) {
    const input = pager.getByRole('textbox', { name: 'Iteration number, 1 to 4' });
    await input.fill('4');
    await input.press('Enter');
    await expect.poll(() => runIndex(page, id, tool)).toBe(3);
    await input.fill('invalid');
    await input.press('Enter');
    await expect(input).toHaveValue('4');
  } else {
    await next.click();
    await next.click();
  }
  await expect(next).toBeDisabled();
  await previous.click();
  await expect.poll(() => runIndex(page, id, tool)).toBe(2);
  await previous.click();
  await previous.click();
  await expect.poll(() => runIndex(page, id, tool)).toBe(0);
  await expect(previous).toBeDisabled();
}

for (const flag of ['true', 'false'] as const) {
  test.describe(`Deterministic simulated run metadata, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('pages actual outer and nested Foreach renderers without an observed backend run', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'ForEach', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await enterSimulatedMonitoring(page);
      const metadata = {
        ...times,
        status: 'Succeeded',
        inputsLink: { uri: 'local-component-fixture', metadata: { foreachItemsCount: 4 } },
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
        body: JSON.stringify({ evidence: 'simulated component state; not observed backend evidence', metadata }),
        contentType: 'application/json',
      });
      for (const id of ['Foreach', 'Foreach_nested']) {
        const pager = page.getByTestId(`msla-pager-v2-${id.toLowerCase()}`);
        await expect(pager).toBeVisible();
        await exerciseFourIterations(page, pager, id, flag === 'true');
        if (flag === 'true') {
          await expect(pager.locator('[data-node-pager]')).toHaveCount(1);
        }
      }
      if (flag === 'true') {
        const pager = page.getByTestId('msla-pager-v2-foreach');
        await pager.getByLabel('Next iteration', { exact: true }).click();
        const collapse = page.locator('button[id="Foreach-collapse-toggle"]');
        await collapse.press('Enter');
        await expect(pager).toHaveCount(0);
        await collapse.press('Enter');
        await expect(pager).toBeVisible();
        await expect.poll(() => runIndex(page, 'Foreach')).toBe(1);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      expect(await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.getState().workflow.runInstance)).toBeNull();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      await testInfo.attach('simulated-foreach-paging', {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    });

    test('pages the actual regular and MCP tool renderers using deterministic repetition metadata', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Agent with MCP Tools', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await enterSimulatedMonitoring(page);
      const metadata = {
        ...times,
        status: 'Succeeded',
        tools: {
          Regular_Tool: { status: 'Succeeded', iterations: 4 },
          BuiltIn_MCP_Server: { status: 'Succeeded', iterations: 4 },
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
        body: JSON.stringify({ evidence: 'simulated component state; not observed backend evidence', metadata }),
        contentType: 'application/json',
      });
      const parentIndex = await runIndex(page, 'WorkflowAgent');
      for (const [id, tool] of [
        ['Regular_Tool', false],
        ['BuiltIn_MCP_Server', true],
      ] as const) {
        const pager = page.getByTestId(`msla-pager-v2-${id.toLowerCase()}`);
        await expect(pager).toBeVisible();
        const otherIndex = await runIndex(page, id, !tool);
        await exerciseFourIterations(page, pager, id, flag === 'true', tool);
        // Regular tools use runIndex; MCP uses toolRunIndex. Neither changes the parent Agent's selection.
        expect(await runIndex(page, id, !tool)).toBe(otherIndex);
        expect(await runIndex(page, 'WorkflowAgent')).toBe(parentIndex);
        if (flag === 'true') {
          // The host failure query is scope-only: do not manufacture a tool/MCP failed-jump claim.
          await expect(pager.getByRole('button', { name: /failed iteration/ })).toHaveCount(0);
        }
      }
      if (flag === 'true') {
        const pager = page.getByTestId('msla-pager-v2-builtin_mcp_server');
        const managedCard = page.locator('.react-flow__node[data-id="Managed_MCP_Server"]').locator('[data-node-card="tool"]');
        await managedCard.click({ trial: true });
        const pagerBox = await pager.boundingBox();
        const managedBox = await managedCard.boundingBox();
        if (!pagerBox || !managedBox) {
          throw new Error('Both the built-in MCP pager and the managed MCP card must have visible bounds.');
        }
        expect(pagerBox.y + pagerBox.height).toBeLessThan(managedBox.y);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      expect(await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.getState().workflow.runInstance)).toBeNull();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      await testInfo.attach('simulated-tool-paging', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    });
  });
}
