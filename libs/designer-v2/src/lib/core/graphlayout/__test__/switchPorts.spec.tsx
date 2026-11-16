import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ConditionNodeCard } from '@microsoft/designer-ui-v2';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { ReactFlow } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { ElkNode } from 'elkjs';
import { tokens, webLightTheme } from '@fluentui/react-components';
import { Provider } from 'react-redux';
import { IntlProvider } from 'react-intl';
import { createDesignerStore } from '../../store';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { agentMcpWorkflowDefinitionInput } from '../../parsers/BJSWorkflow/__test__/agentMcpWorkflowDefinition';
import { exportForTesting } from '../elklayout';
import { DefaultHandle } from '../../../ui/CustomNodes/components/handles/DefaultHandle';

type SwitchNode = Node<{
  axis: 'horizontal' | 'vertical';
  count: number;
  ports: NonNullable<ElkNode['ports']>;
  presentation: { shared: boolean };
}>;
const ActualSwitch = ({ data }: NodeProps<SwitchNode>) => (
  <ConditionNodeCard
    kind="switch"
    title="Nested Switch"
    caseCount={data.count}
    handleAxis={data.axis}
    inputSlot={<DefaultHandle id="switch-input" axis={data.axis} type="target" contained />}
    outputSlots={data.ports.map((port) => <DefaultHandle key={port.id} id={port.id} axis={data.axis} type="source" contained />)}
  />
);
const nodeTypes = { switch: ActualSwitch };
const find = (node: ElkNode, id: string): ElkNode | undefined =>
  node.id === id ? node : node.children?.map((child) => find(child, id)).find(Boolean);
const definition = (count: number) => ({
  ...agentMcpWorkflowDefinitionInput,
  actions: {
    Agent: {
      ...agentMcpWorkflowDefinitionInput.actions.WorkflowAgent,
      tools: {
        Tool: {
          type: 'AgentCondition',
          actions: {
            Nested_switch: {
              type: 'Switch',
              expression: '@triggerBody()',
              cases: Object.fromEntries(Array.from({ length: count - 1 }, (_, index) => [`Case_${index}`, { case: index, actions: {} }])),
              default: { actions: {} },
              runAfter: {},
            },
          },
        },
      },
    },
  },
});

describe('nested Switch accepted geometry and canonical named ports', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });
  afterAll(() => vi.unstubAllGlobals());

  it.each([1, 4, 6, 20])('matches actual RIGHT ELK header and canonical %i-output Switch geometry', async (count) => {
    const source = definition(count);
    const sourceBefore = structuredClone(source);
    const parsed = Deserialize(source, null);
    const parsedBefore = structuredClone(parsed);
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, true, {
      operations: parsed.actionData,
      nodesMetadata: parsed.nodesMetadata,
    });
    const header = find(converted, 'Nested_switch-#scope')!;
    const stack = count * nodeMetrics.handle.size + (count - 1) * 8;
    // Tight canonical outputs cancel the body's padding; only the two card borders remain.
    const height = Math.max(nodeMetrics.cards.switch.height, stack + 2);
    expect(header.width).toBe(nodeMetrics.cards.switch.width);
    expect(header.height).toBe(height);
    const layout = await exportForTesting.elkLayout(converted);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, true);
    const accepted = nodes.find(({ id }) => id === header.id)!;
    const laidOutHeader = find(layout, header.id)!;
    const switchGraph = find(layout, 'Nested_switch')!;
    expect(accepted.height).toBe(height);
    expect(accepted.width).toBe(160);
    expect(accepted.data.handleAxis).toBe('horizontal');
    expect(header.ports).toHaveLength(count);
    expect(header.ports!.map(({ id }) => id)).toEqual(
      [...Object.keys(source.actions.Agent.tools.Tool.actions.Nested_switch.cases), 'Nested_switch-defaultCase'].map(
        (id) => `${header.id}::${id}`
      )
    );
    expect(new Set(header.ports!.map(({ id }) => id)).size).toBe(count);
    expect(source).toEqual(sourceBefore);
    expect(parsed).toEqual(parsedBefore);
    const view = render(
      <Provider store={createDesignerStore()}>
        <IntlProvider locale="en">
          <ReactFlow
            width={600}
            height={600}
            nodeTypes={nodeTypes}
            nodes={[
              {
                id: header.id,
                type: 'switch',
                position: { x: 0, y: 0 },
                width: header.width,
                height,
                data: { axis: 'horizontal', count, ports: header.ports!, presentation: { shared: true } },
              },
            ]}
          />
        </IntlProvider>
      </Provider>
    );
    const card = view.container.querySelector('[data-node-card="switch"]')!;
    const surface = card.firstElementChild!;
    const outputs = card.querySelector('[data-testid="node-output-handles"]')!;
    const dots = outputs.querySelectorAll('[data-handle]');
    expect(getComputedStyle(card).width).toBe('160px');
    expect(getComputedStyle(surface).minHeight).toBe(`${height}px`);
    expect(getComputedStyle(surface).borderTopWidth).toBe('1px');
    expect(getComputedStyle(surface).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(outputs).flexDirection).toBe('column');
    expect(getComputedStyle(outputs).gap).toBe('8px');
    expect(getComputedStyle(outputs).marginBlock).toBe(`calc(-1 * ${tokens.spacingVerticalL})`);
    expect(webLightTheme.spacingVerticalL).toBe('16px');
    const input = card.querySelector('[data-handleid="switch-input"]')!;
    expect(input).toHaveClass('react-flow__handle-left');
    expect(input).toHaveAttribute('data-port-contained', 'true');
    expect(getComputedStyle(input.parentElement!).left).toBe('-7px');
    expect(getComputedStyle(input.parentElement!).top).toBe('50%');
    const slots = card.querySelectorAll<HTMLElement>('[data-testid="node-output-handles"] .react-flow__handle');
    expect(slots).toHaveLength(count);
    header.ports!.forEach((port, index) => {
      expect(port.layoutOptions?.['elk.port.side']).toBe('EAST');
      expect(port.x).toBe(header.width);
      expect(port.y).toBeCloseTo(height / 2 - stack / 2 + nodeMetrics.handle.size / 2 + index * (nodeMetrics.handle.size + 8));
      expect(port.y! - nodeMetrics.handle.size / 2).toBeGreaterThanOrEqual(0);
      expect(port.y! + nodeMetrics.handle.size / 2).toBeLessThanOrEqual(height);
      expect(getComputedStyle(dots[index]).height).toBe('12px');
      expect(getComputedStyle(dots[index]).width).toBe('12px');
      expect(getComputedStyle(dots[index]).flexShrink).toBe('0');
      expect(slots[index]).toHaveAttribute('data-handleid', port.id);
      expect(slots[index]).toHaveClass('react-flow__handle-right');
      expect(slots[index]).toHaveAttribute('data-port-contained', 'true');
      expect(slots[index]).toHaveStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      // ELK's routed edge starts and the registered dot centers share the Switch compound coordinates.
      const layoutPort = laidOutHeader.ports!.find(({ id }) => id === port.id)!;
      const edge = switchGraph.edges!.find(({ sources }) => sources.includes(port.id))!;
      const section = edge.sections![0];
      const dotSize = Number.parseFloat(getComputedStyle(dots[index]).height);
      const gap = Number.parseFloat(getComputedStyle(outputs).gap);
      const actualStack = dots.length * dotSize + (dots.length - 1) * gap;
      expect(layoutPort.y).toBeCloseTo(height / 2 - actualStack / 2 + dotSize / 2 + index * (dotSize + gap));
      expect(section.startPoint.x).toBeCloseTo(laidOutHeader.x! + layoutPort.x!);
      expect(section.startPoint.y).toBeCloseTo(laidOutHeader.y! + layoutPort.y!);
      expect(layoutPort.y! - dotSize / 2).toBeGreaterThanOrEqual(1);
      expect(layoutPort.y! + dotSize / 2).toBeLessThanOrEqual(height - 1);
    });
    view.unmount();
  });

  it.each([1, 4, 20].flatMap((count) => [false, true, undefined].map((shared) => ({ count, shared }))))(
    'preserves DOWN $count-output Switch outside tools (shared=$shared)',
    async ({ count, shared }) => {
      const source = definition(count);
      const nested = source.actions.Agent.tools.Tool.actions.Nested_switch;
      const parsed = Deserialize({ ...source, actions: { Nested_switch: nested } }, null);
      const converted = exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, shared, {
        operations: parsed.actionData,
        nodesMetadata: parsed.nodesMetadata,
      });
      const header = find(converted, 'Nested_switch-#scope')!;
      const layout = await exportForTesting.elkLayout(converted);
      const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, shared);
      expect(nodes.find(({ id }) => id === header.id)!.data.handleAxis).toBe('vertical');
      if (shared) {
        expect(header.width).toBe(count === 20 ? 424 : 160);
        expect(header.height).toBe(nodeMetrics.cards.condition.height);
        header.ports!.forEach((port) => expect(port.layoutOptions?.['elk.port.side']).toBe('SOUTH'));
      } else {
        expect(header.ports).toBeUndefined();
        expect(header.height).toBe(40);
      }
    }
  );

  it.each([false, undefined])('keeps nested tool Switch DOWN with default-off shared=%s', async (shared) => {
    const parsed = Deserialize(definition(20), null);
    const converted = exportForTesting.convertWorkflowGraphToElkGraph(parsed.graph!, shared, {
      operations: parsed.actionData,
      nodesMetadata: parsed.nodesMetadata,
    });
    const header = find(converted, 'Nested_switch-#scope')!;
    const layout = await exportForTesting.elkLayout(converted);
    const [nodes] = exportForTesting.convertElkGraphToReactFlow(layout, shared);
    expect(nodes.find(({ id }) => id === header.id)!.data.handleAxis).toBe('vertical');
    expect(header.ports).toBeUndefined();
    expect(header.height).toBe(40);
  });
});
