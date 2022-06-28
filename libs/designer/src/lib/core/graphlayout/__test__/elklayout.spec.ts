import type { WorkflowEdgeType, WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '../../parsers/models/workflowNode';
import { createWorkflowNode, createWorkflowEdge, createElkNode, createElkEdge } from '../../utils/graph';
import { exportForTesting } from '../elklayout';
import type { ElkNode } from 'elkjs/lib/elk-api';
import type { Edge, Node } from 'react-flow-renderer';

const createSharedEdge = (source: string, target: string, type?: WorkflowEdgeType) => ({
  ...createWorkflowEdge(source, target, type),
  data: { elkEdge: createElkEdge(source, target, type) },
});

const elkGraphLayoutOptions = {
  'elk.padding': '[top=0,left=16,bottom=48,right=16]',
  'elk.position': '(0, 0)',
  nodeType: WORKFLOW_NODE_TYPES.GRAPH_NODE,
};

const { convertWorkflowGraphToElkGraph, convertElkGraphToReactFlow, elkLayout } = exportForTesting;
describe('elklayout', () => {
  describe('convertWorkflowGraphToElkGraph', () => {
    it('should properly convert a valid WorkflowGraph to an ElkNode', () => {
      const input: WorkflowNode = {
        id: 'root',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [createWorkflowNode('node1'), createWorkflowNode('node2')],
        edges: [createWorkflowEdge('node1', 'node2')],
      };
      const expectedOutput: ElkNode = {
        id: 'root',
        children: [createElkNode('node1'), createElkNode('node2')],
        edges: [createElkEdge('node1', 'node2')],
        layoutOptions: elkGraphLayoutOptions,
      };

      expect(convertWorkflowGraphToElkGraph(input)).toEqual(expectedOutput);
    });

    it('should properly convert a valid WorkflowGraph with scopes to an ElkNode', () => {
      const input: WorkflowNode = {
        id: 'root',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('manual'),
          createWorkflowNode('Increment_variable'),
          createWorkflowNode('Initialize_variable'),
          {
            id: 'ActionIf',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            children: [
              createWorkflowNode('ActionIf-#header', WORKFLOW_NODE_TYPES.SCOPE_NODE),
              {
                id: 'ActionIf-actions',
                children: [
                  createWorkflowNode('ActionIf-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE),
                  createWorkflowNode('Increment_variable2'),
                  createWorkflowNode('Increment_variable4'),
                ],
                edges: [
                  createWorkflowEdge('ActionIf-actions-#subgraph', 'Increment_variable2'),
                  createWorkflowEdge('Increment_variable2', 'Increment_variable4'),
                ],
                type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
              },
              {
                id: 'ActionIf-elseActions',
                children: [
                  createWorkflowNode('ActionIf-elseActions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE),
                  createWorkflowNode('Increment_variable3'),
                ],
                edges: [createWorkflowEdge('ActionIf-elseActions-#subgraph', 'Increment_variable3')],
                type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
              },
            ],
            edges: [
              createWorkflowEdge('ActionIf-#header', 'ActionIf-actions-#subgraph'),
              createWorkflowEdge('ActionIf-#header', 'ActionIf-elseActions-#subgraph'),
            ],
          },
          createWorkflowNode('Response'),
        ],
        edges: [
          createWorkflowEdge('manual', 'Initialize_variable'),
          createWorkflowEdge('Initialize_variable', 'Increment_variable'),
          createWorkflowEdge('Increment_variable', 'ActionIf'),
          createWorkflowEdge('ActionIf', 'Response'),
        ],
      };
      const expectedOutput: ElkNode = {
        id: 'root',
        layoutOptions: elkGraphLayoutOptions,
        children: [
          createElkNode('manual'),
          createElkNode('Increment_variable'),
          createElkNode('Initialize_variable'),
          {
            id: 'ActionIf',
            layoutOptions: elkGraphLayoutOptions,
            children: [
              createElkNode('ActionIf-#header', WORKFLOW_NODE_TYPES.SCOPE_NODE),
              {
                id: 'ActionIf-actions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  createElkNode('ActionIf-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE),
                  createElkNode('Increment_variable2'),
                  createElkNode('Increment_variable4'),
                ],
                edges: [
                  createElkEdge('ActionIf-actions-#subgraph', 'Increment_variable2'),
                  createElkEdge('Increment_variable2', 'Increment_variable4'),
                ],
              },
              {
                id: 'ActionIf-elseActions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  createElkNode('ActionIf-elseActions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE),
                  createElkNode('Increment_variable3'),
                ],
                edges: [createElkEdge('ActionIf-elseActions-#subgraph', 'Increment_variable3')],
              },
            ],
            edges: [
              createElkEdge('ActionIf-#header', 'ActionIf-actions-#subgraph'),
              createElkEdge('ActionIf-#header', 'ActionIf-elseActions-#subgraph'),
            ],
          },
          createElkNode('Response'),
        ],
        edges: [
          createElkEdge('manual', 'Initialize_variable'),
          createElkEdge('Initialize_variable', 'Increment_variable'),
          createElkEdge('Increment_variable', 'ActionIf'),
          createElkEdge('ActionIf', 'Response'),
        ],
      };

      expect(convertWorkflowGraphToElkGraph(input)).toEqual(expectedOutput);
    });
  });

  describe('convertElkGraphToReactFlow', () => {
    it('should convert elk graph into a react flow compatible object', () => {
      const input: ElkNode = {
        id: 'root',
        children: [
          { id: 'node1', height: 40, width: 200, x: 10, y: 10 },
          { id: 'node2', height: 40, width: 200, x: 10, y: 10 },
        ],
        edges: [createElkEdge('node1', 'node2')],
        layoutOptions: elkGraphLayoutOptions,
      };

      const expectedOutput: [Node[], Edge[]] = [
        [
          {
            id: 'node1',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            parentNode: undefined,
            position: {
              x: 10,
              y: 10,
            },
            data: {
              label: 'node1',
            },
          },
          {
            id: 'node2',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            parentNode: undefined,
            position: {
              x: 10,
              y: 10,
            },
            data: {
              label: 'node2',
            },
          },
        ],
        [
          {
            id: 'node1-node2',
            type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
            source: 'node1',
            target: 'node2',
            data: {
              elkEdge: createElkEdge('node1', 'node2'),
            },
          },
        ],
      ];
      const output = convertElkGraphToReactFlow(input);
      expect(output).toEqual(expectedOutput);
    });

    it('should convert elk graph into a react flow compatible object with scoped nodes', () => {
      const input: ElkNode = {
        id: 'root',
        layoutOptions: elkGraphLayoutOptions,
        children: [
          { ...createElkNode('manual'), x: 50, y: 100 },
          { ...createElkNode('Increment_variable'), x: 60, y: 80 },
          { ...createElkNode('Initialize_variable'), x: 70, y: 90 },
          {
            id: 'ActionIf',
            layoutOptions: elkGraphLayoutOptions,
            x: 307,
            y: 308,
            children: [
              { ...createElkNode('ActionIf-#header', WORKFLOW_NODE_TYPES.SCOPE_NODE), x: 307, y: 308 },
              {
                id: 'ActionIf-actions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  { ...createElkNode('ActionIf-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE), x: 50, y: 100 },
                  { ...createElkNode('Increment_variable2'), x: 150, y: 200 },
                  { ...createElkNode('Increment_variable4'), x: 300, y: 301 },
                ],
                edges: [
                  createElkEdge('ActionIf-actions-#subgraph', 'Increment_variable2'),
                  createElkEdge('Increment_variable2', 'Increment_variable4'),
                ],
              },
              {
                id: 'ActionIf-elseActions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  { ...createElkNode('ActionIf-elseActions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_NODE), x: 0, y: 0 },
                  { ...createElkNode('Increment_variable3'), x: 302, y: 303 },
                ],
                edges: [createElkEdge('ActionIf-elseActions-#subgraph', 'Increment_variable3')],
              },
            ],
            edges: [
              createElkEdge('ActionIf-#header', 'ActionIf-actions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
              createElkEdge('ActionIf-#header', 'ActionIf-elseActions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
            ],
          },
          {
            id: 'EmptyScope',
            layoutOptions: elkGraphLayoutOptions,
            x: 307,
            y: 308,
            children: [createElkNode('EmptyScope-#header', WORKFLOW_NODE_TYPES.SCOPE_NODE)],
            edges: [],
          },
          { ...createElkNode('Response'), x: 304, y: 305 },
        ],
        edges: [
          createElkEdge('manual', 'Initialize_variable'),
          createElkEdge('Initialize_variable', 'Increment_variable'),
          createElkEdge('Increment_variable', 'ActionIf'),
          createElkEdge('ActionIf', 'EmptyScope'),
          createElkEdge('EmptyScope', 'Response'),
        ],
      };

      const expectedOutput: [Node[], Edge[]] = [
        [
          // ROOT
          {
            id: 'manual',
            position: { x: 50, y: 100 },
            data: { label: 'manual' },
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
          },
          {
            id: 'Increment_variable',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 60, y: 80 },
            data: { label: 'Increment_variable' },
          },
          {
            id: 'Initialize_variable',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 70, y: 90 },
            data: { label: 'Initialize_variable' },
          },
          {
            id: 'ActionIf',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            position: { x: 307, y: 308 },
            data: { label: 'ActionIf' },
          },
          {
            id: 'ActionIf-#header',
            type: WORKFLOW_NODE_TYPES.SCOPE_NODE,
            position: { x: 307, y: 308 },
            data: { label: 'ActionIf-#header' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-actions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-actions' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-actions-#subgraph',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            position: { x: 50, y: 100 },
            data: { label: 'ActionIf-actions-#subgraph' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'Increment_variable2',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 150, y: 200 },
            data: { label: 'Increment_variable2' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'Increment_variable4',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 300, y: 301 },
            data: { label: 'Increment_variable4' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'ActionIf-elseActions',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-elseActions' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-elseActions-#subgraph',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-elseActions-#subgraph' },
            parentNode: 'ActionIf-elseActions',
          },
          {
            id: 'Increment_variable3',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 302, y: 303 },
            data: { label: 'Increment_variable3' },
            parentNode: 'ActionIf-elseActions',
          },
          {
            id: 'EmptyScope',
            type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
            position: { x: 307, y: 308 },
            data: { label: 'EmptyScope' },
          },
          {
            id: 'EmptyScope-#header',
            type: WORKFLOW_NODE_TYPES.SCOPE_NODE,
            position: { x: 0, y: 0 },
            data: { label: 'EmptyScope-#header' },
            parentNode: 'EmptyScope',
          },
          {
            id: 'Response',
            type: WORKFLOW_NODE_TYPES.TEST_NODE,
            position: { x: 304, y: 305 },
            data: { label: 'Response' },
          },
        ],
        [
          createSharedEdge('manual', 'Initialize_variable'),
          createSharedEdge('Initialize_variable', 'Increment_variable'),
          createSharedEdge('Increment_variable', 'ActionIf'),
          createSharedEdge('ActionIf', 'EmptyScope'),
          createSharedEdge('EmptyScope', 'Response'),
          createSharedEdge('ActionIf-#header', 'ActionIf-actions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
          createSharedEdge('ActionIf-#header', 'ActionIf-elseActions-#subgraph', WORKFLOW_EDGE_TYPES.ONLY_EDGE),
          createSharedEdge('ActionIf-actions-#subgraph', 'Increment_variable2'),
          createSharedEdge('Increment_variable2', 'Increment_variable4'),
          createSharedEdge('ActionIf-elseActions-#subgraph', 'Increment_variable3'),
        ],
      ];

      const output = convertElkGraphToReactFlow(input);
      expect(output).toEqual(expectedOutput);
    });
  });

  describe('elkLayout', () => {
    it('layout should be deterministic', async () => {
      const input = {
        id: 'root',
        children: [
          { id: 'manual', height: 40, width: 200 },
          { id: 'Increment_variable', height: 40, width: 200 },
          { id: 'Initialize_variable', height: 40, width: 200 },
          {
            id: 'ActionIf',
            height: 40,
            width: 200,
            children: [
              {
                id: 'ActionIf-actions',
                children: [
                  { id: 'Increment_variable2', height: 40, width: 200 },
                  { id: 'Increment_variable4', height: 40, width: 200 },
                ],
                edges: [createElkEdge('Increment_variable2', 'Increment_variable4')],
              },
              {
                id: 'ActionIf-elseActions',
                children: [createElkNode('Increment_variable3')],
                edges: [],
              },
            ],
          },
          { id: 'Response', height: 40, width: 200 },
        ],
        edges: [
          createElkEdge('manual', 'Initialize_variable'),
          createElkEdge('Initialize_variable', 'Increment_variable'),
          createElkEdge('Increment_variable', 'ActionIf'),
          createElkEdge('ActionIf', 'Response'),
        ],
        layoutOptions: elkGraphLayoutOptions,
      };

      const output = await elkLayout(input);
      expect(output).toMatchSnapshot();
    });
  });
});
