import { expect, test, type Page } from '@playwright/test';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import agentFixture from '../../__mocks__/workflows/AgentWithMcp.json' with { type: 'json' };
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { waitForViewport } from './utils/sharedNodeUi';

const workflowWithSwitch = (count: number) => {
  const agent = agentFixture.definition.actions.WorkflowAgent;
  const actions: Record<string, LogicAppsV2.ActionDefinition> = {
    Before_switch: { type: 'Compose', inputs: 'Synthetic branch-axis evidence', runAfter: {} },
    Nested_switch: {
      type: 'Switch',
      expression: '@triggerBody()',
      cases: Object.fromEntries(Array.from({ length: count - 1 }, (_, index) => [`Case_${index}`, { case: index, actions: {} }])),
      default: { actions: {} },
      runAfter: { Before_switch: ['SUCCEEDED'] },
    },
  };
  return {
    ...agentFixture,
    // The registry consumes the designer Workflow contract, not the JSON fixture loader's connections field.
    connectionReferences: agentFixture.connections,
    definition: {
      ...agentFixture.definition,
      actions: {
        WorkflowAgent: {
          ...agent,
          tools: { ...agent.tools, Regular_Tool: { ...agent.tools.Regular_Tool, actions } },
        },
      },
    },
  };
};

const readGeometry = (page: Page) =>
  page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing actual rendered geometry: ${selector}`);
      }
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height, cssWidth: element.offsetWidth };
    };
    const header = '.react-flow__node[data-id="Nested_switch-#scope"]';
    const card = `${header} [data-node-card="switch"]`;
    const outputs = document.querySelector<HTMLElement>(`${card} [data-testid="node-output-handles"]`)!;
    const surface = document.querySelector<HTMLElement>(`${card} > div`)!;
    const outputStyle = getComputedStyle(outputs);
    const surfaceStyle = getComputedStyle(surface);
    return {
      header: read(header),
      surface: read(`${card} > div`),
      tool: read('.react-flow__node[data-id="Regular_Tool-#subgraph"] [data-node-card="tool"]'),
      action: read('#msla-node-Before_switch'),
      trigger: read('#msla-node-When_an_HTTP_request_is_received'),
      agent: read('#msla-node-WorkflowAgent'),
      styles: {
        gap: outputStyle.gap,
        marginTop: outputStyle.marginTop,
        marginBottom: outputStyle.marginBottom,
        borderTop: surfaceStyle.borderTopWidth,
        borderBottom: surfaceStyle.borderBottomWidth,
      },
      edges: [...document.querySelectorAll<SVGPathElement>('.react-flow__edge .msla-shared-edge-path')].map((path) => {
        const matrix = path.getScreenCTM();
        if (!matrix) {
          throw new Error('The actual shared SVG edge must have screen geometry.');
        }
        const start = path.getPointAtLength(0).matrixTransform(matrix);
        return { x: start.x, y: start.y };
      }),
      outputs: [...document.querySelectorAll<HTMLElement>(`${card} [data-testid="node-output-handles"] .source`)].map((handle) => {
        const { x, y, width, height } = handle.getBoundingClientRect();
        const dot = getComputedStyle(handle.closest('[data-handle]')!);
        return {
          id: handle.dataset.handleid,
          x: x + width / 2,
          right: x + width,
          y: y + height / 2,
          dotWidth: dot.width,
          dotHeight: dot.height,
          isRight: handle.classList.contains('react-flow__handle-right'),
        };
      }),
    };
  });

for (const { count, height } of [
  { count: 4, height: 103 },
  { count: 20, height: 394 },
]) {
  test(
    `captures actual shared RIGHT tool and ${count}-output nested Switch geometry`,
    { tag: ['@mock', '@shared-node-ui'] },
    async ({ page, context, baseURL }, testInfo) => {
      if (!baseURL) {
        throw new Error('The configured Designer E2E host is required.');
      }
      const workflow = workflowWithSwitch(count);
      const origin = new URL(baseURL).origin;
      // Reuse the normal offline workflow loader; never request real accounts or resource APIs.
      await context.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
      await page.addInitScript(
        (workflow) =>
          localStorage.setItem(
            'msla-standalone-workflow-extraction-v1',
            JSON.stringify({
              version: 1,
              workflows: [{ id: 'AgentWithMcp.json', name: 'Synthetic tool Switch', workflow }],
              operations: [],
            })
          ),
        workflow
      );
      await page.goto('/v2?extraction=true&local=AgentWithMcp.json&useSharedNodeUi=true');
      const card = page.locator('.react-flow__node[data-id="Nested_switch-#scope"] [data-node-card="switch"]');
      await expect(card).toBeVisible();
      await expect(card.locator('[data-testid="node-output-handles"]')).toHaveAttribute('data-axis', 'horizontal');
      await expect(card.locator('[data-testid="node-output-handles"] .source')).toHaveCount(count);
      const before = await getSerializedWorkflowFromStateV2(page);
      expect(before.definition.actions.WorkflowAgent.tools.BuiltIn_MCP_Server.inputs.connectionReference.connectionName).toBe('mcpclient');
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      await expect
        .poll(async () => {
          const current = await readGeometry(page);
          const scale = current.header.width / current.header.cssWidth;
          // A RIGHT source path starts at the registered handle's outer edge, not its center.
          const edgeErrors = current.outputs.map((port) =>
            Math.min(...current.edges.map((edge) => Math.max(Math.abs(edge.x - port.right), Math.abs(edge.y - port.y))))
          );
          return Math.max(
            Math.abs(current.surface.height / scale - height),
            Math.abs(current.header.height / scale - height),
            ...edgeErrors
          );
        })
        .toBeLessThan(0.5);
      const geometry = await readGeometry(page);
      const scale = geometry.header.width / geometry.header.cssWidth;
      expect(geometry.surface.width / scale).toBeCloseTo(160, 1);
      expect(geometry.styles).toEqual({ gap: '8px', marginTop: '-16px', marginBottom: '-16px', borderTop: '1px', borderBottom: '1px' });
      expect(geometry.action.x).toBeGreaterThan(geometry.tool.x + geometry.tool.width);
      expect(geometry.header.x).toBeGreaterThan(geometry.action.x + geometry.action.width);
      expect(geometry.agent.y).toBeGreaterThan(geometry.trigger.y + geometry.trigger.height);
      // ReactFlow registers branch IDs on the owning node; only ELK's layout ports use the qualified node::branch namespace.
      expect(geometry.outputs.map(({ id }) => id)).toEqual([
        ...Array.from({ length: count - 1 }, (_, index) => `Case_${index}`),
        'Nested_switch-defaultCase',
      ]);
      for (const [index, port] of geometry.outputs.entries()) {
        const expectedY = geometry.header.y + (height / 2 - (count * 12 + (count - 1) * 8) / 2 + 6 + index * 20) * scale;
        expect(Math.abs(port.y - expectedY)).toBeLessThan(0.5);
        expect(port.isRight).toBe(true);
        expect([port.dotWidth, port.dotHeight]).toEqual(['12px', '12px']);
        expect(geometry.edges.filter((edge) => Math.abs(edge.x - port.right) < 0.5 && Math.abs(edge.y - port.y) < 0.5)).toHaveLength(1);
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await testInfo.attach('mock-standalone-shared-tool-switch-geometry', {
        body: JSON.stringify({
          environment: 'Mock Standalone, not native Azure Portal',
          count,
          geometry,
          ciCommit: process.env.GITHUB_SHA,
        }),
        contentType: 'application/json',
      });
      await testInfo.attach(`mock-standalone-shared-tool-switch-${count}-outputs`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  );
}
