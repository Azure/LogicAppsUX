import { FunctionCategory } from '../../models/Function';
import { iconBaseUrl, iconForFunctionCategory } from '../Icon.Utils';

describe('icon utils', () => {
  describe('iconForFunctionCategory', () => {
    it('returns correct icon url for given category', () => {
      const result = iconForFunctionCategory(FunctionCategory.String);
      expect(result).toEqual(`${iconBaseUrl}dm_category_string.svg`);
    });

    it('returns correct icon url if category does not exist on frontend', () => {
      // danielle is this the right strategy? yes probably because we are doing the same with branding. test that it gets put into this catch all too!
      const result = iconForFunctionCategory('not real category' as FunctionCategory);
      expect(result).toEqual(`${iconBaseUrl}dm_category_utility.svg`);
    });
  });
});
