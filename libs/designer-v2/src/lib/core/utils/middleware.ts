import { default as CONSTANTS } from '../../common/constants';
import { saveStateToHistory } from '../state/undoRedo/undoRedoSlice';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import { setIsWorkflowDirty } from '../state/workflow/workflowSlice';
import { setIsWorkflowParametersDirty } from '../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../store';
import { getCompressedSlicesFromRootState, getEditedPanelNode, getEditedPanelTab, shouldSkipSavingStateToHistory } from './undoredo';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { Middleware } from '@reduxjs/toolkit';

export const storeStateHistoryMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action: any) => {
    if (!undoableActionTypes.includes(action.type)) {
      return next(action);
    }

    // Capture pre-mutation state references (cheap — Immer won't mutate these in-place)
    const preState = getState() as RootState;

    // In read-only / monitoring view no genuine edits occur, so skip undo/redo snapshots
    // entirely. This keeps side-effect dispatches (e.g. a parameter editor re-emitting its
    // value on mount, whose action type is undoable) true no-ops and avoids growing undo
    // history / doing compression work for changes the user cannot make.
    if (preState.designerOptions.readOnly || preState.designerOptions.isMonitoringView) {
      return next(action);
    }

    // Process the action first so UI updates immediately
    const result = next(action);

    const stateHistoryLimit = preState.designerOptions.hostOptions.maxStateHistorySize ?? CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE;
    const idReplacements = preState.workflow.idReplacements;

    if (shouldSkipSavingStateToHistory(action, stateHistoryLimit, idReplacements)) {
      return result;
    }

    try {
      const editedPanelTab = getEditedPanelTab(action.type);
      const editedPanelNode = getEditedPanelNode(action.type, preState);
      const compressedSlices = getCompressedSlicesFromRootState(preState);
      dispatch(
        saveStateToHistory({
          stateHistoryItem: { compressedSlices, editedPanelTab, editedPanelNode },
          limit: stateHistoryLimit,
        })
      );
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'storeStateHistoryMiddleware',
        error: error instanceof Error ? error : undefined,
        message: 'Failed to save state to history for undo/redo.',
      });
    }

    return result;
  };

/**
 * Guards against false-positive "unsaved changes" flags while the designer is read-only
 * (e.g. viewing run history / monitoring view). No genuine edit is possible in read-only
 * mode, so any transition of the workflow / workflow-parameters `isDirty` flag from
 * `false` to `true` while read-only is a side-effect (e.g. a controlled editor re-emitting
 * its value on mount) and is reverted. Pre-existing dirty state (edits made before entering
 * the read-only view) is preserved because only `false` to `true` transitions are reverted.
 */
export const monitoringDirtyGuardMiddleware: Middleware =
  ({ getState, dispatch }) =>
  (next) =>
  (action: any) => {
    const stateBefore = getState() as RootState;
    const wasWorkflowDirty = !!stateBefore?.workflow?.isDirty;
    const wasParametersDirty = !!stateBefore?.workflowParameters?.isDirty;

    const result = next(action);

    const stateAfter = getState() as RootState;
    const isReadOnlyOrMonitoring = !!stateAfter?.designerOptions?.readOnly || !!stateAfter?.designerOptions?.isMonitoringView;
    if (isReadOnlyOrMonitoring) {
      if (!wasWorkflowDirty && stateAfter?.workflow?.isDirty) {
        dispatch(setIsWorkflowDirty(false));
      }
      if (!wasParametersDirty && stateAfter?.workflowParameters?.isDirty) {
        dispatch(setIsWorkflowParametersDirty(false));
      }
    }

    return result;
  };
