import { describe, expect, it } from 'vitest';
import { getMockedUndoRedoPartialRootState } from '../../../__test__/mock-root-state';
import { setStateAfterUndoRedo } from '../global';
import reducer, { initialState, TokensState } from '../tokens/tokensSlice';
describe('tokens slice reducers', () => {
  it('should set tokens state on undo redo', async () => {
    const undoRedoPartialRootState = getMockedUndoRedoPartialRootState();
    const tokensState: TokensState = {
      outputTokens: {
        mockToken: {
          tokens: [
            {
              key: 'test',
              brandColor: 'white',
              title: 'items',
              type: 'token',
              outputInfo: {
                type: 'outputs',
              },
            },
          ],
          isLoading: false,
          upstreamNodeIds: ['testNode'],
        },
      },
      variables: {},
    };
    const state = reducer(
      initialState,
      setStateAfterUndoRedo({
        ...undoRedoPartialRootState,
        tokens: tokensState,
      })
    );

    expect(state).toEqual(tokensState);
  });
});
