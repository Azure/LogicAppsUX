import { expect, test, type Locator, type Page } from '@playwright/test';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, setContextSetting } from './utils/sharedNodeUi';

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

const measureForeach = (page: Page) =>
  page.evaluate(() => {
    const graph = document.querySelector<HTMLElement>('.react-flow__node[data-id="Foreach"]')!;
    const header = document.querySelector<HTMLElement>('.react-flow__node[data-id="Foreach-#scope"]')!;
    const card = header.querySelector<HTMLElement>('#msla-node-Foreach')!;
    const frame = graph.querySelector<HTMLElement>('.msla-graph-container-wrapper > [data-node-card="loop-frame"]');
    const edge = document.querySelector<SVGPathElement>(
      '.react-flow__edge[data-id^="Foreach-"] :is(.react-flow__edge-path, .msla-shared-edge-path)'
    )!;
    const zoom = new DOMMatrixReadOnly(getComputedStyle(graph.closest('.react-flow__viewport')!).transform).m11;
    const top = graph.getBoundingClientRect().top;
    return {
      header: header.offsetHeight,
      card: card.offsetHeight,
      graph: graph.offsetHeight,
      frameTop: frame ? Math.round((frame.getBoundingClientRect().top - top) / zoom) : undefined,
      edgeStart: Math.round((edge.getPointAtLength(0).matrixTransform(edge.getScreenCTM()!).y - top) / zoom),
    };
  });

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
    test('keeps the empty Foreach caption clear in dark monitoring', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      await setContextSetting(page, 'Dark Mode', true);
      const emptyLoop = page.locator('.react-flow__node[data-id="ForEach_empty"]');
      await expect(emptyLoop).toBeVisible();
      expect(await emptyLoop.locator('[data-loop-body-join]').count()).toBe(flag === 'true' ? 1 : 0);
      await enterSimulatedMonitoring(page);
      const header = page.locator('.react-flow__node[data-id="ForEach_empty-#scope"]');
      await expect(header.getByText('No actions', { exact: true })).toBeVisible();
      await expect(emptyLoop.locator('[data-loop-body-join]')).toHaveCount(0);
      await testInfo.attach('dark-empty-foreach', { body: await page.screenshot(), contentType: 'image/png' });
    });

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
          const outputPort = pager.locator('xpath=ancestor::div[@data-node-card="foreach"]').locator('.react-flow__handle.source');
          // Edge IDs encode the dash inside the source node ID before adding the endpoint separator.
          const outgoing = page.locator(`.react-flow__edge[data-id^="${id}%2D#scope-"] .msla-shared-edge-path`).first();
          await expect
            .poll(async () => {
              const { y, height } = (await pager.boundingBox())!;
              const port = (await outputPort.boundingBox())!;
              const edgeStartY = await outgoing.evaluate(
                (path: SVGPathElement) => path.getPointAtLength(0).matrixTransform(path.getScreenCTM()!).y
              );
              return Math.min(port.y + port.height, edgeStartY) - (y + height);
            })
            .toBeGreaterThanOrEqual(0);
        }
      }
      const pager = page.getByTestId('msla-pager-v2-foreach');
      await pager.getByLabel(flag === 'true' ? 'Next iteration' : 'Next', { exact: true }).click();
      const body = page.locator('[data-loop-group-body="Foreach"]');
      const join = body.locator('[data-loop-body-join]');
      if (flag === 'true') {
        await expect(join).toHaveAttribute('data-arrow', 'false');
        await expect(join).toHaveCSS('pointer-events', 'none');
        const header = page.locator('[data-loop-group-header="Foreach"]');
        const frame = body.locator('[data-node-card="loop-frame"]');
        await header.hover();
        await expect(header).toHaveAttribute('data-loop-active', '');
        await expect(body).toHaveAttribute('data-loop-active', '');
        await expect(frame).toHaveCSS('outline-style', 'solid');
        const bridge = (await join.boundingBox())!;
        await page.mouse.move(bridge.x + bridge.width / 2, bridge.y + bridge.height / 2);
        await expect(header).toHaveAttribute('data-loop-active', '');
        const frameBounds = (await frame.boundingBox())!;
        await page.mouse.move(frameBounds.x + 5, frameBounds.y + frameBounds.height / 2);
        await expect(header).toHaveAttribute('data-loop-active', '');
        const nestedHeader = page.locator('[data-loop-group-header="Foreach_nested"]');
        await nestedHeader.hover();
        await expect(nestedHeader).toHaveAttribute('data-loop-active', '');
        await expect(header).not.toHaveAttribute('data-loop-active', '');
        await expect(frame).toHaveCSS('outline-style', 'none');
      } else {
        await expect(body).toHaveCount(0);
      }
      const expanded = await measureForeach(page);
      const collapse = page.locator('button[id="Foreach-collapse-toggle"]');
      await collapse.click();
      await expect(pager).toHaveCount(0);
      await expect(join).toHaveCount(0);
      await expect.poll(async () => (await measureForeach(page)).graph).toBeLessThan(expanded.graph);
      const collapsed = await measureForeach(page);
      if (flag === 'true') {
        // The collapsed React Flow wrapper includes the count badge; the pager
        // must disappear from the card and the accepted body-frame position.
        expect(expanded.card - collapsed.card).toBe(24);
        expect(expanded.frameTop! - collapsed.frameTop!).toBe(24);
      }
      expect(collapsed.edgeStart).toBeLessThan(expanded.edgeStart);
      await collapse.click();
      await expect(pager).toBeVisible();
      if (flag === 'true') {
        await expect(join).toHaveCount(1);
      }
      await expect.poll(() => measureForeach(page)).toEqual(expanded);
      await expect.poll(() => runIndex(page, 'Foreach')).toBe(1);
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      expect(await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.getState().workflow.runInstance)).toBeNull();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      await testInfo.attach('simulated-foreach-paging', {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    });

    test('does not apply a late Agent response to the selected tool cards', async ({ page }) => {
      // The Local Designer's mock client doesn't send HTTP. Back just the simulated Agent route with
      // fetch so Playwright can release its responses out of order without changing the product service.
      await page.route(/\/LocalDesigner\/httpClient\.ts(?:\?|$)/, async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          body: `${await response.text()}
            const originalGet = HttpClient.prototype.get;
            HttpClient.prototype.get = function (options) {
              if (/^\\/url\\/agent-parity-run\\/actions\\/WorkflowAgent\\/agentRepetitions\\/\\d+\\?/.test(options.uri)) {
                return fetch(options.uri).then(response => response.json());
              }
              return originalGet.apply(this, arguments);
            };`,
        });
      });
      await openSharedWorkflow(page, 'Agent with MCP Tools', flag);
      await enterSimulatedMonitoring(page);
      const select = (index: number) =>
        page.evaluate((page) => {
          (window as DesignerWindow).DesignerStoreV2.dispatch({ type: 'workflow/setRunIndex', payload: { nodeId: 'WorkflowAgent', page } });
        }, index);
      const release = { older: () => {} };
      const older = new Promise<void>((resolve) => {
        release.older = resolve;
      });
      const responses = /\/url\/agent-parity-run\/actions\/WorkflowAgent\/agentRepetitions\/00000[012]\?/;
      await page.route(responses, async (route) => {
        const repetition = new URL(route.request().url()).pathname.split('/').pop()!;
        if (repetition === '000001') {
          await older;
        }
        const status = repetition === '000002' ? 'Failed' : 'Succeeded';
        await route.fulfill({
          json: {
            name: repetition,
            properties: {
              ...times,
              status,
              iterationCount: 3,
              // Only Legacy uses a link as the distinct-iteration signal.
              ...(flag === 'false' ? { inputsLink: { uri: `/simulated-agent/${repetition}` } } : {}),
              tools: {
                Regular_Tool: { status, iterations: 3 },
                BuiltIn_MCP_Server: { status, iterations: 3 },
                ...(repetition !== '000001' && { Managed_MCP_Server: { status, iterations: 3 } }),
              },
            },
          },
        });
      });
      await page.evaluate(() => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        store.dispatch({ type: 'workflow/setRunIndex', payload: { nodeId: 'WorkflowAgent', page: 0 } });
        store.dispatch({
          type: 'workflow/setRunInstance',
          payload: { id: '/agent-parity-run', name: 'agent-parity-run', properties: { status: 'Succeeded' } },
        });
      });
      const tools = ['Regular_Tool', 'BuiltIn_MCP_Server', 'Managed_MCP_Server'];
      const card = (id: string) => page.locator(`[id="msla-node-${id}"]`);
      const next = page.getByTestId('msla-pager-v2-workflowagent').getByLabel(flag === 'true' ? 'Next iteration' : 'Next', { exact: true });
      const activeStatus = () =>
        page.evaluate((toolIds) => {
          const { nodesMetadata } = (window as DesignerWindow).DesignerStoreV2.getState().workflow;
          return toolIds.map((id) => (nodesMetadata[id]?.toolRunData ?? nodesMetadata[id]?.runData)?.status);
        }, tools);
      await expect.poll(activeStatus).toEqual(['Succeeded', 'Succeeded', 'Succeeded']);
      if (flag === 'true') {
        for (const id of tools) {
          await expect(card(id)).toHaveAttribute('data-status', 'succeeded');
        }
        await expect(page.getByTestId('msla-pager-v2-builtin_mcp_server')).toBeVisible();
      }
      const previousRequest = page.waitForRequest(/\/agentRepetitions\/000001\?/);
      await next.click();
      await previousRequest;
      if (flag === 'true') {
        for (const id of tools) {
          await expect(card(id)).not.toHaveAttribute('data-status', /.+/);
          await expect(page.getByTestId(`msla-pager-v2-${id.toLowerCase()}`)).toHaveCount(0);
        }
      }
      await next.click();
      await expect.poll(activeStatus).toEqual(['Failed', 'Failed', 'Failed']);
      const olderResponse = page.waitForResponse(/\/agentRepetitions\/000001\?/);
      release.older();
      await olderResponse;
      if (flag === 'true') {
        for (const id of tools) {
          await expect(card(id)).toHaveAttribute('data-status', 'failed');
        }
        await expect(page.getByTestId('msla-pager-v2-builtin_mcp_server')).toBeVisible();
      }
      await expect.poll(activeStatus).toEqual(['Failed', 'Failed', 'Failed']);
      await select(1);
      // Selecting the now-cached response filters the uninvoked tool in both modes.
      await expect(page.getByTestId('rf__node-Managed_MCP_Server')).toHaveCount(0);
      await expect.poll(activeStatus).toEqual(['Succeeded', 'Succeeded', flag === 'true' ? undefined : 'Failed']);
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
