/**
 * @vitest-environment jsdom
 */
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import * as Shared from '@microsoft/logic-apps-shared';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Position, type EdgeProps, type NodeProps, type ReactFlowProps } from '@xyflow/react';
import type { ComponentType, PropsWithChildren } from 'react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../core/store';
import type { WorkflowExtractionPlan } from '../../common/models/workflowExtraction';
import { ReadOnlyWorkflowGraph, type ReadOnlyWorkflowGraphData } from '../ReadOnlyWorkflowGraph';
import { getWorkflowExtractionPreview } from '../panel/multiSelectPanel/workflowExtractionPreview';

const mocks = vi.hoisted(() => ({ flow: vi.fn(), zoomIn: vi.fn(), getNode: vi.fn(() => ({ position: { x: 0, y: 0 } })) }));
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlowProvider: ({ children }: PropsWithChildren) => <>{children}</>,
    ReactFlow: (props: ReactFlowProps) => {
      mocks.flow(props);
      return (
        <div data-testid="graph-viewport" tabIndex={0} onKeyDown={props.onKeyDown}>
          {props.nodes?.map((node) => {
            const View = props.nodeTypes![node.type!] as ComponentType<NodeProps>;
            return <View key={node.id} {...(node as NodeProps)} />;
          })}
          <svg>
            {props.edges?.map((edge) => {
              const View = props.edgeTypes![edge.type!] as ComponentType<EdgeProps>;
              return (
                <View
                  key={edge.id}
                  {...(edge as EdgeProps)}
                  sourceX={100}
                  sourceY={44}
                  targetX={100}
                  targetY={124}
                  sourcePosition={Position.Bottom}
                  targetPosition={Position.Top}
                />
              );
            })}
          </svg>
          {props.children}
        </div>
      );
    },
    Handle: () => <span data-testid="native-handle" />,
    Panel: ({ children }: PropsWithChildren) => <div>{children}</div>,
    Background: () => null,
    useStore: () => false,
    useUpdateNodeInternals: () => vi.fn(),
    useReactFlow: () => ({
      getNode: mocks.getNode,
      zoomIn: mocks.zoomIn,
      zoomOut: vi.fn(),
      fitView: vi.fn(),
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      setViewport: vi.fn(),
    }),
  };
});

const plan: WorkflowExtractionPlan = {
  source: { definition: { actions: {}, triggers: {} } },
  child: {
    definition: {
      triggers: { Request: { type: 'Request', kind: 'Http', inputs: {} } },
      actions: {
        Condition: {
          type: 'If',
          expression: '@true',
          runAfter: {},
          actions: {
            First: { type: 'Compose', inputs: 'one', runAfter: {}, description: 'Description' },
            Second: { type: 'Compose', inputs: 'two', runAfter: { First: ['Failed', 'TimedOut'] } },
          },
          else: { actions: {} },
        },
        Response: { type: 'Response', inputs: { statusCode: 200 }, runAfter: { Condition: ['Succeeded'] } },
      },
    },
  },
  selectedIds: ['Condition'],
  childName: 'Child',
  invocationId: 'Invoke_child',
  inputs: [],
  outputs: [],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('ReadOnlyWorkflowGraph', () => {
  it('retains native hidden, Bezier-only and handoff spline rendering without edit indicators', () => {
    const graph: ReadOnlyWorkflowGraphData = {
      nodes: [
        { id: 'First', type: 'OPERATION_NODE', position: { x: 0, y: 0 }, data: { label: 'First' } },
        { id: 'Second', type: 'OPERATION_NODE', position: { x: 0, y: 120 }, data: { label: 'Second' } },
        { id: 'Hidden', type: 'HIDDEN_NODE', position: { x: 0, y: 240 }, data: { label: 'Hidden' } },
      ],
      edges: [
        { id: 'hidden', source: 'First', target: 'Hidden', type: 'HIDDEN_EDGE' },
        { id: 'only', source: 'First', target: 'Second', type: 'ONLY_EDGE' },
        {
          id: 'handoff',
          source: 'First',
          target: 'Second',
          type: 'HANDOFF_EDGE',
          data: {
            elkEdge: { sections: [{ startPoint: { x: 0, y: 0 }, bendPoints: [{ x: 10, y: 20 }], endPoint: { x: 20, y: 40 } }] },
          },
        },
      ],
    };
    const view = render(
      <IntlProvider locale="en">
        <ReadOnlyWorkflowGraph graph={graph} />
      </IntlProvider>
    );
    expect(view.container.querySelectorAll('.react-flow__edge-path')).toHaveLength(2);
    expect(view.container.querySelector('path[id="handoff"]')).toHaveClass('handoff');
    expect(view.container.querySelector('path[id="handoff"]')).toHaveAttribute('stroke-dasharray', '4 6');
    expect(view.container.querySelector('path[id="handoff"]')).toHaveAttribute('marker-end', expect.stringMatching(/^url\(#/));
    expect(view.container.querySelector('marker.handoff')).toBeInTheDocument();
    expect(view.container.querySelector('[id="hidden"]')).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('button')).toHaveLength(3);
  });

  it.each([webDarkTheme, webLightTheme])(
    'renders native leaves and runAfter paths without a store, services or live editor controllers',
    async (theme) => {
      const before = store.getState();
      const dispatch = vi.spyOn(store, 'dispatch');
      const manifest = vi.spyOn(Shared, 'InitOperationManifestService');
      const connections = vi.spyOn(Shared, 'InitConnectionService');
      const workflow = vi.spyOn(Shared, 'InitWorkflowService');
      const network = vi.spyOn(globalThis, 'fetch');
      const graph = await getWorkflowExtractionPreview(plan);
      const graphBefore = structuredClone(graph);
      const view = render(
        <IntlProvider locale="en">
          <FluentProvider theme={theme}>
            <ReadOnlyWorkflowGraph graph={graph} />
          </FluentProvider>
        </IntlProvider>
      );
      expect(screen.getByRole('img', { name: 'Condition operation' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'True' })).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'False' })).toBeInTheDocument();
      expect(view.container.querySelectorAll('.msla-graph-container-wrapper')).toHaveLength(3);
      expect(view.container.querySelectorAll('.react-flow__edge-path')).toHaveLength(graph.edges.length);
      const statusPath = view.container.querySelector('[id="First-Second"]')!;
      expect(statusPath).toHaveAttribute('stroke-dasharray', '4 6');
      expect(statusPath).toHaveAttribute('marker-end', expect.stringMatching(/^url\(#/));
      expect(view.container.querySelector('#msla-run-after-traffic-light')).toBeInTheDocument();
      expect(view.container.querySelectorAll('.msla-run-after-dot')).toHaveLength(4);
      expect(view.container.querySelector('[data-testid="card-indicator-comment"]')).toBeInTheDocument();
      expect(view.container.querySelectorAll('button:not([disabled])')).toHaveLength(3);
      expect(view.container.querySelectorAll('button[disabled]')).toHaveLength(3);
      expect(view.container.querySelector('[draggable="true"]')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('img', { name: 'Condition operation' }));
      fireEvent.doubleClick(screen.getByText('True'));
      fireEvent.contextMenu(screen.getByRole('img', { name: 'First operation' }));
      fireEvent.keyDown(screen.getByTestId('graph-viewport'), { key: 'Delete' });
      fireEvent.keyDown(screen.getByTestId('graph-viewport'), { key: 'c', ctrlKey: true });
      fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
      expect(mocks.zoomIn).toHaveBeenCalledOnce();
      view.rerender(
        <IntlProvider locale="en">
          <FluentProvider theme={theme}>
            <ReadOnlyWorkflowGraph graph={{ ...graph, nodes: graph.nodes.map((node) => ({ ...node })) }} />
          </FluentProvider>
        </IntlProvider>
      );
      view.unmount();
      expect(graph).toEqual(graphBefore);
      expect(store.getState()).toBe(before);
      for (const spy of [dispatch, manifest, connections, workflow, network]) {
        expect(spy).not.toHaveBeenCalled();
      }
    }
  );
});
