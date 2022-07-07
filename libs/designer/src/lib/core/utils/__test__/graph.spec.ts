import { isRootNode } from '../graph';
import { SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';

describe('Graph Utilities', () => {
  const nodesMetadata = {
    manual: { graphId: 'root', isRoot: true },
    firstaction: { graphId: 'root' },
    secondaction: { graphId: 'root' },
    condition: { graphId: 'root' },
    'condition-actions-CONDITIONAL_TRUE': { graphId: 'condition-actions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_TRUE },
    nestedone: { graphId: 'condition-actions', isRoot: true },
    nestedtwo: { graphId: 'condition-actions' },
    'condition-elseActions-CONDITIONAL_FALSE': { graphId: 'condition-elseActions', subgraphType: SUBGRAPH_TYPES.CONDITIONAL_FALSE },
  };

  describe('isRootNode', () => {
    it('should return true for a trigger node in root graph', () => {
      expect(isRootNode('manual', nodesMetadata)).toBeTruthy();
    });

    it('should return false for any action node in root graph', () => {
      expect(isRootNode('firstaction', nodesMetadata)).toBeFalsy();
      expect(isRootNode('secondaction', nodesMetadata)).toBeFalsy();
    });

    it('should return true only for the first node in a nested graph', () => {
      expect(isRootNode('nestedone', nodesMetadata)).toBeTruthy();
      expect(isRootNode('nestedtwo', nodesMetadata)).toBeFalsy();
    });
  });
});
