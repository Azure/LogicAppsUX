import { isRootNode } from '../graph';

describe('Graph Utilities', () => {
  const graph = {
    id: 'root',
    children: [
      { id: 'manual', height: 0, width: 0 },
      { id: 'firstaction', height: 0, width: 0 },
      { id: 'secondaction', height: 0, width: 0 },
      {
        id: 'condition',
        height: 0,
        width: 0,
        children: [
          {
            id: 'condition-actions',
            children: [
              { id: 'condition-actions-CONDITIONAL_TRUE', height: 0, width: 0 },
              { id: 'nestedone', height: 0, width: 0 },
              { id: 'nestedtwo', height: 0, width: 0 },
            ],
            edges: [
              { id: 'condition-actions-CONDITIONAL-TRUE-nestedone', source: 'condition-actions-CONDITIONAL-TRUE', target: 'nestedone' },
              { id: 'nestedone-nestedtwo', source: 'nestedone', target: 'nestedtwo' },
            ],
          },
          {
            id: 'condition-elseactions',
            children: [{ id: 'condition-elseactions-CONDITIONAL_FALSE', height: 0, width: 0 }],
            edges: [],
          },
        ],
      },
    ],
    edges: [
      { id: 'manual-firstaction', source: 'manual', target: 'firstaction' },
      { id: 'firstaction-secondaction', source: 'firstaction', target: 'secondaction' },
      { id: 'secondaction-condition', source: 'secondaction', target: 'condition' },
    ],
  };
  const nodesMetadata = {
    manual: { graphId: 'root' },
    firstaction: { graphId: 'root' },
    secondaction: { graphId: 'root' },
    condition: { graphId: 'root' },
    'condition-actions-CONDITIONAL_TRUE': { graphId: 'condition-actions', subgraphType: 'CONDITIONAL_TRUE' },
    nestedone: { graphId: 'condition-actions' },
    nestedtwo: { graphId: 'condition-actions' },
    'condition-elseactions-CONDITIONAL_FALSE': { graphId: 'condition-elseactions', subgraphType: 'CONDITIONAL_FALSE' },
  };

  describe('isRootNode', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isRootNode(graph, 'manual', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph', () => {
      expect(isRootNode(graph, 'secondaction', nodesMetadata)).toBeFalsy();
    });

    it('should return false for any action node in any other nested graph', () => {
      expect(isRootNode(graph, 'nestedone', nodesMetadata)).toBeFalsy();
      expect(isRootNode(graph, 'nestedtwo', nodesMetadata)).toBeFalsy();
    });
  });
});
