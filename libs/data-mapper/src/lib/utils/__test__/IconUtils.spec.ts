import { FunctionCategory } from '../../models/Function';
import { iconBaseUrl, iconForFunctionCategory } from '../Icon.Utils';

describe('icon utils', () => {
  describe('iconForFunctionCategory', () => {
    it('returns correct icon url for given category', () => {
      const result = iconForFunctionCategory(FunctionCategory.String);
      expect(result).toEqual(`${iconBaseUrl}dm_category_string.svg`);
    });

    it('returns correct icon url if category does not exist on frontend', () => {
      const result = iconForFunctionCategory('not real category' as FunctionCategory);
      expect(result).toEqual(`${iconBaseUrl}dm_category_utility.svg`);
    });
  });
});
