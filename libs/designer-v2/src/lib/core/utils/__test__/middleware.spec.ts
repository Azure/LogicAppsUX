import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeStateHistoryMiddleware } from '../middleware';
import { undoableActionTypes } from '../../state/undoRedo/undoRedoTypes';
import { saveStateToHistory } from '../../state/undoRedo/undoRedoSlice';
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
});
