import { TokenSegmentConvertor } from '../tokensegment';
import { expectOutputTokenSegment, expectParameterTokenSegment, expectVariableTokenSegment } from './segment.spec';
import type { ExpressionFunction } from '@microsoft/parsers-logic-apps';
import { ExpressionParser, OutputKeys, OutputSource } from '@microsoft/parsers-logic-apps';

describe('core/utils/parameters/tokensegment', () => {
  describe('TokenSegmentConvertor', () => {
    describe('variables()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@variables ( 'abc')", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectVariableTokenSegment(tokenSegment, 'abc', "variables ( 'abc')");
      });

      it('should return null to token segment if not having exactly 1 argument.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@variables()', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if not having non string arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@variables(123)', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@variables('abc').foo", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('parameters()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@parameters ( 'abc')", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectParameterTokenSegment(tokenSegment, 'abc', "parameters ( 'abc')");
      });

      it('should return null to token segment if not having exactly 1 argument.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@parameters()', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if not having non string arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@parameters(123)', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@parameters('abc').foo", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('triggerBody()', () => {
      it('should convert to token segment successfully.', () => {
        const expression: ExpressionFunction = ExpressionParser.parseTemplateExpression(
          '@triggerBody()',
          /*isAliasPathParsingEnabled*/ false
        ) as ExpressionFunction;
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, OutputKeys.Body, 'outputs.$.body', undefined, false);
      });

      it('should convert to token segment successfully when having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerBody().statusCode', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'statusCode', 'outputs.$.body.statusCode', undefined, true);
      });

      it('should convert to token segment successfully when having dereferences which contains special characters.', () => {
        const expression1 = ExpressionParser.parseTemplateExpression(
          "@triggerBody()['Account''AadTenantId']",
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment1 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression1 as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment1,
          undefined,
          OutputSource.Body,
          "Account'AadTenantId",
          "outputs.$.body.Account'AadTenantId",
          undefined,
          true
        );

        const expression2 = ExpressionParser.parseTemplateExpression(
          "@triggerBody()['Account.AadUserId']",
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment2 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression2 as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment2,
          undefined,
          OutputSource.Body,
          'Account~1AadUserId',
          'outputs.$.body.Account~1AadUserId',
          undefined,
          true
        );

        const expression3 = ExpressionParser.parseTemplateExpression(
          "@triggerBody()['Account\nAadUserId']",
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment3 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression3 as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment3,
          undefined,
          OutputSource.Body,
          'Account\nAadUserId',
          'outputs.$.body.Account\nAadUserId',
          undefined,
          true
        );
      });

      it('should convert to token segment successfully when having dereferences with optional markers.', () => {
        const expression1 = ExpressionParser.parseTemplateExpression(
          "@triggerBody()['Account''AadTenantId']?['Account.?AadUserId']",
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment1 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression1 as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment1,
          undefined,
          OutputSource.Body,
          "Account'AadTenantId.?Account~1~4AadUserId",
          "outputs.$.body.Account'AadTenantId.Account~1~4AadUserId",
          undefined,
          false
        );

        const expression2 = ExpressionParser.parseTemplateExpression(
          "@triggerBody()?['Account''AadTenantId']['Account.?AadUserId']",
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment2 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression2 as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment2,
          undefined,
          OutputSource.Body,
          "?Account'AadTenantId.Account~1~4AadUserId",
          "outputs.$.body.Account'AadTenantId.Account~1~4AadUserId",
          undefined,
          false
        );
      });

      it('should return null when having arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@triggerBody('f')", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('triggerOutputs()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs()', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Outputs, OutputKeys.Outputs, 'outputs.$', undefined, false);
      });

      it('should convert to token segment successfully when having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().foo', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Outputs, 'foo', 'outputs.$.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one statusCode dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().statusCode', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(
          tokenSegment,
          undefined,
          OutputSource.StatusCode,
          OutputKeys.StatusCode,
          'outputs.$.statusCode',
          undefined,
          false
        );
      });

      it('should convert to token segment successfully when having one statusCode dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression(
          '@triggerOutputs().statusCode.foo',
          /*isAliasPathParsingEnabled*/ false
        );
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.StatusCode, 'foo', 'outputs.$.statusCode.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one queries dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().queries', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Queries, OutputKeys.Queries, 'outputs.$.queries', undefined, false);
      });

      it('should convert to token segment successfully when having one queries dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().queries.foo', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Queries, 'foo', 'outputs.$.queries.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one headers dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().headers', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Headers, OutputKeys.Headers, 'outputs.$.headers', undefined, false);
      });

      it('should convert to token segment successfully when having one headers dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().headers.foo', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Headers, 'foo', 'outputs.$.headers.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one body dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().body', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'body', 'outputs.$.body', undefined, true);
      });

      it('should convert to token segment successfully when having one body dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().body.foo', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'body.foo', 'outputs.$.body.foo', undefined, true);
      });

      it('should return null when having arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@triggerOutputs('f')", /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      // TODO - Should we fix this?
      it('should return null when having non string dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs()[1]', /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should preserve the output token value when configured to do so', () => {
        const definitionExpression = `triggerOutputs()['body/value']`;
        const expression = ExpressionParser.parseTemplateExpression(`@${definitionExpression}`, /*isAliasPathParsingEnabled*/ false);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment?.value).toBe(definitionExpression);
      });
    });

    for (const func of ['actionBody', 'body']) {
      describe(`${func}()`, () => {
        it('should convert to token segment successfully.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, OutputKeys.Body, 'outputs.$.body', undefined, false);
        });

        it('should convert to token segment successfully when having string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'statusCode', 'outputs.$.body.statusCode', undefined, true);
        });

        it('should return null when having non string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')[1]`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when not having 1 arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}()`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when having non string arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}(123)`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });
      });
    }

    for (const func of ['actionOutputs', 'outputs']) {
      describe(`${func}()`, () => {
        it('should convert to token segment successfully.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Outputs, OutputKeys.Outputs, 'outputs.$', undefined, false);
        });

        it('should convert to token segment successfully when having string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').foo`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Outputs, 'foo', 'outputs.$.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one statusCode dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(
            tokenSegment,
            'a',
            OutputSource.StatusCode,
            OutputKeys.StatusCode,
            'outputs.$.statusCode',
            undefined,
            false
          );
        });

        it('should convert to token segment successfully when having one statusCode dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode.foo`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.StatusCode, 'foo', 'outputs.$.statusCode.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one queries dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').queries`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Queries, OutputKeys.Queries, 'outputs.$.queries', undefined, false);
        });

        it('should convert to token segment successfully when having one queries dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').queries.foo`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Queries, 'foo', 'outputs.$.queries.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one headers dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').headers`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Headers, OutputKeys.Headers, 'outputs.$.headers', undefined, false);
        });

        it('should convert to token segment successfully when having one headers dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').headers.foo`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Headers, 'foo', 'outputs.$.headers.foo', undefined, true);
        });

        it('should convert to token segment successfully when having body dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').body`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'body', 'outputs.$.body', undefined, true);
        });

        it('should convert to token segment successfully when having one body dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').body.foo`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'body.foo', 'outputs.$.body.foo', undefined, true);
        });

        it('should return null when having non string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')[utcNow()]`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when having non string arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}(123)`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when not having 1 arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}()`, /*isAliasPathParsingEnabled*/ false);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });
      });
    }

    // TODO - Add tests for @item and @items when implementation is completed
  });
});
