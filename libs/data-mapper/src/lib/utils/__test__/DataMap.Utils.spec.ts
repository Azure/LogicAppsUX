import { mockConnectionsWithTwoConnections } from '../../models/__mocks__';
import { getEdgeForTarget, hasEventualSource, hasEventualTarget } from '../DataMap.Utils';

describe('Data Map utils', () => {
  const targetNodeId = 'Average-5EB6992F-9D29-4657-9A8E-93FB4AF79393';

  it('determines if a node has a connection to a target', () => {
    expect(hasEventualTarget(targetNodeId, mockConnectionsWithTwoConnections)).toEqual(true);
    expect(hasEventualTarget('source-/ns0:Root/DirectTranslation/EmployeeID', mockConnectionsWithTwoConnections)).toEqual(true);
  });

  it('determines if a node does not have a connection to a target', () => {
    expect(hasEventualTarget('Average-5EB6992F-9D29-4657-9A8E-93FB4AF79392', mockConnectionsWithTwoConnections)).toEqual(false); // incorrect ID
  });

  it('gets edge for target node', () => {
    expect(getEdgeForTarget(mockConnectionsWithTwoConnections, targetNodeId)?.destination.reactFlowKey).toEqual(targetNodeId);
  });

  it('returns undefined if node is not a destation', () => {
    expect(getEdgeForTarget(mockConnectionsWithTwoConnections, targetNodeId + 'a')?.destination.reactFlowKey).toBeUndefined();
  });

  it('determines if a node has a connection to a source', () => {
    expect(hasEventualSource(targetNodeId, mockConnectionsWithTwoConnections)).toEqual(true);
    expect(hasEventualTarget('source-/ns0:Root/DirectTranslation/EmployeeID', mockConnectionsWithTwoConnections)).toEqual(true);
  });

  it('determines if a node does not have a connection to a source', () => {
    expect(hasEventualSource(targetNodeId + '1', mockConnectionsWithTwoConnections)).toEqual(false);
    expect(hasEventualTarget('source-/ns0:Root/DirectTranslation/EmployeeIDZ', mockConnectionsWithTwoConnections)).toEqual(false);
  });
});
