import { StringCategory20Regular } from '../../images/FunctionIcons/CategoryIcons';
import { FunctionCategory } from '../../models/Function';
import { iconForFunctionCategory } from '../Icon.Utils';
import { WrenchRegular } from '@fluentui/react-icons';
import { describe, it, expect } from 'vitest';

describe('icon utils', () => {
  describe('iconForFunctionCategory', () => {
    it('returns correct icon for given category', () => {
      const result = iconForFunctionCategory(FunctionCategory.String);
      expect(result).toEqual(StringCategory20Regular);
    });

    it('returns default icon if category does not exist', () => {
      const result = iconForFunctionCategory('not real category' as FunctionCategory);
      expect(result).toEqual(WrenchRegular);
    });
  });
});
