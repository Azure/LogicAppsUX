import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import reducer, {
  changeConnectionMapping,
  initialConnectionsState,
  initializeConnectionReferences,
  initializeConnectionsMappings,
} from '../connection/connectionSlice';
import { setStateAfterUndoRedo } from '../global';
describe('connection slice reducers', () => {
  it('uses the exact new ServiceProvider connection ID tail rather than a connector alias', () => {
    const connectorId = '/serviceProviders/Sftp';
    const connectionId = `${connectorId}/connections/SftpTeamA`;
    const state = reducer(initialConnectionsState, changeConnectionMapping({ nodeId: 'Upload', connectorId, connectionId }));

    expect(state.connectionsMapping.Upload).toBe('SftpTeamA');
    expect(Object.keys(state.connectionReferences)).toEqual(['SftpTeamA']);
    expect(state.connectionReferences.SftpTeamA).toMatchObject({
      api: { id: connectorId },
      connection: { id: connectionId },
      connectionName: 'SftpTeamA',
    });

    const nextState = reducer(
      state,
      changeConnectionMapping({
        nodeId: 'OtherUpload',
        connectorId,
        connectionId: `${connectorId}/connections/sftpteama`,
      })
    );
    expect(nextState.connectionsMapping).toEqual({ Upload: 'SftpTeamA', OtherUpload: 'sftpteama' });
    expect(Object.keys(nextState.connectionReferences)).toEqual(['SftpTeamA', 'sftpteama']);
    expect(nextState.connectionReferences.SftpTeamA).toBe(state.connectionReferences.SftpTeamA);
  });

  it('reuses an existing ServiceProvider reference key without renaming it', () => {
    const connectorId = '/serviceProviders/Sftp';
    const connectionId = `${connectorId}/connections/SftpTeamA`;
    const initial = reducer(
      initialConnectionsState,
      initializeConnectionReferences({
        ExistingAlias: { api: { id: connectorId }, connection: { id: connectionId } },
      })
    );
    const state = reducer(initial, changeConnectionMapping({ nodeId: 'Upload', connectorId, connectionId }));

    expect(state.connectionsMapping.Upload).toBe('ExistingAlias');
    expect(state.connectionReferences).toBe(initial.connectionReferences);
  });

  it('keeps connector-based aliases for new non-ServiceProvider connections', () => {
    const state = reducer(
      initialConnectionsState,
      changeConnectionMapping({
        nodeId: 'Upload',
        connectorId: '/managedApis/Sftp',
        connectionId: '/connections/SftpTeamA',
      })
    );

    expect(state.connectionsMapping.Upload).toBe('Sftp');
    expect(Object.keys(state.connectionReferences)).toEqual(['Sftp']);
  });

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
