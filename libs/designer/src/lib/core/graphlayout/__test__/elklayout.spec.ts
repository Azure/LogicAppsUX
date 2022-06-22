import type { WorkflowEdge, WorkflowEdgeType, WorkflowNode, WorkflowNodeType } from '../../parsers/models/workflowNode';
import { exportForTesting } from '../elklayout';
import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api';
import type { Edge, Node } from 'react-flow-renderer';

const createWorkflowNode = (id: string, type?: WorkflowNodeType) => ({
  id,
  width: 200,
  height: 40,
  type: type ?? 'testNode',
});

const createElkNode = (id: string, type?: WorkflowNodeType) => ({
  id,
  width: 200,
  height: 40,
  layoutOptions: {
    nodeType: type ?? 'testNode',
  },
});

const createWorkflowEdge = (source: string, target: string, type?: WorkflowEdgeType): WorkflowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: type ?? 'buttonEdge',
});

const createElkEdge = (source: string, target: string, type?: WorkflowEdgeType): ElkExtendedEdge => ({
  id: `${source}-${target}`,
  sources: [source],
  targets: [target],
  layoutOptions: {
    edgeType: type ?? 'buttonEdge',
  },
});

const createSharedEdge = (source: string, target: string, type?: WorkflowEdgeType) => ({
  ...createWorkflowEdge(source, target, type),
  data: { elkEdge: createElkEdge(source, target, type) },
});

const elkGraphLayoutOptions = {
  'elk.padding': '[top=0,left=16,bottom=48,right=16]',
  'elk.position': '(0, 0)',
  nodeType: 'graphNode',
};

const { convertWorkflowGraphToElkGraph, convertElkGraphToReactFlow, elkLayout } = exportForTesting;
describe('elklayout', () => {
  describe('convertWorkflowGraphToElkGraph', () => {
    it('should properly convert a valid WorkflowGraph to an ElkNode', () => {
      const input: WorkflowNode = {
        id: 'root',
        type: 'graphNode',
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
        type: 'graphNode',
        children: [
          createWorkflowNode('manual'),
          createWorkflowNode('Increment_variable'),
          createWorkflowNode('Initialize_variable'),
          {
            id: 'ActionIf',
            type: 'graphNode',
            children: [
              createWorkflowNode('ActionIf-#scopeHeader', 'scopeHeader'),
              {
                id: 'ActionIf-actions',
                children: [
                  createWorkflowNode('ActionIf-actions-#subgraphHeader', 'subgraphHeader'),
                  createWorkflowNode('Increment_variable2'),
                  createWorkflowNode('Increment_variable4'),
                ],
                edges: [
                  createWorkflowEdge('ActionIf-actions-#subgraphHeader', 'Increment_variable2'),
                  createWorkflowEdge('Increment_variable2', 'Increment_variable4'),
                ],
                type: 'graphNode',
              },
              {
                id: 'ActionIf-elseActions',
                children: [
                  createWorkflowNode('ActionIf-elseActions-#subgraphHeader', 'subgraphHeader'),
                  createWorkflowNode('Increment_variable3'),
                ],
                edges: [createWorkflowEdge('ActionIf-elseActions-#subgraphHeader', 'Increment_variable3')],
                type: 'graphNode',
              },
            ],
            edges: [
              createWorkflowEdge('ActionIf-#scopeHeader', 'ActionIf-actions-#subgraphHeader'),
              createWorkflowEdge('ActionIf-#scopeHeader', 'ActionIf-elseActions-#subgraphHeader'),
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
              createElkNode('ActionIf-#scopeHeader', 'scopeHeader'),
              {
                id: 'ActionIf-actions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  createElkNode('ActionIf-actions-#subgraphHeader', 'subgraphHeader'),
                  createElkNode('Increment_variable2'),
                  createElkNode('Increment_variable4'),
                ],
                edges: [
                  createElkEdge('ActionIf-actions-#subgraphHeader', 'Increment_variable2'),
                  createElkEdge('Increment_variable2', 'Increment_variable4'),
                ],
              },
              {
                id: 'ActionIf-elseActions',
                layoutOptions: elkGraphLayoutOptions,
                children: [createElkNode('ActionIf-elseActions-#subgraphHeader', 'subgraphHeader'), createElkNode('Increment_variable3')],
                edges: [createElkEdge('ActionIf-elseActions-#subgraphHeader', 'Increment_variable3')],
              },
            ],
            edges: [
              createElkEdge('ActionIf-#scopeHeader', 'ActionIf-actions-#subgraphHeader'),
              createElkEdge('ActionIf-#scopeHeader', 'ActionIf-elseActions-#subgraphHeader'),
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
            type: 'testNode',
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
            type: 'testNode',
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
            type: 'buttonEdge',
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
              { ...createElkNode('ActionIf-#scopeHeader', 'scopeHeader'), x: 307, y: 308 },
              {
                id: 'ActionIf-actions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  { ...createElkNode('ActionIf-actions-#subgraphHeader', 'subgraphHeader'), x: 50, y: 100 },
                  { ...createElkNode('Increment_variable2'), x: 150, y: 200 },
                  { ...createElkNode('Increment_variable4'), x: 300, y: 301 },
                ],
                edges: [
                  createElkEdge('ActionIf-actions-#subgraphHeader', 'Increment_variable2'),
                  createElkEdge('Increment_variable2', 'Increment_variable4'),
                ],
              },
              {
                id: 'ActionIf-elseActions',
                layoutOptions: elkGraphLayoutOptions,
                children: [
                  { ...createElkNode('ActionIf-elseActions-#subgraphHeader', 'subgraphHeader'), x: 0, y: 0 },
                  { ...createElkNode('Increment_variable3'), x: 302, y: 303 },
                ],
                edges: [createElkEdge('ActionIf-elseActions-#subgraphHeader', 'Increment_variable3')],
              },
            ],
            edges: [
              createElkEdge('ActionIf-#scopeHeader', 'ActionIf-actions-#subgraphHeader', 'onlyEdge'),
              createElkEdge('ActionIf-#scopeHeader', 'ActionIf-elseActions-#subgraphHeader', 'onlyEdge'),
            ],
          },
          {
            id: 'EmptyScope',
            layoutOptions: elkGraphLayoutOptions,
            x: 307,
            y: 308,
            children: [createElkNode('EmptyScope-#scopeHeader', 'scopeHeader')],
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
            type: 'testNode',
          },
          {
            id: 'Increment_variable',
            type: 'testNode',
            position: { x: 60, y: 80 },
            data: { label: 'Increment_variable' },
          },
          {
            id: 'Initialize_variable',
            type: 'testNode',
            position: { x: 70, y: 90 },
            data: { label: 'Initialize_variable' },
          },
          {
            id: 'ActionIf',
            type: 'graphNode',
            position: { x: 307, y: 308 },
            data: { label: 'ActionIf' },
          },
          {
            id: 'ActionIf-#scopeHeader',
            type: 'scopeHeader',
            position: { x: 307, y: 308 },
            data: { label: 'ActionIf-#scopeHeader' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-actions',
            type: 'graphNode',
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-actions' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-actions-#subgraphHeader',
            type: 'subgraphHeader',
            position: { x: 50, y: 100 },
            data: { label: 'ActionIf-actions-#subgraphHeader' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'Increment_variable2',
            type: 'testNode',
            position: { x: 150, y: 200 },
            data: { label: 'Increment_variable2' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'Increment_variable4',
            type: 'testNode',
            position: { x: 300, y: 301 },
            data: { label: 'Increment_variable4' },
            parentNode: 'ActionIf-actions',
          },
          {
            id: 'ActionIf-elseActions',
            type: 'graphNode',
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-elseActions' },
            parentNode: 'ActionIf',
          },
          {
            id: 'ActionIf-elseActions-#subgraphHeader',
            type: 'subgraphHeader',
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-elseActions-#subgraphHeader' },
            parentNode: 'ActionIf-elseActions',
          },
          {
            id: 'Increment_variable3',
            type: 'testNode',
            position: { x: 302, y: 303 },
            data: { label: 'Increment_variable3' },
            parentNode: 'ActionIf-elseActions',
          },
          {
            id: 'EmptyScope',
            type: 'graphNode',
            position: { x: 307, y: 308 },
            data: { label: 'EmptyScope' },
          },
          {
            id: 'EmptyScope-#scopeHeader',
            type: 'scopeHeader',
            position: { x: 0, y: 0 },
            data: { label: 'EmptyScope-#scopeHeader' },
            parentNode: 'EmptyScope',
          },
          {
            id: 'Response',
            type: 'testNode',
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
          createSharedEdge('ActionIf-#scopeHeader', 'ActionIf-actions-#subgraphHeader', 'onlyEdge'),
          createSharedEdge('ActionIf-#scopeHeader', 'ActionIf-elseActions-#subgraphHeader', 'onlyEdge'),
          createSharedEdge('ActionIf-actions-#subgraphHeader', 'Increment_variable2'),
          createSharedEdge('Increment_variable2', 'Increment_variable4'),
          createSharedEdge('ActionIf-elseActions-#subgraphHeader', 'Increment_variable3'),
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
