import { default as CONSTANTS } from '../../common/constants';
import { isExpressionConnectionMapping } from '../../common/models/workflow';
import { resetWorkflowState } from '../state/global';
import { beginHistoryTransaction, endHistoryTransaction, saveStateToHistory } from '../state/undoRedo/undoRedoSlice';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import { renameConnectionExpressionParameter } from '../state/connection/connectionSlice';
import { clearAllErrors } from '../state/operation/operationMetadataSlice';
import {
  initWorkflowSpec,
  pasteNode,
  setHasUnsupportedMultipleTriggers,
  setIsWorkflowDirty,
  setRunInstance,
  setWorkflowKind,
} from '../state/workflow/workflowSlice';
import { setIsWorkflowParametersDirty } from '../state/workflowparameters/workflowparametersSlice';
import type { RootState } from '../store';
import { getCompressedSlicesFromRootState, getEditedPanelNode, getEditedPanelTab, shouldSkipSavingStateToHistory } from './undoredo';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { Middleware } from '@reduxjs/toolkit';
import { setWorkflowExtractionBusy } from '../state/designerView/designerViewSlice';

type DesignerThunk = (dispatch: (action: unknown) => unknown, getState: () => unknown, extraArgument: unknown) => unknown;
type ThunkGuardMeta = {
  workflowGeneration?: number;
  historyTransaction?: string;
  blockedByHistoryTransaction?: boolean;
};

const workflowGenerationMeta = 'workflowGeneration';
const historyTransactionMeta = 'historyTransaction';
const historyTransactionBlockedMeta = 'blockedByHistoryTransaction';
const thunkMeta = new WeakMap<Function, ThunkGuardMeta>();

const wrapThunkWithMeta = (thunk: DesignerThunk, patch: ThunkGuardMeta): DesignerThunk => {
  const wrapped: DesignerThunk = (thunkDispatch, thunkGetState, extraArgument) => thunk(thunkDispatch, thunkGetState, extraArgument);
  thunkMeta.set(wrapped, { ...thunkMeta.get(thunk), ...patch });
  return wrapped;
};

// Tags an action or thunk with the owning history transaction ID so historyTransactionGuardMiddleware
// lets the transaction's own nested async dispatches through while blocking unrelated mutations.
export const withHistoryTransaction = <TAction>(action: TAction, transactionId: string): TAction => {
  if (typeof action === 'function') {
    return wrapThunkWithMeta(action as unknown as DesignerThunk, { historyTransaction: transactionId }) as unknown as TAction;
  }
  if (!action || typeof action !== 'object') {
    return action;
  }
  return {
    ...(action as Record<string, unknown>),
    meta: {
      ...((action as { meta?: Record<string, unknown> }).meta ?? {}),
      [historyTransactionMeta]: transactionId,
    },
  } as TAction;
};

const markBlockedByHistoryTransaction = <TAction>(action: TAction): TAction => {
  if (typeof action === 'function') {
    return wrapThunkWithMeta(action as unknown as DesignerThunk, { blockedByHistoryTransaction: true }) as unknown as TAction;
  }
  if (!action || typeof action !== 'object') {
    return action;
  }
  return {
    ...(action as Record<string, unknown>),
    meta: {
      ...((action as { meta?: Record<string, unknown> }).meta ?? {}),
      [historyTransactionBlockedMeta]: true,
    },
  } as TAction;
};

// Non-mutating host/lifecycle and workflow-load actions that must remain allowed while a history
// transaction awaits async metadata (for example host read-only/monitoring locks, workflow reloads,
// and RTK lifecycle wrappers whose bodies already guard on activeHistoryTransactions).
const isAllowedDuringHistoryTransaction = (type: unknown): boolean =>
  typeof type === 'string' &&
  (type === resetWorkflowState.type ||
    type === clearAllErrors.type ||
    type === initWorkflowSpec.type ||
    type === setWorkflowKind.type ||
    type === setRunInstance.type ||
    type === 'panel/initRunInPanel' ||
    type === 'customCode/initCustomCode' ||
    type === setHasUnsupportedMultipleTriggers.type ||
    type.startsWith('initializeGraphState/') ||
    type.startsWith('designerOptions/') ||
    type.startsWith('designerView/') ||
    type.startsWith('dev/') ||
    type.startsWith('onUndoClick/') ||
    type.startsWith('onRedoClick/') ||
    type.startsWith('duplicateOperations/'));

// Host lifecycle boundaries that replace the loaded workflow and invalidate any in-flight history
// transaction so its late async callbacks cannot write into the newly loaded graph.
const isHistoryTransactionCancelBoundary = (action: any): boolean =>
  resetWorkflowState.match(action) || initWorkflowSpec.match(action) || action?.type === 'initializeGraphState/pending';

// Keeps multi-step async mutations (e.g. Shared Duplicate awaiting scope metadata) atomic on the
// undo stack: only actions belonging to the active transaction (plus non-mutating host/lifecycle
// actions) may run until the transaction ends. Unrelated thunks started mid-transaction have their
// nested dispatches marked blocked so delayed callbacks cannot leak after the transaction finishes.
export const historyTransactionGuardMiddleware: Middleware = () => {
  let activeTransactionId: string | undefined;

  return (next) => (action: any) => {
    if (typeof action === 'function') {
      const meta = thunkMeta.get(action);
      if (meta?.blockedByHistoryTransaction) {
        const blockedThunk: DesignerThunk = (thunkDispatch, thunkGetState, extraArgument) =>
          action((nestedAction: unknown) => thunkDispatch(markBlockedByHistoryTransaction(nestedAction)), thunkGetState, extraArgument);
        thunkMeta.set(blockedThunk, meta);
        return next(blockedThunk as any);
      }
      if (meta?.historyTransaction !== undefined) {
        const txId = meta.historyTransaction;
        const txBoundThunk: DesignerThunk = (thunkDispatch, thunkGetState, extraArgument) =>
          action((nestedAction: unknown) => thunkDispatch(withHistoryTransaction(nestedAction, txId)), thunkGetState, extraArgument);
        thunkMeta.set(txBoundThunk, meta);
        return next(txBoundThunk as any);
      }
      if (activeTransactionId !== undefined) {
        const blockedThunk: DesignerThunk = (thunkDispatch, thunkGetState, extraArgument) =>
          action((nestedAction: unknown) => thunkDispatch(markBlockedByHistoryTransaction(nestedAction)), thunkGetState, extraArgument);
        thunkMeta.set(blockedThunk, { ...meta, blockedByHistoryTransaction: true });
        return next(blockedThunk as any);
      }
      return next(action);
    }

    if (isHistoryTransactionCancelBoundary(action)) {
      activeTransactionId = undefined;
      return next(action);
    }

    if (action?.meta?.[historyTransactionBlockedMeta] && !isAllowedDuringHistoryTransaction(action?.type)) {
      return action;
    }

    const actionTxId: string | undefined = action?.meta?.[historyTransactionMeta];
    if (beginHistoryTransaction.match(action)) {
      if (activeTransactionId !== undefined && actionTxId !== activeTransactionId) {
        return action;
      }
      if (actionTxId !== undefined) {
        activeTransactionId = actionTxId;
      }
      return next(action);
    }

    if (endHistoryTransaction.match(action)) {
      // Drop stray endHistoryTransaction dispatches from transactions already canceled by a reset/reload.
      if (actionTxId !== undefined && actionTxId !== activeTransactionId) {
        return action;
      }
      if (actionTxId !== undefined && actionTxId === activeTransactionId) {
        activeTransactionId = undefined;
      }
      return next(action);
    }

    // Any action tagged with a transaction ID belongs exclusively to that transaction; if the
    // transaction was canceled (activeTransactionId is undefined or a newer ID), drop late writes.
    if (actionTxId !== undefined && actionTxId !== activeTransactionId) {
      return action;
    }

    if (activeTransactionId !== undefined && actionTxId !== activeTransactionId && !isAllowedDuringHistoryTransaction(action?.type)) {
      return action;
    }

    return next(action);
  };
};

// Only the extraction transaction may modify the editor during persistence. Thunks
// retain the graph generation in which they started, so callbacks from the previous
// graph remain blocked even if they resume after the extraction lock is released.
export const extractionMutationGuardMiddleware: Middleware = ({ dispatch, getState }) => {
  let workflowGeneration = 0;

  const bindActionToGeneration = (action: any, generation: number): any => {
    if (typeof action === 'function') {
      return wrapThunkWithMeta(action, { workflowGeneration: generation });
    }
    if (!action || typeof action !== 'object') {
      return action;
    }
    return {
      ...action,
      meta: {
        ...action.meta,
        [workflowGenerationMeta]: generation,
      },
    };
  };

  return (next) => (action: any) => {
    const actionGeneration =
      typeof action === 'function' ? thunkMeta.get(action)?.workflowGeneration : action?.meta?.[workflowGenerationMeta];
    if (actionGeneration !== undefined && actionGeneration !== workflowGeneration) {
      return action;
    }
    if (
      getState().designerView.workflowExtractionBusy &&
      action?.type !== setWorkflowExtractionBusy.type &&
      !action?.meta?.workflowExtraction
    ) {
      return action;
    }
    if (setWorkflowExtractionBusy.match(action) && action.payload) {
      workflowGeneration += 1;
    }
    if (typeof action === 'function') {
      const generation = actionGeneration ?? workflowGeneration;
      return action((nestedAction: unknown) => dispatch(bindActionToGeneration(nestedAction, generation)), getState, undefined);
    }
    return next(action);
  };
};

export const storeStateHistoryMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action: any) => {
    if (
      action.type === 'updateNodeConnection/pending' &&
      !isExpressionConnectionMapping((getState() as RootState).connections.connectionsMapping[action.meta.arg.nodeId])
    ) {
      return next(action);
    }
    if (action.type === 'workflowParameters/updateParameter') {
      const oldName = (getState() as RootState).workflowParameters.definitions[action.payload.id]?.name;
      const newName = action.payload.newDefinition.name;
      if (oldName && newName && oldName !== newName) {
        dispatch(renameConnectionExpressionParameter({ oldName, newName }));
      }
    }
    if (!undoableActionTypes.includes(action.type)) {
      return next(action);
    }
    if (
      (pasteNode.match(action) && action.payload?.skipUndoSnapshot) ||
      (action.type === 'pasteScopeOperation/pending' && action.meta?.arg?.skipUndoSnapshot)
    ) {
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
