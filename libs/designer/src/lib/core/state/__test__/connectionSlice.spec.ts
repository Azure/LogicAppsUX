import reducer, { initialConnectionsState, initializeConnectionsMappings } from '../connection/connectionSlice';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('connection slice reducers', () => {
  it('should set node mappings when initialised', async () => {
    const connectionsMapping: Record<string, string> = {
      first: 'first',
      second: 'second',
    };
    const state = reducer(initialConnectionsState, initializeConnectionsMappings(connectionsMapping));

    expect(state.connectionsMapping).toEqual(connectionsMapping);
  });
});
