import type { OutputToken } from '..';

export const getReducedTokenList = (
  tokens: OutputToken[],
  options: { hasSearchQuery: boolean; maxRowsShown: number; moreOptions: boolean }
): OutputToken[] => {
  const { hasSearchQuery, maxRowsShown, moreOptions } = options;

  return tokens
    .map((token, j) => {
      if ((token.isAdvanced || j >= maxRowsShown) && moreOptions && !hasSearchQuery) {
        return null;
      }

      return token;
    })
    .filter(Boolean) as OutputToken[];
};

export const hasAdvanced = (tokens: OutputToken[]): boolean => {
  return tokens.some((token) => token.isAdvanced);
};
