import { InvalidFormatExceptionCode } from '../../exceptions/MapDefinitionExceptions';
import {
  cbrInputRecordJsonMock,
  cbrInputRecordMapDefinitionMock,
  customerOrdersJsonMock,
  customerOrdersMapDefinitionMock,
  forWithChildrenAndValueJsonMock,
  forWithChildrenValueMapDefinitionMock,
  forWithIndexAndValueJsonMock,
  forWithIndexAndValueMapDefinitionMock,
  ifWithChildrenAndValueJsonMock,
  ifWithChildrenAndValueMapDefinitionMock,
  missingDstSchemaNameMapDefinitionMock,
  missingSrcSchemaNameMapDefinitionMock,
  simpleJsonExample,
  simpleMapDefExampleMapDefinitionMock,
} from '../__mocks__';
import { mapDefinitionToJson, parseConditionalMapping, parseLoopMapping } from '../mapDefinitionToJsonParser';

describe('convertJsonToMapDefinition', () => {
  it('Test CBR Input', async () => {
    expect(mapDefinitionToJson(cbrInputRecordMapDefinitionMock)).toEqual(cbrInputRecordJsonMock);
  });

  it('Test customer orders (in design doc)', () => {
    expect(mapDefinitionToJson(customerOrdersMapDefinitionMock)).toEqual(customerOrdersJsonMock);
  });

  it('Test for with children and value at the same time', () => {
    expect(mapDefinitionToJson(forWithChildrenValueMapDefinitionMock)).toEqual(forWithChildrenAndValueJsonMock);
  });

  it('Test for with children with index', () => {
    expect(mapDefinitionToJson(forWithIndexAndValueMapDefinitionMock)).toEqual(forWithIndexAndValueJsonMock);
  });

  it('Test if with children and value at the same time', () => {
    expect(mapDefinitionToJson(ifWithChildrenAndValueMapDefinitionMock)).toEqual(ifWithChildrenAndValueJsonMock);
  });

  it('Test src schema name missing input', () => {
    expect(() => {
      mapDefinitionToJson(missingSrcSchemaNameMapDefinitionMock);
    }).toThrow(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
  });

  it('Test dst schema name missing input', () => {
    expect(() => {
      mapDefinitionToJson(missingDstSchemaNameMapDefinitionMock);
    }).toThrow(InvalidFormatExceptionCode.MISSING_SCHEMA_NAME);
  });

  it('Test simple json example', () => {
    expect(mapDefinitionToJson(simpleMapDefExampleMapDefinitionMock)).toEqual(simpleJsonExample);
  });
});

describe('parseLoopMapping', () => {
  it('Regular for case: No comma (no index)', async () => {
    expect(parseLoopMapping('for(abcde)')).toEqual({ loopSource: 'abcde' });
  });

  it('Regular for case: No comma case (no index) with random spaces excluding the expression', async () => {
    expect(parseLoopMapping('  for(abcde) ')).toEqual({ loopSource: 'abcde' });
  });

  it('Regular for case: No comma case (no index) with random spaces including the expression', async () => {
    expect(parseLoopMapping('  for (  abcde ) ')).toEqual({ loopSource: 'abcde' });
  });

  it('Regular for case: Yes comma case (yes index)', async () => {
    expect(parseLoopMapping('for(abcde, ind)')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
  });

  it('Regular for case: Yes comma case (yes index) with random spaces excluding the expression', async () => {
    expect(parseLoopMapping(' for  (abcde,ind)  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
  });

  it('Regular for case: Yes comma case (yes index) with random spaces including the expression', async () => {
    expect(parseLoopMapping(' for  ( abcde,    ind )  ')).toEqual({ loopSource: 'abcde', loopIndex: 'ind' });
  });

  it('Regular for case: Yes comma case (yes index) with random spaces including the expression', async () => {
    // permitted since starting with "$for" is checked before this function call
    expect(parseLoopMapping('for-example(abcde)')).toEqual({ loopSource: 'abcde' });
  });
});

describe('parseConditionalMapping', () => {
  it('Regular if case', async () => {
    expect(parseConditionalMapping('if(not_equal(variable1))')).toEqual({ condition: 'not_equal(variable1)' });
  });

  it('Regular if case with random spaces excluding the expression', async () => {
    expect(parseConditionalMapping('if ( not_equal(variable1)) ')).toEqual({ condition: 'not_equal(variable1)' });
  });

  it('Regular if case with random spaces including the expression', async () => {
    expect(parseConditionalMapping('if ( not_equal ( variable1 ) ) ')).toEqual({ condition: 'not_equal ( variable1 )' });
  });

  it('Not starting with if case', async () => {
    // permitted since starting with "$if" is checked before this function call
    expect(parseConditionalMapping('if-else-example(not_equal(variable1))')).toEqual({ condition: 'not_equal(variable1)' });
  });
});
