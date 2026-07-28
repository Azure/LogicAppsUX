import { describe, it, expect, vi, beforeEach } from 'vitest';
import { designerSlice, initializeDesigner, selectRun } from '../DesignerSlice';

const reducer = designerSlice.reducer;

describe('DesignerSlice', () => {
  describe('selectRun', () => {
    it('sets runId and isMonitoringView to true', () => {
      const initialState = reducer(undefined, { type: '@@INIT' });
      expect(initialState.runId).toBe('');
      expect(initialState.isMonitoringView).toBe(false);

      const nextState = reducer(initialState, selectRun('08585123456789012345678901234CU01'));

      expect(nextState.runId).toBe('08585123456789012345678901234CU01');
      expect(nextState.isMonitoringView).toBe(true);
    });

    it('updates runId when called multiple times', () => {
      const initialState = reducer(undefined, { type: '@@INIT' });
      const state1 = reducer(initialState, selectRun('run-1'));
      const state2 = reducer(state1, selectRun('run-2'));

      expect(state2.runId).toBe('run-2');
      expect(state2.isMonitoringView).toBe(true);
    });

    it('preserves other state when selecting a run', () => {
      const initialState = reducer(undefined, { type: '@@INIT' });
      const initializedState = reducer(
        initialState,
        initializeDesigner({
          panelMetadata: { workflowName: 'myWorkflow' },
          connectionData: { managedApiConnections: {} },
          baseUrl: 'http://localhost:7071',
          workflowRuntimeBaseUrl: 'http://localhost:8080',
          apiVersion: '2019-10-01',
          apiHubServiceDetails: {},
          readOnly: false,
          isLocal: true,
          isMonitoringView: false,
          runId: '',
          oauthRedirectUrl: '',
          hostVersion: '1.0.0',
        })
      );

      const nextState = reducer(initializedState, selectRun('my-run-id'));

      expect(nextState.runId).toBe('my-run-id');
      expect(nextState.isMonitoringView).toBe(true);
      expect(nextState.baseUrl).toBe('http://localhost:7071');
      expect(nextState.isLocal).toBe(true);
      expect(nextState.panelMetaData?.workflowName).toBe('myWorkflow');
    });
  });
});
