/* eslint-disable @typescript-eslint/no-unused-vars */
import { deflate, inflate } from 'pako';
import {
  UNDO_REDO_SLICE_NAMES,
  undoablePanelActionTypes,
  type CompressedSliceMap,
  type UndoRedoPartialRootState,
  type UndoRedoSliceName,
} from '../state/undoRedo/undoRedoTypes';
import type { RootState } from '../store';
import isEqual from 'lodash.isequal';
import { updateParameterAndDependencies, type UpdateParameterAndDependenciesPayload } from './parameters/helper';
import constants from '../../common/constants';
import { updateStaticResults } from '../state/operation/operationMetadataSlice';
import type { AnyAction } from '@reduxjs/toolkit';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { replaceId } from '../state/workflow/workflowSlice';
import { transformOperationTitle } from './graph';

// Module-level cache for diff-based compression: tracks slice references and compressed bytes from the last capture.
let previousSliceRefs: Partial<Record<UndoRedoSliceName, unknown>> = {};
let previousCompressedSlices: CompressedSliceMap = {};

/**
 * Strips immutable and transient fields from a slice before serialization.
 * Stripped fields are restored from the live state on decompression.
 */
const stripSliceForSnapshot = (sliceName: UndoRedoSliceName, sliceData: unknown): unknown => {
  switch (sliceName) {
    case 'workflow': {
      const {
        originalDefinition: _od,
        runInstance: _ri,
        collapsedGraphIds: _cg,
        collapsedActionIds: _ca,
        focusedCanvasNodeId: _fn,
        focusElement: _fe,
        focusCollapsedNodeId: _fc,
        ...rest
      } = sliceData as Record<string, unknown>;
      return rest;
    }

    case 'operations': {
      const { loadStatus: _ls, errors: _e, repetitionInfos: _rep, supportedChannels: _sc, ...rest } = sliceData as Record<string, unknown>;
      return rest;
    }

    case 'settings': {
      const { expandedSections: _es, ...rest } = sliceData as Record<string, unknown>;
      return rest;
    }

    case 'connections': {
      const { loading: _l, ...rest } = sliceData as Record<string, unknown>;
      return rest;
    }

    default:
      return sliceData;
  }
};

/**
 * Merges stripped fields back from the current live state onto a decompressed snapshot slice.
 */
const restoreStrippedFields = (sliceName: UndoRedoSliceName, snapshotSlice: unknown, currentSlice: unknown): unknown => {
  switch (sliceName) {
    case 'workflow': {
      const current = currentSlice as Record<string, unknown>;
      return {
        ...(snapshotSlice as Record<string, unknown>),
        originalDefinition: current.originalDefinition,
        runInstance: current.runInstance,
        collapsedGraphIds: current.collapsedGraphIds,
        collapsedActionIds: current.collapsedActionIds,
        focusedCanvasNodeId: current.focusedCanvasNodeId,
        focusElement: current.focusElement,
        focusCollapsedNodeId: current.focusCollapsedNodeId,
      };
    }

    case 'operations': {
      const current = currentSlice as Record<string, unknown>;
      return {
        ...(snapshotSlice as Record<string, unknown>),
        loadStatus: current.loadStatus,
        errors: current.errors,
        repetitionInfos: current.repetitionInfos,
        supportedChannels: current.supportedChannels,
      };
    }

    case 'settings': {
      const current = currentSlice as Record<string, unknown>;
      return {
        ...(snapshotSlice as Record<string, unknown>),
        expandedSections: current.expandedSections,
      };
    }

    case 'connections': {
      const current = currentSlice as Record<string, unknown>;
      return {
        ...(snapshotSlice as Record<string, unknown>),
        loading: current.loading,
      };
    }

    default:
      return snapshotSlice;
  }
};

/**
 * Compresses root state into per-slice compressed data.
 * Uses reference equality (from Immer) to skip unchanged slices and reuses
 * their compressed bytes from the previous capture.
 */
export const getCompressedSlicesFromRootState = (rootState: RootState): CompressedSliceMap => {
  const result: CompressedSliceMap = {};
  let totalUncompressedBytes = 0;
  let totalCompressedBytes = 0;
  let slicesChanged = 0;

  for (const sliceName of UNDO_REDO_SLICE_NAMES) {
    const currentSlice = rootState[sliceName];

    if (currentSlice === undefined) {
      continue;
    }

    if (currentSlice === previousSliceRefs[sliceName] && previousCompressedSlices[sliceName]) {
      result[sliceName] = previousCompressedSlices[sliceName];
    } else {
      const stripped = stripSliceForSnapshot(sliceName, currentSlice);
      const json = JSON.stringify(stripped);
      const compressed = deflate(json);
      result[sliceName] = compressed;
      totalUncompressedBytes += json.length;
      totalCompressedBytes += compressed.byteLength;
      slicesChanged++;
    }
  }

  LoggerService().log({
    level: LogEntryLevel.Verbose,
    area: 'getCompressedSlicesFromRootState',
    message: 'Snapshot compression',
    args: [{ slicesChanged, totalUncompressedBytes, totalCompressedBytes }],
  });

  previousSliceRefs = Object.fromEntries(UNDO_REDO_SLICE_NAMES.map((name) => [name, rootState[name]]));
  previousCompressedSlices = result;

  return result;
};

/**
 * Decompresses per-slice snapshot data back into a full UndoRedoPartialRootState.
 * For missing slices (unchanged at capture time), falls back to the current root state.
 * For slices that had fields stripped, merges the stripped fields from current state.
 */
export const getRootStateFromCompressedSlices = (
  compressedSlices: CompressedSliceMap,
  currentRootState: RootState
): UndoRedoPartialRootState => {
  const result = {} as Record<string, unknown>;

  for (const sliceName of UNDO_REDO_SLICE_NAMES) {
    const compressed = compressedSlices[sliceName];
    if (compressed) {
      const decompressed = JSON.parse(inflate(compressed, { to: 'string' }));
      result[sliceName] = restoreStrippedFields(sliceName, decompressed, currentRootState[sliceName]);
    } else {
      result[sliceName] = currentRootState[sliceName];
    }
  }

  return result as UndoRedoPartialRootState;
};

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
