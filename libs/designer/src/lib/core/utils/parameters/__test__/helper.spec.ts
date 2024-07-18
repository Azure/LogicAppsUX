import {
  canConvertToComplexCondition,
  getParameterEditorProps,
  parameterValueToJSONString,
  parameterValueToString,
  getExpressionValueForOutputToken,
  updateParameterWithValues,
  toArrayViewModelSchema,
  toHybridConditionViewModel,
  getTokenExpressionMethodFromKey,
  loadDynamicContentForInputsInNode,
  loadParameterValue,
} from '../helper';
import * as Helper from '../helper';
import type { DictionaryEditorItemProps, ParameterInfo, ValueSegment, OutputToken } from '@microsoft/designer-ui';
import { GroupDropdownOptions, GroupType, TokenType, ValueSegmentType } from '@microsoft/designer-ui';
import type { DynamicListExtension, LegacyDynamicValuesExtension, InputParameter } from '@microsoft/logic-apps-shared';
import { DynamicValuesType, ExpressionType } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('core/utils/parameters/helper', () => {
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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
              title: 'body',
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

    it('should return key value input from dictionary editor without wrapping single token in @{}', () => {
      const parameterValue = [
          {
            id: '1',
            type: ValueSegmentType.LITERAL,
            value: '{\n ',
          },
          {
            id: '2',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '3',
            type: ValueSegmentType.LITERAL,
            value: 'Key of the row',
          },
          {
            id: '4',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '5',
            type: ValueSegmentType.LITERAL,
            value: ' : ',
          },
          {
            id: '6',
            type: ValueSegmentType.TOKEN,
            value: "item()?['someItem']",
            token: {
              key: 'outputs.$',
              tokenType: TokenType.OUTPUTS,
              type: 'string',
              title: 'someItem',
            },
          },
          {
            id: '7',
            type: ValueSegmentType.LITERAL,
            value: '\n}',
          },
        ],
        parameterJson = parameterValueToJSONString(parameterValue);

      expect(parameterJson).toEqual(`{"Key of the row":"@item()?['someItem']"}`);
    });

    it('should return key value input from dictionary editor with wrapping token in @{} to honor the included string and stringify as a whole', () => {
      const parameterValue = [
          {
            id: '1',
            type: ValueSegmentType.LITERAL,
            value: '{\n ',
          },
          {
            id: '2',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '3',
            type: ValueSegmentType.LITERAL,
            value: 'Key of the row',
          },
          {
            id: '4',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '5',
            type: ValueSegmentType.LITERAL,
            value: ' : ',
          },
          {
            id: '6',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '7',
            type: ValueSegmentType.LITERAL,
            value: 'Value of the row:',
          },
          {
            id: '8',
            type: ValueSegmentType.TOKEN,
            value: "item()?['someItem']",
            token: {
              key: 'outputs.$',
              tokenType: TokenType.OUTPUTS,
              type: 'string',
              title: 'someItem',
            },
          },
          {
            id: '9',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '10',
            type: ValueSegmentType.LITERAL,
            value: '\n}',
          },
        ],
        parameterJson = parameterValueToJSONString(parameterValue);

      expect(parameterJson).toEqual(`{"Key of the row":"Value of the row:@{item()?['someItem']}"}`);
    });

    it('should return key value input from dictionary editor with wrapping token in @{} to honor the other token input and stringify as a whole', () => {
      const parameterValue = [
          {
            id: '1',
            type: ValueSegmentType.LITERAL,
            value: '{\n ',
          },
          {
            id: '2',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '3',
            type: ValueSegmentType.LITERAL,
            value: 'Key of the row',
          },
          {
            id: '4',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '5',
            type: ValueSegmentType.LITERAL,
            value: ' : ',
          },
          {
            id: '6',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '7',
            type: ValueSegmentType.TOKEN,
            value: "item()?['someItem1']",
            token: {
              key: 'outputs.$',
              tokenType: TokenType.OUTPUTS,
              type: 'string',
              title: 'someItem1',
            },
          },
          {
            id: '8',
            type: ValueSegmentType.TOKEN,
            value: "item()?['someItem2']",
            token: {
              key: 'outputs.$',
              tokenType: TokenType.OUTPUTS,
              type: 'string',
              title: 'someItem2',
            },
          },
          {
            id: '9',
            type: ValueSegmentType.LITERAL,
            value: '"',
          },
          {
            id: '10',
            type: ValueSegmentType.LITERAL,
            value: '\n}',
          },
        ],
        parameterJson = parameterValueToJSONString(parameterValue);

      expect(parameterJson).toEqual(`{"Key of the row":"@{item()?['someItem1']}@{item()?['someItem2']}"}`);
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
            title: 'body',
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
    test.skip('should be correct for a parameter with user entered template functions', () => {
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
            title: 'outputs',
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
            title: 'path',
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
              title: 'path',
              type: tokenType,
            },
          },
        ];
        parameter.info.format = '';

        const expressionString = parameterValueToString(parameter, /* isDefinitionValue */ true);
        expect(expressionString).toEqual(`@body('action')['path']`);
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
            title: 'path',
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
            title: 'name',
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
            title: 'name',
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
            title: 'name',
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
            title: 'name',
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
            title: 'name',
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
            title: 'name',
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
            title: 'body',
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
            title: 'body',
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
            title: 'id',
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
            title: 'id',
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
            title: 'id',
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
            title: 'id',
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
            title: 'property',
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
            title: 'ID',
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
            title: 'ID',
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
            title: 'Value',
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
            title: 'Value',
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

  describe('getParameterEditorProps', () => {
    describe('gets props for "any" data types which', () => {
      it('are accurate for "Response" -> "Body"', () => {
        const dataType = 'any';
        const inputSchema = {
          title: 'Body',
          'x-ms-visibility': 'important',
        };
        const inputParameter: InputParameter = {
          editor: undefined,
          editorOptions: undefined,
          key: 'inputs.$.body',
          name: 'body',
          required: false,
          schema: inputSchema,
          title: 'Body',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: undefined,
          editorOptions: undefined,
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for array data types which', () => {
      it('are accurate for "Select" -> "From"', () => {
        const dataType = 'array';
        const itemSchema = {};
        const inputSchema = {
          required: true,
          title: 'From',
          type: dataType,
        };
        const inputParameter: InputParameter = {
          editor: undefined,
          editorOptions: undefined,
          itemSchema,
          key: 'inputs.$.from',
          name: 'from',
          required: true,
          schema: inputSchema,
          title: 'From',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: dataType,
          editorOptions: undefined,
          editorViewModel: { ...toArrayViewModelSchema(itemSchema), uncastedValue: parameterValue },
          schema: inputSchema,
        });
      });

      it('are accurate for "Publish Events" -> "Event Grid Events"', () => {
        const dataType = 'array';
        const itemSchema = {
          properties: {
            // Very abbreviated from actual data.
            data: { title: 'Data' },
            id: { minLength: 1, title: 'Id' },
          },
          required: ['data', 'id'],
          type: 'object',
        };
        const inputSchema = {
          required: true,
          title: 'Event Grid Events',
          type: dataType,
        };
        const inputParameter: InputParameter = {
          editor: undefined,
          editorOptions: undefined,
          itemSchema,
          key: 'inputs.$.events',
          name: 'events',
          required: true,
          schema: inputSchema,
          title: 'Event Grid Events',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        const { editorViewModel, ...otherValues } = result;

        expect(otherValues).toEqual({
          editor: dataType,
          editorOptions: undefined,
          schema: {
            ...inputSchema,
            'x-ms-editor': dataType,
          },
        });

        expect(editorViewModel).toMatchObject({ ...toArrayViewModelSchema(itemSchema), uncastedValue: parameterValue });
      });
    });

    describe('gets props for boolean data types which', () => {
      it('are accurate for "Copy File" -> "Overwrite destination file"', () => {
        const dataType = 'boolean';
        const inputSchema = {
          title: 'Overwrite destination file',
          type: dataType,
        };
        const inputParameter: InputParameter = {
          editor: undefined,
          editorOptions: undefined,
          key: 'inputs.$.source',
          name: 'source',
          required: true,
          schema: inputSchema,
          title: 'Overwrite destination file',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: undefined,
          editorOptions: undefined,
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });

      it('are accurate for "Create file" -> "Query Parameters Single-encoded"', () => {
        const dataType = 'boolean';
        const inputSchema = {
          default: true,
          type: dataType,
          'x-ms-visibility': 'internal',
        };
        const inputParameter: InputParameter = {
          default: true,
          editor: undefined,
          editorOptions: undefined,
          enum: [
            { displayName: '', value: '' },
            { displayName: 'Yes', value: true },
            { displayName: 'No', value: false },
          ],
          in: 'query',
          key: 'query.$.queryParametersSingleEncoded',
          name: 'queryParametersSingleEncoded',
          required: false,
          schema: inputSchema,
          type: dataType,
          value: true,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: 'combobox',
          editorOptions: {
            options: [
              {
                displayName: '',
                key: '',
                value: '',
              },
              {
                displayName: 'Yes',
                key: 'Yes',
                value: 'true',
              },
              {
                displayName: 'No',
                key: 'No',
                value: 'false',
              },
            ],
          },
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for combobox editor types which', () => {
      const editorType = 'combobox';

      it('are accurate for "Add to time" -> "Time unit" (not dynamic)', () => {
        const options = [
          { displayName: 'Hour', value: 'Hour' },
          { displayName: 'Minute', value: 'Minute' },
        ];
        const dataType = 'string';
        const defaultValue = 'Hour';
        const inputSchema = {
          default: defaultValue,
          title: 'Time unit',
          type: dataType,
          'x-ms-editor': editorType,
          'x-ms-editor-options': { options },
        };
        const inputParameter: InputParameter = {
          default: defaultValue,
          editor: editorType,
          editorOptions: { options },
          key: 'inputs.$.timeUnit',
          name: 'timeUnit',
          required: true,
          schema: inputSchema,
          title: 'Time unit',
          type: dataType,
          value: defaultValue,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: editorType,
          editorOptions: { options },
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });

      it('are accurate for "Create a new queue" -> "Queue name" (dynamic list)', () => {
        const options = [{ displayName: 'My Queue', value: 'My Queue' }];
        const dataType = 'string';
        const dynamicValuesExtension: DynamicListExtension = {
          dynamicState: {
            operationId: 'listQueuesForDynamicSchema',
          },
          parameters: {},
        };
        const inputSchema = {
          title: 'Queue name',
          type: dataType,
          'x-ms-dynamic-list': dynamicValuesExtension,
        };
        const inputParameter: InputParameter = {
          dynamicValues: {
            extension: dynamicValuesExtension,
            type: DynamicValuesType.DynamicList,
          },
          editor: editorType,
          editorOptions: { options },
          key: 'inputs.$.queueName',
          name: 'queueName',
          required: true,
          schema: inputSchema,
          title: 'Queue name',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: editorType,
          editorOptions: { options },
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });

      it('are accurate for "When a file is created" -> "Folder Id" (dynamic tree)', () => {
        const options = [{ displayName: 'My Folder', value: 'My Folder' }];
        const dataType = 'string';
        const dynamicValuesExtension: LegacyDynamicValuesExtension = {
          capability: 'file-picker',
          parameters: {
            // Implementation omitted for brevity.
            isFolder: true,
          },
          'value-path': 'Id',
          operationId: 'opId',
        };
        const inputSchema = {
          type: dataType,
          'x-ms-dynamic-tree': {
            // Implementations omitted for brevity.
            browse: {},
            open: {},
            settings: {},
          },
          'x-ms-dynamic-values': dynamicValuesExtension,
          'x-ms-summary': 'Folder',
        };
        const inputParameter: InputParameter = {
          dynamicValues: {
            extension: dynamicValuesExtension,
            type: DynamicValuesType.LegacyDynamicValues,
          },
          editor: editorType,
          editorOptions: { options },
          in: 'query',
          key: 'query.$.folderId',
          name: 'folderId',
          required: true,
          schema: inputSchema,
          title: 'Queue name',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: editorType,
          editorOptions: { options },
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for condition editor types which', () => {
      const editorType = 'condition';

      it('are accurate for "Until" -> "Loop until"', () => {
        const dataType = 'object';
        const valueType = 'string';
        const options = { isOldFormat: true };
        const inputSchema = {
          title: 'Loop until',
          type: valueType,
          'x-ms-editor': editorType,
          'x-ms-editor-options': options,
        };
        const inputParameter: InputParameter = {
          editor: editorType,
          editorOptions: options,
          key: 'inputs.$.expression',
          name: 'expression',
          required: true,
          schema: inputSchema,
          title: 'Loop until',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: editorType,
          editorOptions: options,
          editorViewModel: {
            ...options,
          },
          schema: inputSchema,
        });
      });
    });

    describe('gets props for dictionary editor types which', () => {
      const editorType = 'dictionary';

      it('are accurate for "Response" -> "Headers"', () => {
        const dataType = 'object';
        const valueType = 'string';
        const inputSchema = {
          title: 'Headers',
          type: dataType,
          'x-ms-editor': editorType,
          'x-ms-editor-options': { valueType },
          'x-ms-visibility': 'important',
        };
        const inputParameter: InputParameter = {
          editor: editorType,
          editorOptions: { valueType },
          key: 'inputs.$.headers',
          name: 'headers',
          required: true,
          schema: inputSchema,
          title: 'Headers',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        const { editorViewModel, ...otherValues } = result;

        expect(otherValues).toMatchObject({
          editor: editorType,
          editorOptions: { valueType },
          schema: inputSchema,
        });

        const editorViewModelItems: DictionaryEditorItemProps[] = editorViewModel.items;
        expect(Array.isArray(editorViewModelItems)).toBe(true);
        expect(editorViewModelItems.length).toBe(1);

        expect(Array.isArray(editorViewModelItems[0].key)).toBe(true);
        expect(editorViewModelItems[0].key[0].id).toBeTruthy();
        expect(editorViewModelItems[0].key[0].type).toBe('literal');
        expect(editorViewModelItems[0].key[0].value).toBe('');

        expect(Array.isArray(editorViewModelItems[0].value)).toBe(true);
        expect(editorViewModelItems[0].value[0].id).toBeTruthy();
        expect(editorViewModelItems[0].value[0].type).toBe('literal');
        expect(editorViewModelItems[0].value[0].value).toBe('');
      });
    });

    describe('gets props for integer data types which', () => {
      it('are accurate for "Response" -> "Status Code"', () => {
        const dataType = 'integer';
        const defaultValue = 200;
        const inputSchema = {
          default: defaultValue,
          required: true,
          title: 'Status Code',
          type: dataType,
        };
        const inputParameter: InputParameter = {
          default: defaultValue,
          editor: undefined,
          editorOptions: undefined,
          key: 'inputs.$."inputs.$.statusCode"',
          name: '"inputs.$.statusCode"',
          required: true,
          schema: inputSchema,
          title: 'Status Code',
          type: dataType,
          value: defaultValue,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: undefined,
          editorOptions: undefined,
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for object data types which', () => {
      it('are accurate for "Response" -> "Response Body JSON Schema"', () => {
        const editorType = 'schema';
        const dataType = 'object';
        const inputSchema = {
          title: 'Response Body JSON Schema',
          type: dataType,
          'x-ms-editor': editorType,
        };
        const inputParameter: InputParameter = {
          editor: editorType,
          editorOptions: undefined,
          key: 'inputs.$.schema',
          name: 'schema',
          required: false,
          schema: inputSchema,
          title: 'Response Body JSON Schema',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: editorType,
          editorOptions: undefined,
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for string data types which', () => {
      it('are accurate for "Copy File" -> "Source file path"', () => {
        const dataType = 'string';
        const inputSchema = {
          title: 'Source file path',
          type: dataType,
        };
        const inputParameter: InputParameter = {
          editor: undefined,
          editorOptions: undefined,
          key: 'inputs.$.source',
          name: 'source',
          required: true,
          schema: inputSchema,
          title: 'Source file path',
          type: dataType,
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: undefined,
          editorOptions: undefined,
          editorViewModel: undefined,
          schema: inputSchema,
        });
      });
    });

    describe('gets props for non-combobox enum editor types which', () => {
      it('are accurate for non-OpenAPI "Update a work item" -> "Link Type"', () => {
        const options = [
          { displayName: 'Dependency-forward', value: 'Dependency-forward' },
          { displayName: 'Related', value: 'Related' },
        ];
        const dataType = 'string';
        const defaultValue = 'Related';
        const inputSchema = {
          default: defaultValue,
          enum: ['Dependency-forward', 'Related'], // Keys of `options`.
          title: 'Link Type',
          type: dataType,
          'x-ms-visibility': 'advanced',
        };
        const inputParameter: InputParameter = {
          dynamicValues: undefined,
          editor: undefined,
          editorOptions: undefined,
          enum: options,
          in: 'body',
          key: 'body.$.linkType',
          name: 'linkType',
          required: false,
          schema: inputSchema,
          title: 'Link Type',
          type: dataType,
          value: defaultValue,
          visibility: 'advanced',
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: 'combobox',
          editorOptions: { options },
          editorViewModel: undefined,
          schema: {
            ...inputSchema,
            'x-ms-editor': 'combobox',
          },
        });
      });

      it('are accurate for OpenAPI "Get current weather" -> "Units"', () => {
        const options = [
          { displayName: 'Imperial', value: 'I' },
          { displayName: 'Metric', value: 'C' },
        ];
        const dataType = 'string';
        const inputSchema = {
          default: 'I',
          enum: ['I', 'C'], // Keys of `options`.
          title: 'Units',
          type: dataType,
          'x-ms-enum-values': options,
          'x-ms-property-name-alias': 'units',
        };
        const inputParameter: InputParameter = {
          dynamicValues: undefined,
          editor: undefined,
          editorOptions: undefined,
          key: '', // Not defined in OpenAPI.
          name: '', // Not defined in OpenAPI.
          schema: inputSchema,
          type: dataType,
          value: 'I',
          visibility: '',
        };
        const parameterValue = loadParameterValue(inputParameter);

        const result = getParameterEditorProps(inputParameter, parameterValue, false, {});

        expect(result).toMatchObject({
          editor: 'combobox',
          editorOptions: { options },
          editorViewModel: undefined,
          schema: {
            ...inputSchema,
            'x-ms-editor': 'combobox',
          },
        });
      });
    });
  });

  describe('getExpressionValueForOutputToken', () => {
    const nodeType = 'Compose';
    let token: OutputToken;
    beforeEach(() => {
      token = {
        key: 'builtin.$.input',
        brandColor: '#111',
        type: 'string',
        title: 'Title',
        outputInfo: {
          type: TokenType.OUTPUTS,
          source: 'body',
          required: true,
        },
      };
    });

    it('should get the body expression for outputs coming from body source in manifest based operation.', () => {
      token.key = 'outputs.$.body.message.id';
      token.outputInfo.actionName = 'Http';

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`body('Http')['message']['id']`);

      token.key = 'outputs.$.body.message.id';
      token.outputInfo.required = false;
      token.outputInfo.actionName = undefined;

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`triggerBody()?['message']?['id']`);
    });

    it('should get the body expression for outputs coming from body source in swagger based operation.', () => {
      token.key = 'body.$.message.id';
      token.outputInfo.required = false;
      token.outputInfo.actionName = 'Http';

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`body('Http')?['message']?['id']`);

      token.key = 'body.$.message.id';
      token.outputInfo.required = true;
      token.outputInfo.actionName = undefined;

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`triggerBody()['message']['id']`);
    });

    it('should get the outputs expression for outputs coming from outputs directly.', () => {
      token.key = 'outputs.$.message.id';
      token.outputInfo.actionName = 'Http';

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`outputs('Http')['message']['id']`);

      token.key = 'outputs.$.message.id';
      token.outputInfo.actionName = undefined;

      expect(getExpressionValueForOutputToken(token, nodeType)).toEqual(`triggerOutputs()['message']['id']`);
    });
  });

  describe('getTokenExpressionMethodFromKey', () => {
    it.each<[string, string | undefined, string]>([
      // For `body.$` and its first-class properties, use BODY.
      ['body.$', undefined, `triggerBody()`],
      ['body.$.value', undefined, `triggerBody()`],
      ['body.$', 'Create_item', `body('Create_item')`],
      ['body.$.ID', 'Create_item', `body('Create_item')`],

      // For `outputs.$` and its first-class properties, use OUTPUTS.
      ['output', undefined, `triggerOutputs()`],
      ['outputs.$', undefined, `triggerOutputs()`],
      ['outputs.$.body', undefined, `triggerOutputs()`],
      ['outputs.$.body/value', undefined, `triggerOutputs()`],
      ['outputs.$.headers', undefined, `triggerOutputs()`],
      ['outputs.$.relativePathParameters', undefined, `triggerOutputs()`],

      // For values using `body/*` syntax, use OUTPUTS.
      ['outputs.$.body/subject', 'Get_event_(V3)', `outputs('Get_event_(V3)')`],
    ])('correctly gets the token expression for "%s"', (key, actionName, expected) => {
      expect(getTokenExpressionMethodFromKey(key, actionName)).toBe(expected);
    });
  });

  describe('updateParameterWithValues', () => {
    test('populates inputs for OpenAPI parameters', () => {
      const availableInputParameters = [
        {
          alias: 'emailMessage/To',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          editor: 'combobox',
          editorOptions: {
            options: [],
          },
          format: 'email',
          key: 'inputs.$.emailMessage.emailMessage/To',
          name: 'emailMessage/To',
          required: true,
          schema: {
            type: 'string',
            title: 'To',
            format: 'email',
            description: 'Specify email addresses separated by semicolons like someone@contoso.com',
            'x-ms-property-name-alias': 'emailMessage/To',
          },
          summary: '',
          title: 'To',
          type: 'string',
        },
        {
          alias: 'emailMessage/Subject',
          description: 'Specify the subject of the mail',
          key: 'inputs.$.emailMessage.emailMessage/Subject',
          name: 'emailMessage/Subject',
          required: true,
          schema: {
            type: 'string',
            title: 'Subject',
            description: 'Specify the subject of the mail',
            'x-ms-property-name-alias': 'emailMessage/Subject',
          },
          summary: '',
          title: 'Subject',
          type: 'string',
        },
        {
          alias: 'emailMessage/Body',
          description: 'Specify the body of the mail',
          format: 'html',
          key: 'inputs.$.emailMessage.emailMessage/Body',
          name: 'emailMessage/Body',
          required: true,
          schema: {
            type: 'string',
            title: 'Body',
            format: 'html',
            description: 'Specify the body of the mail',
            'x-ms-property-name-alias': 'emailMessage/Body',
          },
          summary: '',
          title: 'Body',
          type: 'string',
        },
        {
          alias: 'emailMessage/From',
          description:
            'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox). For more info on granting permissions please refer https://docs.microsoft.com/office365/admin/manage/send-email-as-distribution-list',
          format: 'email',
          key: 'inputs.$.emailMessage.emailMessage/From',
          name: 'emailMessage/From',
          required: false,
          schema: {
            type: 'string',
            title: 'From (Send as)',
            format: 'email',
            description:
              'Email address to send mail from (requires "Send as" or "Send on behalf of" permission for that mailbox). For more info on granting permissions please refer https://docs.microsoft.com/office365/admin/manage/send-email-as-distribution-list',
            'x-ms-property-name-alias': 'emailMessage/From',
          },
          summary: '',
          title: 'From (Send as)',
          type: 'string',
        },
        {
          alias: 'emailMessage/Cc',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          editor: 'combobox',
          editorOptions: {
            options: [],
          },
          format: 'email',
          key: 'inputs.$.emailMessage.emailMessage/Cc',
          name: 'emailMessage/Cc',
          required: false,
          schema: {
            type: 'string',
            title: 'CC',
            'x-ms-dynamic-list': {
              builtInOperation: 'AadGraph.GetUsers',
              itemValuePath: 'mail',
              parameters: {},
            },
            format: 'email',
            description: 'Specify email addresses separated by semicolons like someone@contoso.com',
            'x-ms-property-name-alias': 'emailMessage/Cc',
          },
          summary: '',
          title: 'CC',
          type: 'string',
        },
        {
          alias: 'emailMessage/Bcc',
          description: 'Specify email addresses separated by semicolons like someone@contoso.com',
          editor: 'combobox',
          editorOptions: {
            options: [],
          },
          format: 'email',
          key: 'inputs.$.emailMessage.emailMessage/Bcc',
          name: 'emailMessage/Bcc',
          required: false,
          schema: {
            type: 'string',
            title: 'BCC',
            format: 'email',
            description: 'Specify email addresses separated by semicolons like someone@contoso.com',
            'x-ms-property-name-alias': 'emailMessage/Bcc',
          },
          summary: '',
          title: 'BCC',
          type: 'string',
        },
        {
          alias: 'emailMessage/Attachments',
          description: 'Attachments',
          key: 'inputs.$.emailMessage.emailMessage/Attachments',
          name: 'emailMessage/Attachments',
          required: false,
          schema: {
            type: 'array',
            title: 'Attachments',
            description: 'Attachments',
            'x-ms-property-name-alias': 'emailMessage/Attachments',
          },
          summary: '',
          title: 'Attachments',
          type: 'array',
        },
        {
          alias: 'emailMessage/Sensitivity',
          description: 'Sensitivity',
          editor: 'combobox',
          editorOptions: {
            options: [],
          },
          key: 'inputs.$.emailMessage.emailMessage/Sensitivity',
          name: 'emailMessage/Sensitivity',
          required: false,
          schema: {
            type: 'string',
            title: 'Sensitivity',
            description: 'Sensitivity',
            'x-ms-property-name-alias': 'emailMessage/Sensitivity',
          },
          summary: '',
          title: 'Sensitivity',
          type: 'string',
        },
        {
          alias: 'emailMessage/ReplyTo',
          description: 'The email addresses to use when replying',
          format: 'email',
          key: 'inputs.$.emailMessage.emailMessage/ReplyTo',
          name: 'emailMessage/ReplyTo',
          required: false,
          schema: {
            type: 'string',
            title: 'Reply To',
            format: 'email',
            description: 'The email addresses to use when replying',
            'x-ms-property-name-alias': 'emailMessage/ReplyTo',
          },
          summary: '',
          title: 'Reply To',
          type: 'string',
        },
        {
          alias: 'emailMessage/Importance',
          description: 'Importance',
          key: 'inputs.$.emailMessage.emailMessage/Importance',
          name: 'emailMessage/Importance',
          required: false,
          schema: {
            type: 'string',
            title: 'Importance',
            description: 'Importance',
            'x-ms-property-name-alias': 'emailMessage/Importance',
          },
          summary: '',
          title: 'Importance',
          type: 'string',
        },
      ];

      const updatedInputParameters = updateParameterWithValues(
        'inputs.$',
        {
          'emailMessage/Body': 'test1',
          'emailMessage/Importance': 'Normal',
          'emailMessage/Subject': 'test2',
          'emailMessage/To': 'johndoe@example.com',
        },
        '' /* parameterLocation */,
        availableInputParameters,
        true /* createInvisibleParameter */,
        false /* useDefault */
      );

      expect(updatedInputParameters.length).toBe(availableInputParameters.length);
      expect(updatedInputParameters[0].value).toBe('johndoe@example.com');
      expect(updatedInputParameters[1].value).toBe('test2');
      expect(updatedInputParameters[2].value).toBe('test1');
      expect(updatedInputParameters[9].value).toBe('Normal');
    });
  });

  describe('canConvertToComplexCondition', () => {
    const equalsObject = {
      equals: ["@outputs('Get_manager')?['body/mail']", "@triggerOutputs()?['body/from']"],
    };

    const containsObject = {
      contains: ["@outputs('Get_manager')?['body/mail']", "@triggerOutputs()?['body/from']"],
    };

    const invalidObject = {
      invalidKey: ["@outputs('Get_manager')?['body/mail']", "@triggerOutputs()?['body/from']"],
    };

    test('returns true if input has only one key and it is a valid dropdown value', () => {
      const result = canConvertToComplexCondition(equalsObject);
      expect(result).toBe(true);
    });

    test('returns false if input has more than one key', () => {
      const input = {
        ...equalsObject,
        ...containsObject,
      };
      const result = canConvertToComplexCondition(input);
      expect(result).toBe(false);
    });

    test('returns false if input has "not" key but its value has more than one key', () => {
      const input = {
        not: {
          ...equalsObject,
          ...containsObject,
        },
      };
      const result = canConvertToComplexCondition(input);
      expect(result).toBe(false);
    });

    test('returns true if input has "not" key and its value has only one valid dropdown value', () => {
      const input = {
        not: {
          ...containsObject,
        },
      };
      const result = canConvertToComplexCondition(input);
      expect(result).toBe(true);
    });

    test('returns false if input has "not" key but its value is not a valid dropdown value', () => {
      const input = {
        not: {
          ...invalidObject,
        },
      };
      const result = canConvertToComplexCondition(input);
      expect(result).toBe(false);
    });

    test('returns false if input is an empty object', () => {
      const input = {};
      const result = canConvertToComplexCondition(input);
      expect(result).toBe(false);
    });

    test('returns false if input is undefined', () => {
      const result = canConvertToComplexCondition(undefined);
      expect(result).toBe(false);
    });

    test('returns false if input is null', () => {
      const result = canConvertToComplexCondition(null);
      expect(result).toBe(false);
    });
  });

  describe('toHybridConditionViewModel', () => {
    const greaterObject = {
      greater: ["@outputs('Get_manager')?['body/mail']", "@triggerOutputs()?['body/from']"],
    };
    const emptyCondition = { items: { condition: undefined, items: [], type: 'group' } };
    test('returns empty array of items if input is an empty object', () => {
      const input = {};
      const result = toHybridConditionViewModel(input);
      expect(result).toEqual(emptyCondition);
    });

    test('returns false if input is undefined', () => {
      const result = toHybridConditionViewModel(undefined);
      expect(result).toEqual(emptyCondition);
    });

    test('returns false if input is null', () => {
      const result = toHybridConditionViewModel(null);
      expect(result).toEqual(emptyCondition);
    });

    it('should return the correct view model with "and" condition added', () => {
      const result = toHybridConditionViewModel(greaterObject);
      expect(result.items.type).toEqual(GroupType.GROUP);
      expect(result.items.condition).not.toBeUndefined();
      expect(result.items.condition).toEqual(GroupDropdownOptions.AND);
      expect(result.items.items.length).toEqual(1);
      expect(result.items.items[0].type).toEqual('row');
    });

    it('should return the correct view model without adding "and" condition', () => {
      const input = {
        or: [greaterObject],
      };
      const result = toHybridConditionViewModel(input);
      expect(result.items.type).toEqual(GroupType.GROUP);
      expect(result.items.condition).not.toBeUndefined();
      expect(result.items.condition).toEqual(GroupDropdownOptions.OR);
      expect(result.items.items.length).toEqual(1);
      expect(result.items.items[0].type).toEqual('row');
    });
  });

  describe('loadDynamicContentForInputsInNode', () => {
    const nodeId = 'nodeId';
    const rootState: any = {
      workflow: {},
      operations: {
        operationInfo: { [nodeId]: { operationId: 'opId', connectorId: 'connId', type: 'testType' } },
        inputParameters: {
          [nodeId]: {
            dynamicLoadStatus: 'NotStarted',
            parameterGroups: {
              default: {
                id: 'default',
                parameters: [],
              },
            },
          },
        },
        outputParameters: {},
        dependencies: {
          [nodeId]: { inputs: {}, outputs: {} },
        },
      },
      panel: {},
      connections: {},
      settings: {},
      designerOptions: {},
      designerView: {},
      tokens: {},
      workflowParameters: {},
      staticResults: {},
      customCode: {},
      dev: {},
    };
    const defaultParameters: any[] = [
      {
        id: 'hostworkflowid',
        info: {
          isDynamic: false,
        },
        parameterKey: 'inputs.$.host.workflow.id',
        parameterName: 'host.workflow.id',
        required: true,
        schema: {
          type: 'string',
        },
        type: 'string',
        value: [
          {
            id: '69310D6E-FA52-4744-B55B-0C7802D1EE75',
            type: 'literal',
            value: 'childworkflow1',
          },
        ],
        validationErrors: [],
      },
    ];
    const defaultDependencies: any = {
      'inputs.$.body': {
        definition: {
          type: 'DynamicProperties',
          extension: {
            dynamicState: {
              extension: {
                operationId: 'getWorkflowSwagger',
                parameters: {
                  name: {
                    parameterReference: 'host.workflow.id',
                    required: true,
                  },
                },
              },
              isInput: true,
            },
            parameters: {
              name: {
                parameterReference: 'host.workflow.id',
                required: true,
              },
            },
          },
        },
        dependencyType: 'ApiSchema',
        dependentParameters: {
          hostworkflowId: {
            isValid: true,
          },
        },
        parameter: {
          dynamicSchema: {
            type: 'DynamicProperties',
            extension: {
              dynamicState: {
                extension: {
                  operationId: 'getWorkflowSwagger',
                  parameters: {
                    name: {
                      parameterReference: 'host.workflow.id',
                      required: true,
                    },
                  },
                },
                isInput: true,
              },
              parameters: {
                name: {
                  parameterReference: 'host.workflow.id',
                  required: true,
                },
              },
            },
          },
          key: 'inputs.$.body',
          name: 'body',
          required: false,
          type: 'any',
        },
      },
    };
    const allDynamicParams: any[] = [
      {
        id: 'firstP1',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body',
        },
        parameterKey: 'inputs.$.body.objectType.p1',
        parameterName: 'body.objectType.p1',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.objectType.p1',
          name: 'body.objectType.p1',
          required: true,
          schema: {
            type: 'integer',
          },
          type: 'integer',
          dynamicParameterReference: 'inputs.$.body',
        },
        type: 'integer',
        value: [
          {
            id: 'AC2096BD-7746-4297-9C61-9A141167E4AD',
            type: 'literal',
            value: '1',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'firstP2',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body',
        },
        label: 'Body stringType',
        parameterKey: 'inputs.$.body.stringType',
        parameterName: 'body.stringType',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.stringType',
          name: 'body.stringType',
          required: true,
          schema: {
            type: 'string',
          },
          type: 'string',
          dynamicParameterReference: 'inputs.$.body',
        },
        type: 'string',
        value: [
          {
            id: '0E9BB919-648A-4E15-A037-56285273EFA0',
            type: 'literal',
            value: 'a',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'secondParamP1',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body.dynamicObject',
        },
        parameterKey: 'inputs.$.body.dynamicObject.numberType',
        parameterName: 'body.dynamicObject.numberType',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.numberType',
          name: 'body.dynamicObject.numberType',
          required: true,
          schema: {
            type: 'number',
          },
          type: 'number',
          dynamicParameterReference: 'inputs.$.body.dynamicObject',
        },
        type: 'number',
        value: [
          {
            id: '48C8F772-799B-4FB7-A8C5-88E8B5DDFAD9',
            type: 'literal',
            value: '2',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'secondParamP2',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body.dynamicObject',
        },
        parameterKey: 'inputs.$.body.dynamicObject.childworkflow1Type.o1',
        parameterName: 'body.dynamicObject.childworkflow1Type.o1',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.childworkflow1Type.o1',
          name: 'body.dynamicObject.childworkflow1Type.o1',
          required: true,
          schema: {
            type: 'integer',
          },
          type: 'integer',
          dynamicParameterReference: 'inputs.$.body.dynamicObject',
        },
        type: 'integer',
        value: [
          {
            id: '0D731936-1B36-4DF1-B7F9-7AB7811865D0',
            type: 'literal',
            value: '33',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'thirdParamP1',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        parameterKey: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.childworkflow1-Type',
        parameterName: 'body.dynamicObject.childworkflow1Type.dynamicObject2.childworkflow1-Type',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.childworkflow1-Type',
          name: 'body.dynamicObject.childworkflow1Type.dynamicObject2.childworkflow1-Type',
          required: true,
          schema: {
            type: 'string',
          },
          type: 'string',
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        type: 'string',
        value: [
          {
            id: '1A93F4AF-CE46-4E99-8BD4-903E01A15D07',
            type: 'literal',
            value: 'ee',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'thirdParam2',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        parameterKey: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.1-Type',
        parameterName: 'body.dynamicObject.childworkflow1Type.dynamicObject2.1-Type',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.1-Type',
          name: 'body.dynamicObject.childworkflow1Type.dynamicObject2.1-Type',
          required: true,
          schema: {
            type: 'string',
          },
          type: 'string',
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        type: 'string',
        value: [
          {
            id: '4512A883-BB7A-4372-AB88-CF3A5A7C8510',
            type: 'literal',
            value: 'fff',
          },
        ],
        validationErrors: [],
      },
      {
        id: 'thirdParamP3',
        info: {
          isDynamic: true,
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        parameterKey: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.33-Type',
        parameterName: 'body.dynamicObject.childworkflow1Type.dynamicObject2.33-Type',
        required: true,
        schema: {
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2.33-Type',
          name: 'body.dynamicObject.childworkflow1Type.dynamicObject2.33-Type',
          required: true,
          schema: {
            type: 'string',
          },
          type: 'string',
          dynamicParameterReference: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
        },
        type: 'string',
        value: [
          {
            id: 'AD21CA10-EF2D-4CF2-B938-10E230C3E94D',
            type: 'literal',
            value: 'ggg',
          },
        ],
        validationErrors: [],
      },
    ];
    const allDynamicDependencies: any = {
      'inputs.$.body.dynamicObject': {
        definition: {
          type: 'DynamicProperties',
          extension: {
            dynamicState: {
              extension: {
                operationId: 'getWorkflowSubSchema',
              },
              isInput: true,
            },
            parameters: {
              param1: {
                parameterReference: 'host.workflow.id',
                required: true,
              },
              param2: {
                parameterReference: 'body.objectType.p1',
                required: true,
              },
              param3: {
                parameterReference: 'body.stringType',
                required: true,
              },
            },
          },
        },
        dependencyType: 'ApiSchema',
        dependentParameters: {
          hostworkflowid: {
            isValid: true,
          },
          firstParamP1: {
            isValid: true,
          },
          firstParamP2: {
            isValid: false,
          },
        },
        parameter: {
          dynamicSchema: {
            type: 'DynamicProperties',
            extension: {
              dynamicState: {
                extension: {
                  operationId: 'getWorkflowSubSchema',
                },
                isInput: true,
              },
              parameters: {
                param1: {
                  parameterReference: 'host.workflow.id',
                  required: true,
                },
                param2: {
                  parameterReference: 'body.objectType.p1',
                  required: true,
                },
                param3: {
                  parameterReference: 'body.stringType',
                  required: true,
                },
              },
            },
          },
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject',
          name: 'body.dynamicObject',
          required: false,
          type: 'object',
          dynamicParameterReference: 'inputs.$.body',
        },
      },
      'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2': {
        definition: {
          type: 'DynamicProperties',
          extension: {
            dynamicState: {
              extension: {
                operationId: 'getWorkflowSubSubSchema',
              },
              isInput: true,
            },
            parameters: {
              param1: {
                parameterReference: 'host.workflow.id',
                required: true,
              },
              param2: {
                parameterReference: 'body.objectType.p1',
                required: true,
              },
              param3: {
                parameterReference: 'body.dynamicObject.childworkflow1Type.o1',
                required: true,
              },
            },
          },
        },
        dependencyType: 'ApiSchema',
        dependentParameters: {
          hostworkflowid: {
            isValid: true,
          },
          firstParamP1: {
            isValid: true,
          },
          secondParamP1: {
            isValid: true,
          },
        },
        parameter: {
          dynamicSchema: {
            type: 'DynamicProperties',
            extension: {
              dynamicState: {
                extension: {
                  operationId: 'getWorkflowSubSubSchema',
                },
                isInput: true,
              },
              parameters: {
                param1: {
                  parameterReference: 'host.workflow.id',
                  required: true,
                },
                param2: {
                  parameterReference: 'body.objectType.p1',
                  required: true,
                },
                param3: {
                  parameterReference: 'body.dynamicObject.childworkflow1Type.o1',
                  required: true,
                },
              },
            },
          },
          isDynamic: true,
          isNested: true,
          key: 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2',
          name: 'body.dynamicObject.childworkflow1Type.dynamicObject2',
          required: false,
          type: 'object',
          dynamicParameterReference: 'inputs.$.body.dynamicObject',
        },
      },
    };

    beforeEach(() => {
      rootState.operations.inputParameters[nodeId].parameterGroups.default.parameters = defaultParameters;
      rootState.operations.dependencies[nodeId].inputs = defaultDependencies;
    });

    test('should clear dynamic inputs for specific dynamic parameter reference when dependent parameter is changed', async () => {
      const getStateMockFn = vi.fn(() => {
        rootState.operations.inputParameters[nodeId].parameterGroups.default.parameters = [...defaultParameters, ...allDynamicParams];
        rootState.operations.dependencies[nodeId].inputs = { ...defaultDependencies, ...allDynamicDependencies };

        return rootState;
      });
      const dispatchMockFn = vi.fn();

      vi.spyOn(Helper, 'isDynamicDataReadyToLoad').mockReturnValue(false);
      await loadDynamicContentForInputsInNode(
        nodeId,
        /* isTrigger */ false,
        { 'inputs.$.body.dynamicObject': allDynamicDependencies['inputs.$.body.dynamicObject'] },
        rootState.operations.operationInfo[nodeId],
        undefined,
        dispatchMockFn,
        getStateMockFn
      );
      expect(dispatchMockFn).toHaveBeenCalledWith({
        type: 'operationMetadata/clearDynamicIO',
        payload: {
          nodeId,
          inputs: true,
          outputs: false,
          dynamicParameterKeys: ['inputs.$.body.dynamicObject', 'inputs.$.body.dynamicObject.childworkflow1Type.dynamicObject2'],
        },
      });
    });
  });
});
