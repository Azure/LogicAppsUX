import type { OutputToken } from '..';

export const getReducedTokenList = (
  tokens: OutputToken[],
  options: { hasSearchQuery: boolean; maxRowsShown: number; showAllOptions: boolean }
): OutputToken[] => {
  const { hasSearchQuery, maxRowsShown, showAllOptions } = options;

  // If showAllOptions is true, return all tokens
  if (showAllOptions) {
    return tokens;
  }

  // Only filter if there are more tokens than maxRowsShown
  let filteredTokens = tokens;
  if (tokens.length > maxRowsShown) {
    const nonAdvancedTokens = tokens.filter((token) => !token.isAdvanced);
    const advancedTokens = tokens.filter((token) => token.isAdvanced);

    // If hasSearchQuery is true, do not filter out advanced tokens
    if (hasSearchQuery) {
      filteredTokens = tokens.slice(0, maxRowsShown);
    } else {
      filteredTokens = nonAdvancedTokens.slice(0, maxRowsShown);

      if (filteredTokens.length < maxRowsShown) {
        filteredTokens = filteredTokens.concat(advancedTokens.slice(0, maxRowsShown - filteredTokens.length));
      }
    }
  }

  return filteredTokens.slice(0, maxRowsShown);
};
