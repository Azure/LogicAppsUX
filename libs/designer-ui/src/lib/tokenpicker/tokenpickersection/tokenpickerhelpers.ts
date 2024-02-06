import type { OutputToken } from '..';

export const getReducedTokenList = (
  tokens: OutputToken[],
  options: { hasSearchQuery: boolean; maxRowsShown: number; showAllOptions: boolean }
): OutputToken[] => {
  const { hasSearchQuery, maxRowsShown, showAllOptions } = options;

  let filteredTokens = tokens.filter((token) => !token.isAdvanced || showAllOptions || hasSearchQuery);
  if (!showAllOptions) {
    filteredTokens = filteredTokens.slice(0, maxRowsShown);
  }

  return filteredTokens;
};

export const hasAdvanced = (tokens: OutputToken[]): boolean => {
  return tokens.some((token) => token.isAdvanced);
};
