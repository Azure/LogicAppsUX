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
    const graph = document.querySelector<HTMLElement>('.react-flow__node[data-id="Foreach"]');
    const header = document.querySelector<HTMLElement>('.react-flow__node[data-id="Foreach-#scope"]');
    const card = header?.querySelector<HTMLElement>('#msla-node-Foreach');
    const frame = graph?.querySelector<HTMLElement>('.msla-graph-container-wrapper > [data-node-card="loop-frame"]');
    const edge = document.querySelector<SVGPathElement>(
      '.react-flow__edge[data-id^="Foreach-"] :is(.react-flow__edge-path, .msla-shared-edge-path)'
    );
    const viewport = graph?.closest('.react-flow__viewport');
    const ctm = edge?.getScreenCTM();
    if (!graph || !header || !card || !edge || !viewport || !ctm) {
      return null;
    }
    const zoom = new DOMMatrixReadOnly(getComputedStyle(viewport).transform).m11;
    const top = graph.getBoundingClientRect().top;
    return {
      header: header.offsetHeight,
      card: card.offsetHeight,
      graph: graph.offsetHeight,
      frameTop: frame ? Math.round((frame.getBoundingClientRect().top - top) / zoom) : undefined,
      edgeStart: Math.round((edge.getPointAtLength(0).matrixTransform(ctm).y - top) / zoom),
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
        await page.emulateMedia({ forcedColors: 'active' });
        const stroke = join.locator('path');
        const systemColors = await stroke.evaluate(() => {
          const probe = document.createElement('span');
          probe.style.forcedColorAdjust = 'none';
          document.body.append(probe);
          const resolve = (color: string) => {
            probe.style.color = color;
            return getComputedStyle(probe).color;
          };
          const colors = { resting: resolve('CanvasText'), hovered: resolve('Highlight') };
          probe.remove();
          return colors;
        });
        await expect(stroke).toHaveCSS('stroke', systemColors.resting);
        await header.hover();
        await expect(stroke).toHaveCSS('stroke', systemColors.hovered);
        await page.mouse.move(1, 1);
        await expect(stroke).toHaveCSS('stroke', systemColors.resting);
        await page.emulateMedia({ forcedColors: 'none' });
      } else {
        await expect(body).toHaveCount(0);
      }
      const expanded = (await measureForeach(page))!;
      const collapse = page.locator('button[id="Foreach-collapse-toggle"]');
      await collapse.click();
      await expect(pager).toHaveCount(0);
      await expect(join).toHaveCount(0);
      await expect.poll(async () => (await measureForeach(page))?.graph ?? Number.POSITIVE_INFINITY).toBeLessThan(expanded.graph);
      const collapsed = (await measureForeach(page))!;
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

    if (flag === 'true') {
      test('hides the previous Foreach error and raw I/O while the selected iteration is pending', async ({ page }) => {
        // The Local Designer's mock HTTP client does not send requests by default.
        await page.route(/\/LocalDesigner\/httpClient\.ts(?:\?|$)/, async (route) => {
          const response = await route.fetch();
          await route.fulfill({
            response,
            body: `${await response.text()}
              const originalGet = HttpClient.prototype.get;
              HttpClient.prototype.get = function (options) {
                if (options.uri.startsWith('/url/foreach-parity-run/actions/Increment_variable_2/repetitions/')) {
                  return fetch(options.uri).then(response => response.json());
                }
                return originalGet.apply(this, arguments);
              };`,
          });
        });
        const errorMessage = 'Simulated failure from the first iteration';
        const repetitions = /\/foreach-parity-run\/actions\/Increment_variable_2\/repetitions\/00000[01]\?/;
        let releaseSecond = () => {};
        const pending = new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
        await page.route(repetitions, async (route) => {
          const name = new URL(route.request().url()).pathname.split('/').pop();
          const first = name === '000000';
          if (!first) {
            await pending;
          }
          await route.fulfill({
            json: {
              name,
              properties: {
                ...times,
                status: first ? 'Failed' : 'Succeeded',
                ...(first && {
                  code: 'FixtureFailure',
                  error: { code: 'FixtureFailure', message: errorMessage },
                  inputsLink: { uri: '/simulated-foreach/000000/inputs' },
                  outputsLink: { uri: '/simulated-foreach/000000/outputs' },
                }),
              },
            },
          });
        });

        await openSharedWorkflow(page, 'ForEach', flag);
        await enterSimulatedMonitoring(page);
        await page.evaluate(
          ({ times }) => {
            const store = (window as DesignerWindow).DesignerStoreV2;
            store.dispatch({ type: 'workflow/setRunIndex', payload: { nodeId: 'Foreach', page: 0 } });
            store.dispatch({
              type: 'workflow/setRepetitionRunData',
              payload: { nodeId: 'Foreach', runData: { ...times, status: 'Succeeded', iterationCount: 2 } },
            });
            store.dispatch({
              type: 'workflow/setRunInstance',
              payload: { id: '/foreach-parity-run', name: 'foreach-parity-run', properties: { status: 'Failed' } },
            });
          },
          { times }
        );

        const action = page.locator('#msla-node-Increment_variable_2');
        await action.click();
        const panel = page.locator('#msla-node-details-panel-Increment_variable_2');
        const priorError = panel.getByText(errorMessage, { exact: true });
        const rawInputs = panel.getByRole('button', { name: 'Show raw inputs', exact: true });
        const rawOutputs = panel.getByRole('button', { name: 'Show raw outputs', exact: true });
        const priorValue = panel.locator('[aria-labelledby="inputs-Increment_variable_2"] pre').filter({ hasText: 'var1' });
        await expect(priorError).toBeVisible();
        await expect(rawInputs).toBeVisible();
        await expect(rawOutputs).toBeVisible();
        await expect(priorValue).toBeVisible();
        try {
          const secondRequest = page.waitForRequest(/\/Increment_variable_2\/repetitions\/000001\?/);
          await page.getByTestId('msla-pager-v2-foreach').getByLabel('Next iteration', { exact: true }).click();
          await secondRequest;
          await expect(panel).toBeVisible();
          await expect(priorError).toHaveCount(0);
          await expect(rawInputs).toHaveCount(0);
          await expect(rawOutputs).toHaveCount(0);
          await expect(priorValue).toHaveCount(0);
        } finally {
          releaseSecond();
        }
        await expect(action).toHaveAttribute('data-status', 'succeeded');
        await expect(priorError).toHaveCount(0);
      });
    }

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
              if (/^\\/url\\/agent-parity-run\\/actions\\/WorkflowAgent\\/agentRepetitions\\/\\d+(?:\\/actions)?\\?/.test(options.uri)) {
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
      if (flag === 'true') {
        await page.route(/\/url\/agent-parity-run\/actions\/WorkflowAgent\/agentRepetitions\/00000[012]\/actions\?/, async (route) => {
          const first = new URL(route.request().url()).pathname.includes('/000000/');
          await route.fulfill({
            json: {
              value: first
                ? [
                    {
                      name: 'BuiltIn_MCP_Server',
                      properties: {
                        actionResults: [
                          { ...times, status: 'Failed' },
                          { ...times, endTime: '2026-01-01T00:00:02Z', status: 'Succeeded' },
                        ],
                      },
                    },
                    {
                      name: 'code_interpreter',
                      properties: {
                        actionResults: [
                          { ...times, name: 'code_interpreter', status: 'Failed' },
                          { ...times, name: 'code_interpreter', endTime: '2026-01-01T00:00:03Z', status: 'Succeeded' },
                        ],
                      },
                    },
                  ]
                : [],
            },
          });
        });
      }
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
                ...(flag === 'true' && repetition === '000000' && { code_interpreter: { status: 'Failed', iterations: 2 } }),
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
        for (const id of ['Regular_Tool', 'Managed_MCP_Server']) {
          await expect(card(id)).toHaveAttribute('data-status', 'succeeded');
        }
        const mcp = card('BuiltIn_MCP_Server');
        const mcpPager = page.getByTestId('msla-pager-v2-builtin_mcp_server');
        await expect(mcpPager).toBeVisible();
        await expect(mcp).toHaveAccessibleName(/Failed.*1s/i);
        await mcpPager.getByLabel('Next iteration', { exact: true }).click();
        await expect(mcp).toHaveAccessibleName(/Succeeded.*2s/i);
        await mcpPager.getByLabel('Next iteration', { exact: true }).click();
        await expect(mcp).toHaveAccessibleName(/Succeeded/i);
        await expect(mcp).not.toHaveAccessibleName(/2s/i);

        await page.evaluate(() => {
          const store = (window as DesignerWindow).DesignerStoreV2;
          const { WorkflowAgent } = store.getState().workflow.nodesMetadata;
          store.dispatch({
            type: 'workflow/updateAgenticMetadata',
            payload: {
              nodeId: 'WorkflowAgent',
              agentRepetitionIdentity: WorkflowAgent.agentRepetitionIdentity,
              scopeRepetitionRunData: {
                ...WorkflowAgent.runData,
                tools: {
                  Regular_Tool: { status: 'Succeeded', iterations: 3 },
                  BuiltIn_MCP_Server: { status: 'Succeeded', iterations: 2 },
                  Managed_MCP_Server: { status: 'Succeeded', iterations: 3 },
                  code_interpreter: { status: 'Failed', iterations: 2 },
                },
              },
            },
          });
        });
        await expect.poll(() => runIndex(page, 'BuiltIn_MCP_Server', true)).toBe(1);
        await expect(mcp).toHaveAccessibleName(/Succeeded.*2s/i);

        const builtIn = card('code_interpreter');
        const builtInPager = page.getByTestId('msla-pager-v2-code_interpreter');
        await builtInPager.getByLabel('Next iteration', { exact: true }).click();
        await builtIn.click();
        await expect(builtIn).toHaveAccessibleName(/Succeeded.*3s/i);
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
