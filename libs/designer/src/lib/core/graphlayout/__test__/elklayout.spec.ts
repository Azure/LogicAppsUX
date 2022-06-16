import type { WorkflowGraph } from '../../parsers/models/workflowNode';
import { exportForTesting } from '../elklayout';
import type { ElkNode } from 'elkjs/lib/elk-api';
import type { Edge, Node } from 'react-flow-renderer';

const { convertWorkflowGraphToElkGraph, convertElkGraphToReactFlow, elkLayout } = exportForTesting;
describe('elklayout', () => {
  describe('convertWorkflowGraphToElkGraph', () => {
    it('should properly convert a valid WorkflowGraph to an ElkNode', () => {
      const input = {
        id: 'root',
        children: [
          { id: 'node1', height: 0, width: 0 },
          { id: 'node2', height: 0, width: 0 },
        ],
        edges: [{ id: 'node1-node2', source: 'node1', target: 'node2' }],
      };
      const expectedOutput: ElkNode = {
        id: 'root',
        children: [
          { id: 'node1', height: 0, width: 0 },
          { id: 'node2', height: 0, width: 0 },
        ],
        edges: [{ id: 'node1-node2', sources: ['node1'], targets: ['node2'] }],
        layoutOptions: { 'elk.position': '(0, 0)' },
      };

      expect(convertWorkflowGraphToElkGraph(input)).toEqual(expectedOutput);
    });

    it('should properly convert a valid WorkflowGraph with scopes to an ElkNode', () => {
      const input: WorkflowGraph = {
        id: 'root',
        children: [
          { id: 'manual', height: 0, width: 0 },
          { id: 'Increment_variable', height: 0, width: 0 },
          { id: 'Initialize_variable', height: 0, width: 0 },
          {
            id: 'ActionIf',
            height: 0,
            width: 0,
            children: [
              {
                id: 'ActionIf-actions',
                children: [
                  { id: 'Increment_variable2', height: 0, width: 0 },
                  { id: 'Increment_variable4', height: 0, width: 0 },
                ],
                edges: [{ id: 'Increment_variable2-Increment_variable4', source: 'Increment_variable2', target: 'Increment_variable4' }],
              },
              { id: 'ActionIf-elseActions', children: [{ id: 'Increment_variable3', height: 0, width: 0 }], edges: [] },
            ],
          },
          { id: 'Response', height: 0, width: 0 },
        ],
        edges: [
          { id: 'manual-Initialize_variable', source: 'manual', target: 'Initialize_variable' },
          { id: 'Initialize_variable-Increment_variable', source: 'Initialize_variable', target: 'Increment_variable' },
          { id: 'Increment_variable-ActionIf', source: 'Increment_variable', target: 'ActionIf' },
          { id: 'ActionIf-Response', source: 'ActionIf', target: 'Response' },
        ],
      };
      const expectedOutput: ElkNode = {
        id: 'root',
        children: [
          { id: 'manual', height: 0, width: 0 },
          { id: 'Increment_variable', height: 0, width: 0 },
          { id: 'Initialize_variable', height: 0, width: 0 },
          {
            id: 'ActionIf',
            height: 0,
            width: 0,
            children: [
              {
                id: 'ActionIf-actions',
                children: [
                  { id: 'Increment_variable2', height: 0, width: 0 },
                  { id: 'Increment_variable4', height: 0, width: 0 },
                ],
                edges: [
                  { id: 'Increment_variable2-Increment_variable4', sources: ['Increment_variable2'], targets: ['Increment_variable4'] },
                ],
                layoutOptions: { 'elk.position': '(0, 0)' },
              },
              {
                id: 'ActionIf-elseActions',
                children: [{ id: 'Increment_variable3', height: 0, width: 0 }],
                edges: [],
                layoutOptions: { 'elk.position': '(0, 0)' },
              },
            ],
          },
          { id: 'Response', height: 0, width: 0 },
        ],
        edges: [
          { id: 'manual-Initialize_variable', sources: ['manual'], targets: ['Initialize_variable'] },
          { id: 'Initialize_variable-Increment_variable', sources: ['Initialize_variable'], targets: ['Increment_variable'] },
          { id: 'Increment_variable-ActionIf', sources: ['Increment_variable'], targets: ['ActionIf'] },
          { id: 'ActionIf-Response', sources: ['ActionIf'], targets: ['Response'] },
        ],
        layoutOptions: { 'elk.position': '(0, 0)' },
      };

      expect(convertWorkflowGraphToElkGraph(input)).toEqual(expectedOutput);
    });
  });

  describe('convertElkGraphToReactFlow', () => {
    it('should convert elk graph into a react flow compatible object', () => {
      const input: ElkNode = {
        id: 'root',
        children: [
          { id: 'node1', height: 100, width: 100, x: 10, y: 10 },
          { id: 'node2', height: 100, width: 100, x: 10, y: 10 },
        ],
        edges: [{ id: 'node1-node2', sources: ['node1'], targets: ['node2'] }],
      };

      const expectedOutput: [Node[], Edge[]] = [
        [
          {
            data: {
              label: 'node1',
            },
            id: 'node1',
            parentNode: undefined,
            position: {
              x: 10,
              y: 10,
            },
            style: undefined,
            type: 'testNode',
          },
          {
            data: {
              label: 'node2',
            },
            id: 'node2',
            parentNode: undefined,
            position: {
              x: 10,
              y: 10,
            },
            style: undefined,
            type: 'testNode',
          },
        ],
        [
          {
            data: {
              elkEdge: {
                id: 'node1-node2',
                sources: ['node1'],
                targets: ['node2'],
              },
            },
            id: 'node1-node2',
            source: 'node1',
            target: 'node2',
            type: 'buttonEdge',
          },
        ],
      ];
      const output = convertElkGraphToReactFlow(input);
      expect(output).toEqual(expectedOutput);
    });

    it('should convert elk graph into a react flow compatible object with scoped nodes', () => {
      const input: ElkNode = {
        id: 'root',
        children: [
          { id: 'manual', height: 0, width: 0, x: 50, y: 100 },
          { id: 'Increment_variable', height: 0, width: 0, x: 60, y: 80 },
          { id: 'Initialize_variable', height: 0, width: 0, x: 70, y: 90 },
          {
            id: 'ActionIf',
            height: 0,
            width: 0,
            x: 307,
            y: 308,
            children: [
              {
                id: 'ActionIf-actions',
                children: [
                  { id: 'Increment_variable2', height: 0, width: 0, x: 150, y: 200 },
                  { id: 'Increment_variable4', height: 0, width: 0, x: 300, y: 301 },
                ],
                edges: [
                  { id: 'Increment_variable2-Increment_variable4', sources: ['Increment_variable2'], targets: ['Increment_variable4'] },
                ],
              },
              { id: 'ActionIf-elseActions', children: [{ id: 'Increment_variable3', height: 0, width: 0, x: 302, y: 303 }], edges: [] },
            ],
          },
          {
            id: 'EmptyScope',
            height: 0,
            width: 0,
            x: 307,
            y: 308,
            children: [
              {
                id: 'EmptyScope-actions',
                children: [{ id: 'EmptyScope-actions-emptyNode', height: 0, width: 0, x: 0, y: 0 }],
                edges: [],
              },
            ],
          },
          { id: 'Response', height: 0, width: 0, x: 304, y: 305 },
        ],
        edges: [
          { id: 'manual-Initialize_variable', sources: ['manual'], targets: ['Initialize_variable'] },
          { id: 'Initialize_variable-Increment_variable', sources: ['Initialize_variable'], targets: ['Increment_variable'] },
          { id: 'Increment_variable-ActionIf', sources: ['Increment_variable'], targets: ['ActionIf'] },
          { id: 'ActionIf-EmptyScope', sources: ['ActionIf'], targets: ['EmptyScope'] },
          { id: 'EmptyScope-Response', sources: ['EmptyScope'], targets: ['Response'] },
        ],
      };

      const expectedOutput: [Node[], Edge[]] = [
        [
          { id: 'manual', position: { x: 50, y: 100 }, data: { label: 'manual' }, type: 'testNode' },
          { id: 'Increment_variable', position: { x: 60, y: 80 }, data: { label: 'Increment_variable' }, type: 'testNode' },
          { id: 'Initialize_variable', position: { x: 70, y: 90 }, data: { label: 'Initialize_variable' }, type: 'testNode' },
          { id: 'ActionIf', position: { x: 307, y: 308 }, data: { label: 'ActionIf' }, type: 'graphNode', style: { height: 0, width: 0 } },
          {
            id: 'ActionIf-actions',
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-actions' },
            type: 'graphNode',
            parentNode: 'ActionIf',
            style: {},
          },
          {
            id: 'Increment_variable2',
            position: { x: 150, y: 200 },
            data: { label: 'Increment_variable2' },
            parentNode: 'ActionIf-actions',
            type: 'testNode',
          },
          {
            id: 'Increment_variable4',
            position: { x: 300, y: 301 },
            data: { label: 'Increment_variable4' },
            parentNode: 'ActionIf-actions',
            type: 'testNode',
          },
          {
            id: 'ActionIf-elseActions',
            position: { x: 0, y: 0 },
            data: { label: 'ActionIf-elseActions' },
            type: 'graphNode',
            parentNode: 'ActionIf',
            style: {},
          },
          {
            id: 'Increment_variable3',
            position: { x: 302, y: 303 },
            data: { label: 'Increment_variable3' },
            parentNode: 'ActionIf-elseActions',
            type: 'testNode',
          },
          {
            id: 'EmptyScope',
            position: { x: 307, y: 308 },
            data: { label: 'EmptyScope' },
            type: 'graphNode',
            style: { height: 0, width: 0 },
          },
          {
            id: 'EmptyScope-actions',
            position: { x: 0, y: 0 },
            data: { label: 'EmptyScope-actions' },
            type: 'graphNode',
            parentNode: 'EmptyScope',
            style: {},
          },
          {
            id: 'EmptyScope-actions-emptyNode',
            position: { x: 0, y: 0 },
            data: { label: 'EmptyScope-actions-emptyNode' },
            parentNode: 'EmptyScope-actions',
            type: 'testNode',
          },
          { id: 'Response', position: { x: 304, y: 305 }, data: { label: 'Response' }, type: 'testNode' },
        ],
        [
          {
            id: 'manual-Initialize_variable',
            target: 'Initialize_variable',
            source: 'manual',
            type: 'buttonEdge',
            data: { elkEdge: { id: 'manual-Initialize_variable', sources: ['manual'], targets: ['Initialize_variable'] } },
          },
          {
            id: 'Initialize_variable-Increment_variable',
            target: 'Increment_variable',
            source: 'Initialize_variable',
            type: 'buttonEdge',
            data: {
              elkEdge: { id: 'Initialize_variable-Increment_variable', sources: ['Initialize_variable'], targets: ['Increment_variable'] },
            },
          },
          {
            id: 'Increment_variable-ActionIf',
            target: 'ActionIf',
            source: 'Increment_variable',
            type: 'buttonEdge',
            data: { elkEdge: { id: 'Increment_variable-ActionIf', sources: ['Increment_variable'], targets: ['ActionIf'] } },
          },
          {
            id: 'ActionIf-EmptyScope',
            target: 'EmptyScope',
            source: 'ActionIf',
            type: 'buttonEdge',
            data: { elkEdge: { id: 'ActionIf-EmptyScope', sources: ['ActionIf'], targets: ['EmptyScope'] } },
          },
          {
            id: 'EmptyScope-Response',
            target: 'Response',
            source: 'EmptyScope',
            type: 'buttonEdge',
            data: { elkEdge: { id: 'EmptyScope-Response', sources: ['EmptyScope'], targets: ['Response'] } },
          },
          {
            id: 'Increment_variable2-Increment_variable4',
            target: 'Increment_variable4',
            source: 'Increment_variable2',
            type: 'buttonEdge',
            data: {
              elkEdge: {
                id: 'Increment_variable2-Increment_variable4',
                sources: ['Increment_variable2'],
                targets: ['Increment_variable4'],
              },
            },
          },
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
          { id: 'manual', height: 0, width: 0 },
          { id: 'Increment_variable', height: 0, width: 0 },
          { id: 'Initialize_variable', height: 0, width: 0 },
          {
            id: 'ActionIf',
            height: 0,
            width: 0,
            children: [
              {
                id: 'ActionIf-actions',
                children: [
                  { id: 'Increment_variable2', height: 0, width: 0 },
                  { id: 'Increment_variable4', height: 0, width: 0 },
                ],
                edges: [
                  { id: 'Increment_variable2-Increment_variable4', sources: ['Increment_variable2'], targets: ['Increment_variable4'] },
                ],
              },
              { id: 'ActionIf-elseActions', children: [{ id: 'Increment_variable3', height: 0, width: 0 }], edges: [] },
            ],
          },
          { id: 'Response', height: 0, width: 0 },
        ],
        edges: [
          { id: 'manual-Initialize_variable', sources: ['manual'], targets: ['Initialize_variable'] },
          { id: 'Initialize_variable-Increment_variable', sources: ['Initialize_variable'], targets: ['Increment_variable'] },
          { id: 'Increment_variable-ActionIf', sources: ['Increment_variable'], targets: ['ActionIf'] },
          { id: 'ActionIf-Response', sources: ['ActionIf'], targets: ['Response'] },
        ],
      };

      const output = await elkLayout(input);
      expect(output).toMatchSnapshot();
    });
  });
});
