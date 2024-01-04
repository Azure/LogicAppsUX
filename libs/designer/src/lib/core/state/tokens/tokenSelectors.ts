import type { RootState } from '../../store';
import type { TokensState } from './tokensSlice';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

export const getTokenState = (state: RootState): TokensState => state.tokens;

export const useUpstreamNodes = (id?: string) => {
  return useSelector(
    createSelector(getTokenState, (state: TokensState) => {
      // TODO: Support variables
      return state.outputTokens[id ?? '']?.upstreamNodeIds ?? [];
    })
  );
};
