import type { RootState } from '../../store';
import type { TokensState } from './tokensSlice';
import { getRecordEntry } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getTokenState = (state: RootState): TokensState => state.tokens;

export const useUpstreamNodes = (id?: string, graphId?: string, childId?: string) => {
  return useSelector(
    createSelector(getTokenState, (state: TokensState) => {
      if (graphId === 'root' && !childId) {
        return Object.keys(state.outputTokens);
      }
      return getRecordEntry(state.outputTokens, id)?.upstreamNodeIds ?? [];
    })
  );
};
