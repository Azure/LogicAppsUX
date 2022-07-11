import { parameterValueToJSONString, parameterValueToString } from '../helper';
import { ExpressionType } from '@microsoft-logic-apps/parsers';
import type { ParameterInfo, ValueSegment } from '@microsoft/designer-ui';
import { TokenType, ValueSegmentType } from '@microsoft/designer-ui';

describe('parameterValueToJSONString', () => {
  it('should parse user typed json containing null, array, numeric, and nested values', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": null, "array": [1,2,3], "nesting": {"a": 1}}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ Key: null, array: [1, 2, 3], nesting: { a: 1 } });
  });

  it('should handle empty objects', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({});
  });

  it('should handle tokens as keys or values', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": ',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: ', ',
        },
        {
          id: '4',
          type: ValueSegmentType.TOKEN,
          value: "action('A')['id']",
        },
        {
          id: '5',
          type: ValueSegmentType.LITERAL,
          value: ': "value"}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ Key: '@triggerBody()', "@action('A')['id']": 'value' });
  });

  it('should handle escaped double quotes', () => {
    const parameterValue = [
        {
          value: '{ "',
          id: '0.1',
          type: ValueSegmentType.LITERAL,
        },
        {
          value: 'triggerBody()?.ID',
          id: '0.2',
          type: ValueSegmentType.TOKEN,
          token: {
            key: 'body.$.ID',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          value: '": "\\"Hello, world!\\"" }', // "Hello, world!"
          id: '0.3',
          type: ValueSegmentType.LITERAL,
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ '@{triggerBody()?.ID}': '"Hello, world!"' });
  });

  it('should handle escaped double quotes as unicode character', () => {
    const parameterValue = [
        {
          value: '{ "',
          id: '0.1',
          type: ValueSegmentType.LITERAL,
        },
        {
          value: 'triggerBody()?.ID',
          id: '0.2',
          type: ValueSegmentType.TOKEN,
          token: {
            key: 'body.$.ID',
            tokenType: TokenType.OUTPUTS,
          },
        },
        {
          value: '": "\\u0022Hello, world!\\u0022" }', // "Hello, world!"
          id: '0.3',
          type: ValueSegmentType.LITERAL,
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ '@{triggerBody()?.ID}': '"Hello, world!"' });
  });

  it('should string interpolate strings if they are within quotes', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": "',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: '"}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ Key: '@{triggerBody()}' });
  });

  it('should allow multiple tokens as part of a key or value', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": ',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: `body('A0')`,
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: '}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ Key: "@triggerBody()@body('A0')" });
  });

  it('should allow string interpolating multiple tokens as part of a key or value', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": "',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: ' intermediate text ',
        },
        {
          id: '4',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: '"}',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(JSON.parse(parameterJson)).toEqual({ Key: '@{triggerBody()} intermediate text @{triggerBody()}' });
  });

  // BUG: 5826251:Designer adds extra escaped quotes to expressions
  it('should return the unmodified stringified version of expressions when value is not valid json', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key": ',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: ' intermediate text ',
        },
        {
          id: '4',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(parameterJson).toEqual(`{"Key": @{triggerBody()} intermediate text @{triggerBody()}`);
  });

  it('should return the unmodified stringified version of expressions when value has invalid quotes in keys', () => {
    const parameterValue = [
        {
          id: '1',
          type: ValueSegmentType.LITERAL,
          value: '{"Key1": "',
        },
        {
          id: '2',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '3',
          type: ValueSegmentType.LITERAL,
          value: ', "Key2": ',
        },
        {
          id: '4',
          type: ValueSegmentType.TOKEN,
          value: 'triggerBody()',
          token: {
            key: 'body.$',
            tokenType: TokenType.OUTPUTS,
            type: 'string',
          },
        },
        {
          id: '5',
          type: ValueSegmentType.LITERAL,
          value: ', "Key3": "Value" }',
        },
      ],
      parameterJson = parameterValueToJSONString(parameterValue);

    expect(parameterJson).toEqual(`{"Key1": "@{triggerBody()}, "Key2": @{triggerBody()}, "Key3": "Value" }`);
  });

  it('should handle double quotes in non-interpolated expression tokens', () => {
    const parameterValue: ValueSegment[] = [
      {
        value: '{\n',
        id: '1',
        type: ValueSegmentType.LITERAL,
      },
      {
        value: '  "newUnb3_1": ',
        id: '3',
        type: ValueSegmentType.LITERAL,
      },
      {
        token: {
          key: 'inbuilt.function',
          brandColor: '#AD008C',
          expression: {
            dereferences: [],
            arguments: [
              {
                dereferences: [],
                endPosition: 24,
                expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
                arguments: [
                  {
                    dereferences: [],
                    endPosition: 23,
                    expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
                    arguments: [],
                    name: 'triggerBody',
                    startPosition: 10,
                    type: ExpressionType.Function,
                  },
                ],
                name: 'xml',
                startPosition: 6,
                type: ExpressionType.Function,
              },
              {
                type: ExpressionType.StringLiteral,
                value: 'string(/*[local-name()="DynamicsSOCSV"])',
              },
            ],
            endPosition: 69,
            expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
            name: 'xpath',
            startPosition: 0,
            type: ExpressionType.Function,
          },
          icon: '...',
          title: 'xpath(...)',
          tokenType: TokenType.FX,
        },
        value: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
        id: '4',
        type: ValueSegmentType.TOKEN,
      },
      {
        value: '\n',
        id: '5',
        type: ValueSegmentType.LITERAL,
      },
      {
        value: '}',
        id: '7',
        type: ValueSegmentType.LITERAL,
      },
    ];

    expect(parameterValueToJSONString(parameterValue, /* applyCasting */ false, /* forValidation */ true)).toBe(
      '{"newUnb3_1":"@xpath(xml(triggerBody()), \'string(/*[local-name()=\\"DynamicsSOCSV\\"])\')"}'
    );
  });

  it('should handle double quotes in interpolated expression tokens which require casting', () => {
    const parameterValue: ValueSegment[] = [
      {
        value: '{\n',
        id: '1',
        type: ValueSegmentType.LITERAL,
      },
      {
        value: '  "newUnb3_1": "',
        id: '3',
        type: ValueSegmentType.LITERAL,
      },
      {
        token: {
          key: 'inbuilt.function',
          brandColor: '#AD008C',
          expression: {
            dereferences: [],
            endPosition: 69,
            expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
            name: 'xpath',
            arguments: [
              {
                dereferences: [],
                endPosition: 24,
                expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
                arguments: [
                  {
                    dereferences: [],
                    expression: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
                    endPosition: 23,
                    arguments: [],
                    name: 'triggerBody',
                    startPosition: 10,
                    type: ExpressionType.Function,
                  },
                ],
                name: 'xml',
                startPosition: 6,
                type: ExpressionType.Function,
              },
              {
                type: ExpressionType.StringLiteral,
                value: 'string(/*[local-name()="DynamicsSOCSV"])',
              },
            ],
            startPosition: 0,
            type: ExpressionType.Function,
          },
          icon: '...',
          title: 'xpath(...)',
          tokenType: TokenType.FX,
        },
        value: 'xpath(xml(triggerBody()), \'string(/*[local-name()="DynamicsSOCSV"])\')',
        id: '4',
        type: ValueSegmentType.TOKEN,
      },
      {
        value: '"\n',
        id: '5',
        type: ValueSegmentType.LITERAL,
      },
      {
        value: '}',
        id: '7',
        type: ValueSegmentType.LITERAL,
      },
    ];

    expect(parameterValueToJSONString(parameterValue, /* applyCasting */ false, /* forValidation */ true)).toBe(
      '{"newUnb3_1":"@{xpath(xml(triggerBody()), \'string(/*[local-name()=\\"DynamicsSOCSV\\"])\')}"}'
    );
  });
});

describe('parameterValueToString', () => {
  let parameter: ParameterInfo;
  const emptyLiteral: ValueSegment = {
    id: 'key',
    type: ValueSegmentType.LITERAL,
    value: '',
  };

  beforeEach(() => {
    parameter = {
      parameterKey: 'builtin.$.input',
      parameterName: 'Input',
      id: 'Input',
      type: 'string',
      label: 'Input',
      info: {},
      required: true,
      value: [],
    };
  });

  it('should string interpolate the token expressions if value has multiple segments if suppress casting is enabled for string/binary parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Test-',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'binary';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('Test-@{triggerBody()}');
  });

  it('should string interpolate the token expressions if value has multiple segments if suppress casting is enabled for string no format parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Test-',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'string';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('Test-@{triggerBody()}');
  });

  it('should NOT string interpolate the token expressions if value has only the token if suppress casting is enabled for string no format parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'string';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@triggerBody()');
  });

  it('should NOT string interpolate the token expressions if value has only the token if suppress casting is enabled for string/binary parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'binary';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@triggerBody()');
  });

  it('should NOT string interpolate the token expressions if value has only the token if suppress casting is enabled for integer parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'integer';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@triggerBody()');
  });

  it('should NOT string interpolate the token expressions if value has multiple segments if suppress casting is enabled for integer parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Test-',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
        },
      },
    ];
    parameter.type = 'integer';
    parameter.suppressCasting = true;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('Test-@triggerBody()');
  });

  it('should string interpolate the single expression if the value is string/binary.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = undefined;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@{triggerBody()}');
  });

  it('should string interpolate the single expression if the value is string/binary for path parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = undefined;
    parameter.info.in = 'path';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@{encodeURIComponent(triggerBody())}');
  });

  it('should add encoding if path parameter is required but not set.', () => {
    parameter.value = [emptyLiteral];
    parameter.type = 'string';
    parameter.info.format = undefined;
    parameter.info.in = 'path';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent('')}");
  });

  it('should not string interpolate the single expression if the value is string/binary and the parameter has specific format.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'uri';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@triggerBody()');
  });

  it('should cast string/byte to string/binary using base64ToBinary.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'byte',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@base64ToBinary(triggerBody())');
  });

  it('should cast string/byte to file using base64ToBinary.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'byte',
        },
      },
    ];
    parameter.type = 'file';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@base64ToBinary(triggerBody())');
  });

  it('should cast string/datauri to string/binary using decodeDataUri.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'datauri',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@decodeDataUri(triggerBody())');
  });

  it('should cast string/datauri to file using decodeDataUri.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'datauri',
        },
      },
    ];
    parameter.type = 'file';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@decodeDataUri(triggerBody())');
  });

  it('should cast string/binary to string/byte correctly.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'byte';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@{base64(triggerBody())}');
  });

  it('should cast file to string/byte correctly.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'file',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'byte';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@{base64(triggerBody())}');
  });

  it('should cast string/binary to string/datauri correctly.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'datauri';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{concat('data:;base64,',base64(triggerBody()))}");
  });

  it('should cast file to string/datauri correctly.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: 'triggerBody()',
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'file',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.format = 'datauri';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{concat('data:;base64,',base64(triggerBody()))}");
  });

  it('should return the preserved value as is if the preserved value is a string.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'A STRING',
      },
    ];
    parameter.info.format = '';
    parameter.preservedValue = 'PRESERVED STRING';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('PRESERVED STRING');
  });

  it('should not return the preserved value if isDefinitionValue is false.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'A STRING',
      },
    ];
    parameter.info.format = '';
    parameter.preservedValue = 'PRESERVED STRING';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ false);
    expect(expressionString).toEqual('A STRING');
  });

  it('should return the JSON string if the preserved value is not a string.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'A STRING',
      },
    ];
    parameter.info.format = '';
    parameter.preservedValue = 123;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('123');
  });

  it('should return the JSON string if the preserved value is an object.', () => {
    const preservedValue = { a: 1 };
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'A STRING',
      },
    ];
    parameter.info.format = '';
    parameter.preservedValue = preservedValue;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(JSON.stringify(preservedValue));
  });

  it('should be correct for a parameter with only user entered text', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'A STRING',
      },
    ];
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('A STRING');
  });

  // TODO - Need to check if this scenario makes sense after token picker is integrated
  xit('should be correct for a parameter with user entered template functions', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: '@guid()',
      },
    ];
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@guid()');
  });

  it('should be correct for a parameter with user entered unsupported types', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        token: {
          key: 'userentered',
          tokenType: TokenType.OUTPUTS,
        },
        value: "trigger()['outputs']",
      },
    ];
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@trigger()['outputs']");
  });

  it('should return stringified falsy values', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '0',
      },
    ];
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, true);
    expect(expressionString).toEqual('0');
  });

  it('should be correct for a parameter with only user entered text that needs to be cast to a different format', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: `user entered text`,
      },
    ];
    parameter.info.format = 'byte';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`@{base64('user entered text')}`);
  });

  it('should not modify user entered text if field is binary', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: `user entered text`,
      },
    ];
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`user entered text`);
  });

  it('should not add string interpolation with one selected token of type "string"', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['path']`,
        token: {
          key: 'body.$.path',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'path',
          type: 'string',
        },
      },
    ];
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`@body('action')['path']`);
  });

  for (const tokenType of ['number', 'integer', 'any', 'object', 'array']) {
    // eslint-disable-next-line no-loop-func
    it(`should add string interpolation with one selected token of type ${tokenType}`, () => {
      parameter.value = [
        {
          id: '1',
          type: ValueSegmentType.TOKEN,
          value: `body('action')['path']`,
          token: {
            key: 'body.$.path',
            tokenType: TokenType.OUTPUTS,
            actionName: 'action',
            name: 'path',
            type: tokenType,
          },
        },
      ];
      parameter.info.format = '';

      const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
      expect(expressionString).toEqual(`@{body('action')['path']}`);
    });
  }

  it('should be correct for a parameter with one selected token that needs to be cast to a different format', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['path']`,
        token: {
          key: 'body.$.path',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'path',
          type: 'string',
          format: 'binary',
        },
      },
    ];
    parameter.info.format = 'byte';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`@{base64(body('action')['path'])}`);
  });

  it('should be correct for a parameter with mix of text and tokens interpolated to string', () => {
    parameter.value = [
      {
        id: '2',
        type: ValueSegmentType.LITERAL,
        value: 'Hello, ',
      },
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'name',
          type: 'string',
          format: '',
        },
      },
    ];
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`Hello, @{body('action')['name']}`);
  });

  it('should be correct for a parameter with mix of text and tokens that need to be cast to a different format', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Blah blah',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'name',
          type: 'string',
          format: '',
        },
      },
    ];
    parameter.info.format = 'datauri';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`@{concat('data:,',encodeURIComponent(concat('Blah blah',body('action')['name'])))}`);
  });

  it('generates interpolated syntax for tokens when casting is not required', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Blah blah',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'name',
          type: 'string',
          format: 'binary',
        },
      },
      {
        id: '3',
        type: ValueSegmentType.TOKEN,
        value: `body('action')['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          actionName: 'action',
          name: 'name',
          type: 'string',
          format: '',
        },
      },
    ];
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`Blah blah@{body('action')['name']}@{body('action')['name']}`);
  });

  it('should add encodeURIComponent function according to encode in swagger when entered for path parameter', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: 'Some url value',
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent('Some url value'))}");
  });

  it('should add encodeURIComponent function according to encode in swagger for token input', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          name: 'name',
          type: 'string',
        },
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent(triggerBody()['name']))}");
  });

  it('should add encodeURIComponent function for mix of tokens in path parameter', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: `Some value `,
      },
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['name']`,
        token: {
          key: 'body.$.name',
          tokenType: TokenType.OUTPUTS,
          name: 'name',
          type: 'string',
        },
      },
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: ` ending value`,
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent('Some value ',triggerBody()['name'],' ending value'))}");
  });

  it('should add encodeURIComponent and casting to the tokens used in path parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()`,
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'byte',
        },
      },
    ];
    parameter.type = 'string';
    parameter.info.in = 'path';
    parameter.info.encode = 'double';
    parameter.info.format = 'binary';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual('@{encodeURIComponent(encodeURIComponent(base64ToBinary(triggerBody())))}');
  });

  it('should add encodeURIComponent and casting to the tokens used in path parameter.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()`,
        token: {
          key: 'body.$',
          tokenType: TokenType.OUTPUTS,
          type: 'string',
          format: 'byte',
        },
      },
      {
        id: '2',
        type: ValueSegmentType.LITERAL,
        value: 'Blah',
      },
    ];
    parameter.type = 'string';
    parameter.info.in = 'path';
    parameter.info.encode = 'single';
    parameter.info.format = '';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`@{encodeURIComponent(base64ToString(triggerBody()),'Blah')}`);
  });

  it('should add string function with encode when the path parameter is not string and has tokens', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['id']`,
        token: {
          key: 'body.$.id',
          tokenType: TokenType.OUTPUTS,
          name: 'id',
          type: 'string',
        },
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';
    parameter.type = 'integer';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent(triggerBody()['id']))}");
  });

  it('should not add string function with encode even if the path parameter is not string.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '2',
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';
    parameter.type = 'integer';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent('2'))}");
  });

  it('should trim the empty tokens in value and encode path parameter appropriately.', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '',
      },
      {
        id: '1',
        type: ValueSegmentType.TOKEN,
        value: `body('A1')['Id']`,
        token: {
          key: 'body.$.Id',
          tokenType: TokenType.OUTPUTS,
          actionName: 'A1',
          name: 'Id',
          title: 'ID',
        },
      },
    ];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';
    parameter.type = 'integer';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual("@{encodeURIComponent(encodeURIComponent(body('A1')['Id']))}");
  });

  it('should not add casting/encode functions if path parameter has empty expressions', () => {
    parameter.value = [emptyLiteral];
    parameter.info.encode = 'double';
    parameter.info.in = 'path';
    parameter.info.format = '';
    parameter.type = 'string';
    parameter.required = false;

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toBe('');
  });

  it('should convert user typed text in a json formatted field to json', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '{"Accept-Language": "en-US"}',
      },
    ];
    parameter.type = 'object';
    parameter.info.format = '';
    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ false);
    expect(expressionString).toEqual(`{"Accept-Language":"en-US"}`);
  });

  it('should convert a mix of text and tokens in a json formatted field to json', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '{"Accept-Language": ',
      },
      {
        id: '2',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['id']`,
        token: {
          key: 'body.$.id',
          tokenType: TokenType.OUTPUTS,
          name: 'id',
        },
      },
      {
        id: '3',
        type: ValueSegmentType.LITERAL,
        value: ',"',
      },
      {
        id: '4',
        type: ValueSegmentType.TOKEN,
        value: `body('A0')['id']`,
        token: {
          key: 'body.$.id',
          tokenType: TokenType.OUTPUTS,
          actionName: 'A0',
          name: 'id',
        },
      },
      {
        id: '5',
        type: ValueSegmentType.TOKEN,
        value: `body('A1')['id']`,
        token: {
          key: 'body.$.id',
          tokenType: TokenType.OUTPUTS,
          actionName: 'A1',
          name: 'id',
        },
      },
      {
        id: '6',
        type: ValueSegmentType.LITERAL,
        value: '": "gzip, ',
      },
      {
        id: '7',
        type: ValueSegmentType.TOKEN,
        value: `body('A1')['property']`,
        token: {
          key: 'body.$.property',
          tokenType: TokenType.OUTPUTS,
          actionName: 'A1',
          name: 'property',
        },
      },
      {
        id: '8',
        type: ValueSegmentType.LITERAL,
        value: '"}',
      },
    ];
    parameter.info.format = '';
    parameter.type = 'object';
    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ false) as string;
    expect(JSON.parse(expressionString)).toEqual({
      'Accept-Language': "@triggerBody()['id']",
      "@{body('A0')['id']}@{body('A1')['id']}": "gzip, @{body('A1')['property']}",
    });
  });

  it('should fall back to stringifying a json formatted field if parsing json fails', () => {
    parameter.value = [
      {
        id: '1',
        type: ValueSegmentType.LITERAL,
        value: '{"Invalid json}',
      },
    ];
    parameter.info.format = '';
    parameter.type = 'object';
    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ false);
    expect(expressionString).toEqual('{"Invalid json}');
  });

  // BUG: 5826251:Designer adds extra escaped quotes to expressions
  it('should stringify input as string when type is any and value is not json object', () => {
    parameter.value = [
      {
        id: '0.1',
        type: ValueSegmentType.LITERAL,
        value: 'Random text ',
      },
      {
        id: '0.2',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['ID']`,
        token: {
          key: 'body.$.ID',
          tokenType: TokenType.OUTPUTS,
          name: 'ID',
        },
      },
    ];
    parameter.info = {
      format: '',
    };
    parameter.required = false;
    parameter.type = 'any';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
    expect(expressionString).toEqual(`Random text @{triggerBody()['ID']}`);
  });

  it('should convert input as json when type is any and value is json object format', () => {
    parameter.value = [
      {
        id: '0.1',
        type: ValueSegmentType.LITERAL,
        value: '  { "Random text ',
      },
      {
        id: '0.2',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['ID']`,
        token: {
          key: 'body.$.ID',
          tokenType: TokenType.OUTPUTS,
          name: 'ID',
        },
      },
      {
        id: '0.3',
        type: ValueSegmentType.LITERAL,
        value: '": ',
      },
      {
        id: '0.4',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['Value']`,
        token: {
          key: 'body.$.Value',
          tokenType: TokenType.OUTPUTS,
          name: 'Value',
        },
      },
      {
        id: '0.5',
        type: ValueSegmentType.LITERAL,
        value: '}  ',
      },
    ];
    parameter.info = {
      format: '',
    };
    parameter.required = false;
    parameter.type = 'any';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true) as string;
    expect(JSON.parse(expressionString)).toEqual({ "Random text @{triggerBody()['ID']}": "@triggerBody()['Value']" });
  });

  it('should convert input as json when type is array and value is json array format', () => {
    parameter.value = [
      {
        id: '0.1',
        type: ValueSegmentType.LITERAL,
        value: '  [{ "Name',
      },
      {
        id: '0.3',
        type: ValueSegmentType.LITERAL,
        value: '": ',
      },
      {
        id: '0.4',
        type: ValueSegmentType.TOKEN,
        value: `triggerBody()['Value']`,
        token: {
          key: 'body.$.Value',
          tokenType: TokenType.OUTPUTS,
          name: 'Value',
        },
      },
      {
        id: '0.5',
        type: ValueSegmentType.LITERAL,
        value: '}',
      },
      {
        id: '0.6',
        type: ValueSegmentType.LITERAL,
        value: ']',
      },
    ];
    parameter.info = {
      format: '',
    };
    parameter.required = false;
    parameter.type = 'array';

    const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true) as string;
    expect(JSON.parse(expressionString)).toEqual([{ Name: "@triggerBody()['Value']" }]);
  });
});
