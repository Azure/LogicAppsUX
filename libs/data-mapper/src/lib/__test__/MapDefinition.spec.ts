import { parseConditionalMapping, parseLoopMapping } from '../utils/DataMap.Utils';

describe('Map definition conversions', () => {
  describe('parseLoopMapping', () => {
    it('Regular for case: No comma (no index)', async () => {
      expect(parseLoopMapping('for(abcde)')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces excluding the function', async () => {
      expect(parseLoopMapping('  for(abcde) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: No comma case (no index) with random spaces including the function', async () => {
      expect(parseLoopMapping('  for (  abcde ) ')).toEqual({ loopSource: 'abcde' });
    });

    it('Regular for case: Yes comma case (yes index)', async () => {
      expect(parseLoopMapping('for(abcde, ind)')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces excluding the function', async () => {
      expect(parseLoopMapping(' for  (abcde,ind)  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the function', async () => {
      expect(parseLoopMapping(' for  ( abcde,    ind )  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
    });

    it('Regular for case: Yes comma case (yes index) with random spaces including the function', async () => {
      // permitted since starting with "$for" is checked before this function call
      expect(parseLoopMapping('for-example(abcde)')).toEqual({ loopSource: 'abcde' });
    });
  });

  describe('parseConditionalMapping', () => {
    it('Regular if case', async () => {
      expect(parseConditionalMapping('if(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces excluding the function', async () => {
      expect(parseConditionalMapping('if ( not_equal(variable1)) ')).toEqual('not_equal(variable1)');
    });

    it('Regular if case with random spaces including the function', async () => {
      expect(parseConditionalMapping('if ( not_equal ( variable1 ) ) ')).toEqual('not_equal ( variable1 )');
    });

    it('Not starting with if case', async () => {
      // Permitted since starting with "$if" is checked before this function call
      expect(parseConditionalMapping('if-else-example(not_equal(variable1))')).toEqual('not_equal(variable1)');
    });
  });
});
