import { ValueSegmentConvertor } from '../segment';
import { convertToStringLiteral, OutputSource } from '@microsoft-logic-apps/parsers';
import type { ValueSegment } from '@microsoft/designer-ui';
import { TokenType, ValueSegmentType } from '@microsoft/designer-ui';

describe('core/utils/parameters/segment', () => {
  describe('ValueSegmentConvertor', () => {
    it('should convert primatives to token segment successfully.', () => {
      const convertor = new ValueSegmentConvertor();
      let segments: ValueSegment[];

      segments = convertor.convertToValueSegments(null);
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], '');

      segments = convertor.convertToValueSegments(undefined);
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], '');

      segments = convertor.convertToValueSegments(12.3);
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], '12.3');

      segments = convertor.convertToValueSegments(true);
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], 'true');

      segments = convertor.convertToValueSegments(false);
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], 'false');

      segments = convertor.convertToValueSegments('please "use"@triggerBody()');
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], 'please "use"@triggerBody()');
    });

    it('should convert template expression to token segment successfully.', () => {
      const convertor = new ValueSegmentConvertor();
      let segments: ValueSegment[];

      segments = convertor.convertToValueSegments("@actionBody('a').foo");
      expect(segments.length).toEqual(1);
      expectOutputTokenSegment(segments[0], 'a', OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);

      segments = convertor.convertToValueSegments("@decodebase64(actionBody('a').foo)");
      expect(segments.length).toEqual(1);
      expectExpressionTokenSegment(segments[0], "decodebase64(actionBody('a').foo)");
    });

    it('should convert template expression to token segment successfully with uncasting.', () => {
      const convertor = new ValueSegmentConvertor({
        repetitionContext: {
          repetitionReferences: [],
        },
        shouldUncast: true,
        rawModeEnabled: true,
      });
      const segments = convertor.convertToValueSegments("@decodebase64(actionBody('a').foo)");
      expect(segments.length).toEqual(1);
      expectOutputTokenSegment(segments[0], 'a', OutputSource.Body, 'foo', 'outputs.$.body.foo', 'byte', true);
    });

    it('should convert template expression interpolation to token segment successfully.', () => {
      const convertor = new ValueSegmentConvertor();
      let segments = convertor.convertToValueSegments("@{actionBody('a').foo}");
      expect(segments.length).toEqual(1);
      expectOutputTokenSegment(segments[0], 'a', OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);

      segments = convertor.convertToValueSegments("@{actionBody('a').foo}@{actionBody('b').bar}");
      expect(segments.length).toEqual(2);
      expectOutputTokenSegment(segments[0], 'a', OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectOutputTokenSegment(segments[1], 'b', OutputSource.Body, 'bar', 'outputs.$.body.bar', undefined, true);
    });

    it('should not have double quote for single non interpolated token.', () => {
      const convertor = new ValueSegmentConvertor();
      const segments = convertor.convertToValueSegments({
        foo: '@triggerBody().foo',
      });
      expect(segments.length).toEqual(5);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"foo"');
      expectLiteralSegment(segments[2], ': ');
      expectOutputTokenSegment(segments[3], undefined, OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectLiteralSegment(segments[4], '\n}');
    });

    it('should add @ if the string starts with @ when raw mode is enabled.', () => {
      const convertor = new ValueSegmentConvertor({
        shouldUncast: true,
        rawModeEnabled: true,
      });
      const segments = convertor.convertToValueSegments('@@{triggerBody().foo}');
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], '@@{triggerBody().foo}');
    });

    it('should not add @ if the string starts with @ but raw mode is disabled.', () => {
      const convertor = new ValueSegmentConvertor({
        shouldUncast: true,
        rawModeEnabled: false,
      });
      const segments = convertor.convertToValueSegments('@@{triggerBody().foo}');
      expect(segments.length).toEqual(1);
      expectLiteralSegment(segments[0], '@{triggerBody().foo}');
    });

    it('should add @ if the string starts with @ when raw mode is enabled for JSON.', () => {
      const convertor = new ValueSegmentConvertor({
        shouldUncast: true,
        rawModeEnabled: true,
      });
      const segments = convertor.convertToValueSegments({
        foo: '@@{triggerBody().foo}"',
      });
      expect(segments.length).toEqual(7);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"foo"');
      expectLiteralSegment(segments[2], ': ');
      expectLiteralSegment(segments[3], '"');
      expectLiteralSegment(segments[4], '@@{triggerBody().foo}\\"');
      expectLiteralSegment(segments[5], '"');
      expectLiteralSegment(segments[6], '\n}');
    });

    it('should not add @ if the string starts with @ but raw mode is disabled for JSON.', () => {
      const convertor = new ValueSegmentConvertor({
        shouldUncast: true,
        rawModeEnabled: false,
      });
      const segments = convertor.convertToValueSegments({
        foo: '@@{triggerBody().foo}"',
      });
      expect(segments.length).toEqual(7);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"foo"');
      expectLiteralSegment(segments[2], ': ');
      expectLiteralSegment(segments[3], '"');
      expectLiteralSegment(segments[4], '@{triggerBody().foo}\\"');
      expectLiteralSegment(segments[5], '"');
      expectLiteralSegment(segments[6], '\n}');
    });

    it('should have double quote for single interpolated token.', () => {
      const convertor = new ValueSegmentConvertor();
      const segments = convertor.convertToValueSegments({
        foo: '@{triggerBody().foo}',
      });
      expect(segments.length).toEqual(7);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"foo"');
      expectLiteralSegment(segments[2], ': ');
      expectLiteralSegment(segments[3], '"');
      expectOutputTokenSegment(segments[4], undefined, OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectLiteralSegment(segments[5], '"');
      expectLiteralSegment(segments[6], '\n}');
    });

    it('should escape the string when it is inside double quote.', () => {
      const convertor = new ValueSegmentConvertor();

      const segments = convertor.convertToValueSegments({
        foo: 'a"a@{triggerBody().foo}',
      });
      expect(segments.length).toEqual(8);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"foo"');
      expectLiteralSegment(segments[2], ': ');
      expectLiteralSegment(segments[3], '"');
      expectLiteralSegment(segments[4], 'a\\"a');
      expectOutputTokenSegment(segments[5], undefined, OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectLiteralSegment(segments[6], '"');
      expectLiteralSegment(segments[7], '\n}');
    });

    it('should convert object to token segment successfully.', () => {
      const convertor = new ValueSegmentConvertor();
      const segments = convertor.convertToValueSegments({
        boolean: false,
        string: 'Please "use"@triggerBody()',
        interpolation: "@{triggerBody().foo}@{variables('v')}",
        expression: '@triggerBody().foo',
      });
      expect(segments.length).toEqual(18);
      expectLiteralSegment(segments[0], '{\n  ');
      expectLiteralSegment(segments[1], '"boolean"');
      expectLiteralSegment(segments[2], ': false,\n  ');
      expectLiteralSegment(segments[3], '"string"');
      expectLiteralSegment(segments[4], ': ');
      expectLiteralSegment(segments[5], '"Please \\"use\\"@triggerBody()"');
      expectLiteralSegment(segments[6], ',\n  ');
      expectLiteralSegment(segments[7], '"interpolation"');
      expectLiteralSegment(segments[8], ': ');
      expectLiteralSegment(segments[9], '"');
      expectOutputTokenSegment(segments[10], undefined, OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectVariableTokenSegment(segments[11], 'v');
      expectLiteralSegment(segments[12], '"');
      expectLiteralSegment(segments[13], ',\n  ');
      expectLiteralSegment(segments[14], '"expression"');
      expectLiteralSegment(segments[15], ': ');
      expectOutputTokenSegment(segments[16], undefined, OutputSource.Body, 'foo', 'outputs.$.body.foo', undefined, true);
      expectLiteralSegment(segments[17], '\n}');
    });

    it('should convert FX token expression to token segment successfully.', () => {
      const convertor = new ValueSegmentConvertor({
        repetitionContext: {
          repetitionReferences: [],
        },
        shouldUncast: false,
        rawModeEnabled: true,
      });
      const segments = convertor.convertToValueSegments('@guid()');
      expect(segments.length).toEqual(1);
      expect(segments[0].token?.tokenType).toBe(TokenType.FX);
    });
  });
});

export function expectLiteralSegment(segment: ValueSegment | undefined | null, value: string): void {
  expect(segment).toBeDefined();
  expect(segment).not.toBeNull();
  expect(segment?.type).toEqual(ValueSegmentType.LITERAL);
  expect(segment?.value).toEqual(value);
}

export function expectOutputTokenSegment(
  segment: ValueSegment | undefined | null,
  actionName: string | undefined,
  source: string,
  name: string,
  key: string,
  format?: string,
  required?: boolean
): void {
  expect(segment).toBeDefined();
  expect(segment).not.toBeNull();
  expect(segment?.type).toEqual(ValueSegmentType.TOKEN);

  const matchingObject: any = { actionName, source, name, key, tokenType: TokenType.OUTPUTS };

  if (format !== undefined) {
    matchingObject.format = format;
  }

  if (required !== undefined) {
    matchingObject.required = required;
  }

  expect(segment?.token).toMatchObject(matchingObject);
}

export function expectExpressionTokenSegment(segment: ValueSegment | undefined | null, value: string): void {
  expect(segment).toBeDefined();
  expect(segment).not.toBeNull();
  expect(segment?.type).toEqual(ValueSegmentType.TOKEN);
  expect(segment?.token?.tokenType).toEqual(TokenType.FX);
  expect(segment?.value).toEqual(value);
}

export function expectVariableTokenSegment(segment: ValueSegment | undefined | null, variableName: string, value?: string): void {
  expect(segment).toBeDefined();
  expect(segment).not.toBeNull();
  expect(segment?.type).toEqual(ValueSegmentType.TOKEN);
  expect(segment.value).toEqual(value ? value : `variables(${convertToStringLiteral(variableName)})`);
  expect(segment?.token).toEqual({ tokenType: TokenType.VARIABLE, key: variableName, name: variableName, title: variableName });
}

export function expectParameterTokenSegment(segment: ValueSegment | undefined | null, parameterName: string, value?: string): void {
  expect(segment).toBeDefined();
  expect(segment).not.toBeNull();
  expect(segment?.type).toEqual(ValueSegmentType.TOKEN);
  expect(segment.value).toEqual(value ? value : `parameters(${convertToStringLiteral(parameterName)})`);
  expect(segment?.token).toEqual({ tokenType: TokenType.PARAMETER, key: parameterName, name: parameterName, title: parameterName });
}
