import { JsonSplitter } from '../jsonsplitter';

describe('core/utils/parameters/jsonsplitter', () => {
  describe('JsonSplitter', () => {
    it('should split the value correctly.', () => {
      expect(new JsonSplitter(JSON.stringify(null)).split()).toEqual(['null']);
      expect(new JsonSplitter(JSON.stringify(true)).split()).toEqual(['true']);
      expect(new JsonSplitter(JSON.stringify(false)).split()).toEqual(['false']);
      expect(new JsonSplitter(JSON.stringify(123.456)).split()).toEqual(['123.456']);
      expect(new JsonSplitter(JSON.stringify('abc')).split()).toEqual(['"abc"']);
      expect(new JsonSplitter(JSON.stringify('"abc"')).split()).toEqual(['"\\"abc\\""']);
      expect(new JsonSplitter('[ 1, 2, 3, "abc" ]').split()).toEqual(['[ 1, 2, 3, ', '"abc"', ' ]']);
      expect(new JsonSplitter('{ "foo": "bar" }').split()).toEqual(['{ ', '"foo"', ': ', '"bar"', ' }']);
    });
  });
});
