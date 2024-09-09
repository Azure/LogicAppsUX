import type { OutputToken } from '..';

export const getReducedTokenList = (
  tokens: OutputToken[],
  options: { hasSearchQuery: boolean; maxRowsShown: number; showAllOptions: boolean }
): OutputToken[] => {
  const { hasSearchQuery, maxRowsShown, showAllOptions } = options;

  // Only filter if there are more tokens than maxRowsShown
  let filteredTokens = tokens;
  if (tokens.length > maxRowsShown) {
    filteredTokens = tokens.filter((token) => !token.isAdvanced || showAllOptions || hasSearchQuery);
  }

  if (!showAllOptions) {
    filteredTokens = filteredTokens.slice(0, maxRowsShown);
  }

  return filteredTokens;
};
