import { beforeAll, describe, expect, it } from 'vitest';
import { createLiteralValueSegment, ValueSegmentConvertor, ValueSegmentConvertorOptions } from '../parameters/segment';
import constants from '../../../common/constants';
import { convertStringToInputParameter } from '../parameters/helper';

describe('convertToValueSegments', () => {
  const convertor = new ValueSegmentConvertor({
    shouldUncast: true,
    rawModeEnabled: true,
  });
  it('properly converts string segment to Value Segment', () => {
    const stringValue = 'test';
    const result = convertor.convertToValueSegments(
      stringValue,
      convertStringToInputParameter(stringValue, { parameterType: constants.SWAGGER.TYPE.STRING })
    );
    expect(result[0].value).toEqual(createLiteralValueSegment(stringValue).value);
  });

  it('properly wraps string boolean with quotes if of type any', () => {
    const stringValue = 'true';
    const result = convertor.convertToValueSegments(
      stringValue,
      convertStringToInputParameter(stringValue, { parameterType: constants.SWAGGER.TYPE.ANY })
    );
    expect(result[0].value).toEqual('"true"');
  });

  it('properly wraps string number with quotes if of type any', () => {
    const stringValue = '14';
    const result = convertor.convertToValueSegments(
      stringValue,
      convertStringToInputParameter(stringValue, { parameterType: constants.SWAGGER.TYPE.ANY })
    );
    expect(result[0].value).toEqual('"14"');
  });

  it('properly wraps null with quotes if of type any', () => {
    const stringValue = 'null';
    const result = convertor.convertToValueSegments(
      stringValue,
      convertStringToInputParameter(stringValue, { parameterType: constants.SWAGGER.TYPE.ANY })
    );
    expect(result[0].value).toEqual('"null"');
  });

  it('does not wrap string primitive segment with quotes if of types other than any', () => {
    const stringValue = 'true';
    const result = convertor.convertToValueSegments(
      stringValue,
      convertStringToInputParameter(stringValue, { parameterType: constants.SWAGGER.TYPE.STRING })
    );
    expect(result[0].value).toEqual('true');
  });
});
