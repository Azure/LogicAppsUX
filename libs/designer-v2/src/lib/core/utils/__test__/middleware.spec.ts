import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { monitoringDirtyGuardMiddleware, storeStateHistoryMiddleware } from '../middleware';
import { undoableActionTypes } from '../../state/undoRedo/undoRedoTypes';
import { saveStateToHistory } from '../../state/undoRedo/undoRedoSlice';
import { setIsWorkflowDirty } from '../../state/workflow/workflowSlice';
import { setIsWorkflowParametersDirty } from '../../state/workflowparameters/workflowparametersSlice';
import * as undoRedoUtils from '../undoredo';
import { default as CONSTANTS } from '../../../common/constants';

vi.mock('pako', () => ({
  deflate: vi.fn((input: string) => new Uint8Array(Buffer.from(input))),
  inflate: vi.fn((input: Uint8Array) => Buffer.from(input).toString()),
}));

const createMockState = () => ({
  connections: {},
  customCode: {},
  operations: {},
  panel: { operationContent: { selectedNodeId: 'node1' } },
  settings: {},
  staticResults: {},
  tokens: {},
  workflow: { idReplacements: {} },
  workflowParameters: {},
  notes: {},
  undoRedo: { past: [], future: [], undoRedoClickToggle: 0 },
  designerOptions: { hostOptions: {} },
});

describe('middleware utils', () => {
  let store: { getState: ReturnType<typeof vi.fn>; dispatch: ReturnType<typeof vi.fn> };
  let next: ReturnType<typeof vi.fn>;
  let invoke: (action: any) => any;

  beforeEach(() => {
    store = {
      getState: vi.fn(() => createMockState()),
      dispatch: vi.fn(),
    };
    next = vi.fn();
    invoke = (action) => storeStateHistoryMiddleware(store)(next)(action);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes non-undoable actions through without saving state', () => {
    const action = { type: 'TEST' };
    invoke(action);
    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it.each<string>(undoableActionTypes)('saves state to history on undoable action: %s', (undoableActionType) => {
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(false);
    const mockSlices = { connections: new Uint8Array([1, 2, 3]) };
    vi.spyOn(undoRedoUtils, 'getCompressedSlicesFromRootState').mockReturnValue(mockSlices);
    vi.spyOn(undoRedoUtils, 'getEditedPanelTab').mockReturnValue(undefined);
    vi.spyOn(undoRedoUtils, 'getEditedPanelNode').mockReturnValue(undefined);

    const action = { type: undoableActionType };
    invoke(action);

    expect(next).toHaveBeenCalledWith(action);
    expect(store.dispatch).toHaveBeenCalledWith(
      saveStateToHistory({
        stateHistoryItem: { compressedSlices: mockSlices, editedPanelTab: undefined, editedPanelNode: undefined },
        limit: CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE,
      })
    );
  });

  it('processes the action before saving state (action-first ordering)', () => {
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(false);
    vi.spyOn(undoRedoUtils, 'getCompressedSlicesFromRootState').mockReturnValue({ connections: new Uint8Array([1]) });
    vi.spyOn(undoRedoUtils, 'getEditedPanelTab').mockReturnValue(undefined);
    vi.spyOn(undoRedoUtils, 'getEditedPanelNode').mockReturnValue(undefined);

    const callOrder: string[] = [];
    next.mockImplementation(() => callOrder.push('next'));
    store.dispatch.mockImplementation(() => callOrder.push('dispatch'));

    invoke({ type: undoableActionTypes[0] });

    expect(callOrder).toEqual(['next', 'dispatch']);
  });

  it('skips saving state when shouldSkipSavingStateToHistory returns true', () => {
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(true);

    invoke({ type: undoableActionTypes[0] });

    expect(next).toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('captures pre-mutation state for compression', () => {
    const compressSpy = vi.spyOn(undoRedoUtils, 'getCompressedSlicesFromRootState').mockReturnValue({ connections: new Uint8Array([1]) });
    vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory').mockReturnValue(false);
    vi.spyOn(undoRedoUtils, 'getEditedPanelTab').mockReturnValue(undefined);
    vi.spyOn(undoRedoUtils, 'getEditedPanelNode').mockReturnValue(undefined);

    const mockState = createMockState();
    store.getState.mockReturnValue(mockState);

    invoke({ type: undoableActionTypes[0] });

    expect(compressSpy).toHaveBeenCalledWith(mockState);
  });

  it('skips saving history for undoable actions while read-only', () => {
    const compressSpy = vi.spyOn(undoRedoUtils, 'getCompressedSlicesFromRootState');
    const skipSpy = vi.spyOn(undoRedoUtils, 'shouldSkipSavingStateToHistory');
    store.getState.mockReturnValue({ ...createMockState(), designerOptions: { hostOptions: {}, readOnly: true } });

    invoke({ type: undoableActionTypes[0] });

    expect(next).toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(compressSpy).not.toHaveBeenCalled();
    expect(skipSpy).not.toHaveBeenCalled();
  });

  it('skips saving history for undoable actions while in monitoring view', () => {
    const compressSpy = vi.spyOn(undoRedoUtils, 'getCompressedSlicesFromRootState');
    store.getState.mockReturnValue({ ...createMockState(), designerOptions: { hostOptions: {}, isMonitoringView: true } });

    invoke({ type: undoableActionTypes[0] });

    expect(next).toHaveBeenCalled();
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(compressSpy).not.toHaveBeenCalled();
  });
});

describe('monitoringDirtyGuardMiddleware', () => {
  let dispatch: ReturnType<typeof vi.fn>;
  let next: ReturnType<typeof vi.fn>;
  const action = { type: 'ANY_ACTION' };

  const buildState = (overrides: {
    workflowDirty?: boolean;
    parametersDirty?: boolean;
    readOnly?: boolean;
    isMonitoringView?: boolean;
  }) => ({
    workflow: { isDirty: !!overrides.workflowDirty },
    workflowParameters: { isDirty: !!overrides.parametersDirty },
    designerOptions: { readOnly: !!overrides.readOnly, isMonitoringView: !!overrides.isMonitoringView },
  });

  const run = (before: any, after: any) => {
    const getState = vi.fn().mockReturnValueOnce(before).mockReturnValueOnce(after);
    dispatch = vi.fn();
    next = vi.fn();
    const result = monitoringDirtyGuardMiddleware({ getState, dispatch } as any)(next)(action);
    return { result, getState };
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('always forwards the action to next', () => {
    run(buildState({}), buildState({}));
    expect(next).toHaveBeenCalledWith(action);
  });

  it('reverts a false -> true workflow dirty transition while read-only', () => {
    run(buildState({ workflowDirty: false, readOnly: true }), buildState({ workflowDirty: true, readOnly: true }));
    expect(dispatch).toHaveBeenCalledWith(setIsWorkflowDirty(false));
  });

  it('reverts a false -> true workflow dirty transition while in monitoring view', () => {
    run(buildState({ workflowDirty: false, isMonitoringView: true }), buildState({ workflowDirty: true, isMonitoringView: true }));
    expect(dispatch).toHaveBeenCalledWith(setIsWorkflowDirty(false));
  });

  it('reverts a false -> true workflow parameters dirty transition while read-only', () => {
    run(buildState({ parametersDirty: false, readOnly: true }), buildState({ parametersDirty: true, readOnly: true }));
    expect(dispatch).toHaveBeenCalledWith(setIsWorkflowParametersDirty(false));
  });

  it('reverts both workflow and workflow parameters dirty flags flipped in the same action', () => {
    run(
      buildState({ workflowDirty: false, parametersDirty: false, readOnly: true }),
      buildState({ workflowDirty: true, parametersDirty: true, readOnly: true })
    );
    expect(dispatch).toHaveBeenCalledWith(setIsWorkflowDirty(false));
    expect(dispatch).toHaveBeenCalledWith(setIsWorkflowParametersDirty(false));
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('preserves a pre-existing dirty flag while read-only (does not revert)', () => {
    run(buildState({ workflowDirty: true, readOnly: true }), buildState({ workflowDirty: true, readOnly: true }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not revert a false -> true transition when not read-only or monitoring', () => {
    run(buildState({ workflowDirty: false }), buildState({ workflowDirty: true }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when the dirty flag is unchanged while read-only', () => {
    run(buildState({ workflowDirty: false, readOnly: true }), buildState({ workflowDirty: false, readOnly: true }));
    expect(dispatch).not.toHaveBeenCalled();
  });
});
