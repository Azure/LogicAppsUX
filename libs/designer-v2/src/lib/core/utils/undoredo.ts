import { deflate, inflate } from 'pako';
import { undoablePanelActionTypes, type UndoRedoPartialRootState } from '../state/undoRedo/undoRedoTypes';
import type { RootState } from '../store';
import isEqual from 'lodash.isequal';
import { updateParameterAndDependencies, type UpdateParameterAndDependenciesPayload } from './parameters/helper';
import constants from '../../common/constants';
import { updateStaticResults } from '../state/operation/operationMetadataSlice';
import type { AnyAction } from '@reduxjs/toolkit';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { replaceId } from '../state/workflow/workflowSlice';
import { transformOperationTitle } from './graph';

export const getCompressedStateFromRootState = (rootState: RootState): Uint8Array => {
  const partialRootState: UndoRedoPartialRootState = {
    connections: rootState.connections,
    customCode: rootState.customCode,
    operations: rootState.operations,
    panel: rootState.panel,
    settings: rootState.settings,
    staticResults: rootState.staticResults,
    tokens: rootState.tokens,
    workflow: rootState.workflow,
    workflowParameters: rootState.workflowParameters,
  };

  const stringifiedPartialRootState = JSON.stringify(partialRootState);
  const compressedState = deflate(stringifiedPartialRootState);

  LoggerService().log({
    level: LogEntryLevel.Verbose,
    area: 'getCompressedStateFromRootState',
    message: 'Compression size',
    args: [
      {
        partialRootStateSize: Buffer.from(stringifiedPartialRootState).byteLength,
        compressedStateSize: Buffer.from(compressedState).byteLength,
      },
    ],
  });

  return compressedState;
};

export const getRootStateFromCompressedState = (compressedState: Uint8Array): UndoRedoPartialRootState =>
  JSON.parse(inflate(compressedState, { to: 'string' })) as UndoRedoPartialRootState;

export const getEditedPanelTab = (actionType: string): string | undefined => {
  switch (actionType) {
    case updateParameterAndDependencies.pending.type:
      return constants.PANEL_TAB_NAMES.PARAMETERS;
    case updateStaticResults.type:
      return constants.PANEL_TAB_NAMES.TESTING;
    default:
      return undefined;
  }
};

export const getEditedPanelNode = (actionType: string, rootState: RootState): string | undefined => {
  if (undoablePanelActionTypes.includes(actionType)) {
    return rootState.panel.operationContent.selectedNodeId;
  }
  return undefined;
};

export const shouldSkipSavingStateToHistory = (
  action: AnyAction,
  stateHistoryLimit: number,
  idReplacements: Record<string, string>
): boolean => {
  // Skip saving state if state history limit is less than 1
  if (stateHistoryLimit < 1) {
    return true;
  }

  // For parameter update, store state only when the value for parameter has changed.
  // Other parameter fields such as validation can change on non-user actions too resulting in extra stored states.
  if (action.type === updateParameterAndDependencies.pending.type && !haveInputParametersChangedValue(action.meta.arg)) {
    return true;
  }

  // Skip saving state if action rename results in same name/id
  if (action.type === replaceId.type) {
    const previousId = idReplacements[action.payload.originalId];
    const newId = transformOperationTitle(action.payload.newId);
    return previousId === newId ? true : false;
  }

  return false;
};

const haveInputParametersChangedValue = (actionPayload: UpdateParameterAndDependenciesPayload): boolean => {
  const { groupId, parameterId, properties, nodeInputs, skipStateSave = false } = actionPayload;

  if (skipStateSave) {
    return false;
  }

  const parameters = nodeInputs.parameterGroups?.[groupId]?.parameters ?? [];
  const index = parameters.findIndex((parameter) => parameter.id === parameterId);
  if (index > -1) {
    const parameter = parameters?.[index];
    if (properties.value && !isEqual(parameter.value, properties.value)) {
      return true;
    }
    if (properties.editorViewModel && !isEqual(parameter.editorViewModel, properties.editorViewModel)) {
      return true;
    }
  }
  return false;
};
