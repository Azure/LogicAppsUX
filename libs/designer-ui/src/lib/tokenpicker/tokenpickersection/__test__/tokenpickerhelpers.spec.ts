import type { OutputToken } from '../..';
import { getReducedTokenList } from '../tokenpickerhelpers';
import { describe, it, expect } from 'vitest';
describe('ui/tokenPicker/tokenPickerSection helpers', () => {
  describe('getReducedTokenList', () => {
    it('should return a list of tokens with the advanced tokens filtered out', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 2, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 3' },
      ]);
    });

    it('should return a list of tokens with the advanced tokens filtered out and the max rows shown respected', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 1, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([{ isAdvanced: false, value: 'Value 1' }]);
    });

    it('should return a list of tokens with the search query presence respected', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
      ];
      const options = { hasSearchQuery: true, maxRowsShown: 2, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
      ]);
    });

    it('should return a list of tokens with the "no more options" field respected', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 1, showAllOptions: true };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: true, value: 'Value 4' },
      ]);
    });

    it('should return all tokens with the "max rows shown" field respected', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: true, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: true, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: true, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
        { isAdvanced: true, value: 'Value 3' },
        { isAdvanced: true, value: 'Value 4' },
      ]);
    });

    it('should return all tokens when there are 0 non-advanced tokens and 1 advanced token', () => {
      const tokens: OutputToken[] = [{ isAdvanced: true, value: 'Value 1' } as OutputToken];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([{ isAdvanced: true, value: 'Value 1' }]);
    });

    it('should return all tokens when there are 0 non-advanced tokens and 5 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: true, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: true, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
        { isAdvanced: true, value: 'Value 5' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: true, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
        { isAdvanced: true, value: 'Value 3' },
        { isAdvanced: true, value: 'Value 4' },
        { isAdvanced: true, value: 'Value 5' },
      ]);
    });

    it('should return all tokens when there are 0 non-advanced tokens and 6 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: true, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: true, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
        { isAdvanced: true, value: 'Value 5' } as OutputToken,
        { isAdvanced: true, value: 'Value 6' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: true, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
        { isAdvanced: true, value: 'Value 3' },
        { isAdvanced: true, value: 'Value 4' },
        { isAdvanced: true, value: 'Value 5' },
        { isAdvanced: true, value: 'Value 6' },
      ]);
    });

    it('should return the first 6 tokens when there are 0 non-advanced tokens and 7 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: true, value: 'Value 1' } as OutputToken,
        { isAdvanced: true, value: 'Value 2' } as OutputToken,
        { isAdvanced: true, value: 'Value 3' } as OutputToken,
        { isAdvanced: true, value: 'Value 4' } as OutputToken,
        { isAdvanced: true, value: 'Value 5' } as OutputToken,
        { isAdvanced: true, value: 'Value 6' } as OutputToken,
        { isAdvanced: true, value: 'Value 7' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: true, value: 'Value 1' },
        { isAdvanced: true, value: 'Value 2' },
        { isAdvanced: true, value: 'Value 3' },
        { isAdvanced: true, value: 'Value 4' },
        { isAdvanced: true, value: 'Value 5' },
        { isAdvanced: true, value: 'Value 6' },
      ]);
    });
    it('should return all tokens when there are 5 non-advanced tokens and 0 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
      ]);
    });

    it('should return all tokens when there are 6 non-advanced tokens and 0 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
        { isAdvanced: false, value: 'Value 6' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
        { isAdvanced: false, value: 'Value 6' },
      ]);
    });

    it('should return the first 6 tokens when there are 7 non-advanced tokens and 0 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
        { isAdvanced: false, value: 'Value 6' } as OutputToken,
        { isAdvanced: false, value: 'Value 7' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
        { isAdvanced: false, value: 'Value 6' },
      ]);
    });

    it('should return all tokens when there are 5 non-advanced tokens and 1 advanced token', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
        { isAdvanced: true, value: 'Value 6' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
        { isAdvanced: true, value: 'Value 6' },
      ]);
    });

    it('should return all tokens when there are 6 non-advanced tokens and 1 advanced token', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
        { isAdvanced: false, value: 'Value 6' } as OutputToken,
        { isAdvanced: true, value: 'Value 7' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
        { isAdvanced: false, value: 'Value 6' },
      ]);
    });

    it('should return the first 6 tokens when there are 5 non-advanced tokens and 2 advanced tokens', () => {
      const tokens: OutputToken[] = [
        { isAdvanced: false, value: 'Value 1' } as OutputToken,
        { isAdvanced: false, value: 'Value 2' } as OutputToken,
        { isAdvanced: false, value: 'Value 3' } as OutputToken,
        { isAdvanced: false, value: 'Value 4' } as OutputToken,
        { isAdvanced: false, value: 'Value 5' } as OutputToken,
        { isAdvanced: true, value: 'Value 6' } as OutputToken,
        { isAdvanced: true, value: 'Value 7' } as OutputToken,
      ];
      const options = { hasSearchQuery: false, maxRowsShown: 6, showAllOptions: false };

      const result = getReducedTokenList(tokens, options);

      expect(result).toEqual([
        { isAdvanced: false, value: 'Value 1' },
        { isAdvanced: false, value: 'Value 2' },
        { isAdvanced: false, value: 'Value 3' },
        { isAdvanced: false, value: 'Value 4' },
        { isAdvanced: false, value: 'Value 5' },
        { isAdvanced: true, value: 'Value 6' },
      ]);
    });
  });
});
