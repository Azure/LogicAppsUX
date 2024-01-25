import type { OutputToken } from '../..';
import { getReducedTokenList } from '../tokenpickerhelpers';

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
  });
});
