import type { JsonInputStyle } from '../utils/converters';
import { jsonToMapcode } from '../utils/converters';
import { designdoc_test_input, designdoc_test_output } from './sample_tests';

describe('utils/converters', () => {
  describe('convertJsonToMapCode', () => {
    it('Test in design doc', () => {
      expect(jsonToMapcode(designdoc_test_input)).toEqual(designdoc_test_output);
    });
  });
});
