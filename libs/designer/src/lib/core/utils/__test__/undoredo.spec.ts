import { describe, expect, it } from 'vitest';
import { getMockedInitialRootState } from '../../../__test__/mock-root-state';
import {
  getCompressedStateFromRootState,
  getEditedPanelNode,
  getEditedPanelTab,
  getRootStateFromCompressedState,
  shouldSkipSavingStateToHistory,
} from '../undoredo';
import { updateParameterAndDependencies } from '../parameters/helper';
import constants from '../../../common/constants';
import { updateStaticResults } from '../../state/operation/operationMetadataSlice';
import { undoablePanelActionTypes } from '../../state/undoRedo/undoRedoTypes';

describe('undo redo utils', () => {
  it('should compress and decompress root state', () => {
    const mockedInitialRootState = getMockedInitialRootState();
    const compressedState = getCompressedStateFromRootState(mockedInitialRootState);
    const decompressedState = getRootStateFromCompressedState(compressedState);
    const initialRootStateSize = Buffer.from(JSON.stringify(mockedInitialRootState)).byteLength;
    expect(compressedState.byteLength).toBeLessThan(initialRootStateSize);
    expect(decompressedState).toEqual({
      connections: mockedInitialRootState.connections,
      customCode: mockedInitialRootState.customCode,
      operations: mockedInitialRootState.operations,
      panel: mockedInitialRootState.panel,
      settings: mockedInitialRootState.settings,
      staticResults: mockedInitialRootState.staticResults,
      tokens: mockedInitialRootState.tokens,
      workflow: mockedInitialRootState.workflow,
      workflowParameters: mockedInitialRootState.workflowParameters,
    });
  });

  it.each([
    [updateParameterAndDependencies.pending.type, constants.PANEL_TAB_NAMES.PARAMETERS],
    [updateStaticResults.type, constants.PANEL_TAB_NAMES.TESTING],
    ['mockActionType', undefined],
  ])('should return edited panel tab based on action type', (input, expected) => {
    expect(getEditedPanelTab(input)).toBe(expected);
  });

  it.each(undoablePanelActionTypes)('should return edited panel node if action is panel related', (input) => {
    let mockedInitialRootState = getMockedInitialRootState();
    mockedInitialRootState = {
      ...mockedInitialRootState,
      panel: {
        ...mockedInitialRootState.panel,
        operationContent: {
          ...mockedInitialRootState.panel.operationContent,
          selectedNodeId: 'Initialize_Variable',
        },
      },
    };
    expect(getEditedPanelNode(input, mockedInitialRootState)).toBe('Initialize_Variable');
  });

  it('should return undefined if action is not panel related', (input) => {
    let mockedInitialRootState = getMockedInitialRootState();
    mockedInitialRootState = {
      ...mockedInitialRootState,
      panel: {
        ...mockedInitialRootState.panel,
        operationContent: {
          ...mockedInitialRootState.panel.operationContent,
          selectedNodeId: 'Initialize_Variable',
        },
      },
    };
    expect(getEditedPanelNode('mockActionType', mockedInitialRootState)).toBe(undefined);
  });

  it.each([
    [-1, true],
    [0, true],
    [5, false],
  ])('should skip saving state to history based on limit', (input, expected) => {
    expect(shouldSkipSavingStateToHistory({ type: 'mockActionType' }, input)).toBe(expected);
  });

  it('should skip saving state if parameter values have not changed for parameter update action', () => {
    expect(shouldSkipSavingStateToHistory(getAction(true), 5)).toBe(true);
    expect(shouldSkipSavingStateToHistory(getAction(false), 5)).toBe(false);
    expect(shouldSkipSavingStateToHistory({ type: 'addNode' }, 5)).toBe(false);
  });
});

const getAction = (noChange: boolean) => {
  return {
    type: updateParameterAndDependencies.pending.type,
    meta: {
      arg: {
        nodeId: 'Terminate',
        groupId: 'default',
        parameterId: '67563CA0-B770-497F-8BB1-628021D666FF',
        properties: {
          value: [
            {
              id: '191111B9-4096-4829-A404-5ADB0B97F6E4',
              type: 'literal',
              value: noChange ? 'Failed' : 'Succeeded',
            },
          ],
        },
        isTrigger: false,
        operationInfo: {
          connectorId: 'connectionProviders/control',
          operationId: 'terminate',
          type: 'Terminate',
        },
        connectionReference: {
          api: {
            id: 'apiId',
          },
          connection: {
            id: 'connectionId',
          },
        },
        nodeInputs: {
          parameterGroups: {
            default: {
              id: 'default',
              description: '',
              parameters: [
                {
                  id: '67563CA0-B770-497F-8BB1-628021D666FF',
                  info: {
                    isDynamic: false,
                  },
                  label: 'Status',
                  parameterKey: 'inputs.$.runStatus',
                  parameterName: 'runStatus',
                  required: true,
                  type: 'string',
                  value: [
                    {
                      id: '191111B9-4096-4829-A404-5ADB0B97F6E4',
                      type: 'literal',
                      value: 'Failed',
                    },
                  ],
                },
              ],
            },
          },
        },
        dependencies: {
          inputs: {},
          outputs: {},
        },
      },
    },
  };
};
