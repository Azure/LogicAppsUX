import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import reducer, { initialConnectionsState, initializeConnectionsMappings } from '../connection/connectionSlice';
import { setStateAfterUndoRedo } from '../global';
describe('connection slice reducers', () => {
  it('should set node mappings when initialised', async () => {
    const connectionsMapping: Record<string, string> = {
      first: 'first',
      second: 'second',
    };
    const state = reducer(initialConnectionsState, initializeConnectionsMappings(connectionsMapping));

    expect(state.connectionsMapping).toEqual(connectionsMapping);
  });

  it('should set connections state on undo redo', async () => {
    const connectionsMapping: Record<string, string> = {
      first: 'first',
      second: 'second',
    };

    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const state = reducer(
      initialConnectionsState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        connections: {
          connectionReferences: undoRedoPartialRootState.connections.connectionReferences,
          connectionsMapping,
        },
      })
    );

    expect(state.connectionsMapping).toEqual(connectionsMapping);
  });
});
