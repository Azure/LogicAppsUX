import type { ElkNode } from 'elkjs/lib/elk-api';
import type { WorkflowGraph } from '../../parsers/models/workflowNode';
import { convertWorkflowGraphToElkGraph } from '../elklayout';

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

      expect(convertWorkflowGraphToElkGraph(input)).toEqual(expectedOutput);
    });
  });
});
