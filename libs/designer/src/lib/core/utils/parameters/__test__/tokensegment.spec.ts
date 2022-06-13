import { TokenSegmentConvertor } from '../tokensegment';
import { expectOutputTokenSegment, expectParameterTokenSegment, expectVariableTokenSegment } from './segment.spec';
import type { ExpressionFunction } from '@microsoft-logic-apps/parsers';
import { ExpressionParser, OutputKeys, OutputSource } from '@microsoft-logic-apps/parsers';

describe('core/utils/parameters/tokensegment', () => {
  describe('TokenSegmentConvertor', () => {
    describe('variables()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@variables ( 'abc')");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectVariableTokenSegment(tokenSegment, 'abc', "variables ( 'abc')");
      });

      it('should return null to token segment if not having exactly 1 argument.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@variables()');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if not having non string arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@variables(123)');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@variables('abc').foo");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('parameters()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@parameters ( 'abc')");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectParameterTokenSegment(tokenSegment, 'abc', "parameters ( 'abc')");
      });

      it('should return null to token segment if not having exactly 1 argument.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@parameters()');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if not having non string arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@parameters(123)');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should return null if having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@parameters('abc').foo");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('triggerBody()', () => {
      it('should convert to token segment successfully.', () => {
        const expression: ExpressionFunction = ExpressionParser.parseTemplateExpression('@triggerBody()');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, OutputKeys.Body, 'outputs.$.body', undefined, false);
      });

      it('should convert to token segment successfully when having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerBody().statusCode');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'statusCode', 'outputs.$.body.statusCode', undefined, true);
      });

      it('should convert to token segment successfully when having dereferences which contains special characters.', () => {
        const expression1 = ExpressionParser.parseTemplateExpression("@triggerBody()['Account''AadTenantId']");
        const tokenSegment1 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression1);
        expectOutputTokenSegment(
          tokenSegment1,
          undefined,
          OutputSource.Body,
          "Account'AadTenantId",
          "outputs.$.body.Account'AadTenantId",
          undefined,
          true
        );

        const expression2 = ExpressionParser.parseTemplateExpression("@triggerBody()['Account.AadUserId']");
        const tokenSegment2 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression2);
        expectOutputTokenSegment(
          tokenSegment2,
          undefined,
          OutputSource.Body,
          'Account~1AadUserId',
          'outputs.$.body.Account~1AadUserId',
          undefined,
          true
        );

        const expression3 = ExpressionParser.parseTemplateExpression("@triggerBody()['Account\nAadUserId']");
        const tokenSegment3 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression3);
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
        const expression1 = ExpressionParser.parseTemplateExpression("@triggerBody()['Account''AadTenantId']?['Account.?AadUserId']");
        const tokenSegment1 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression1);
        expectOutputTokenSegment(
          tokenSegment1,
          undefined,
          OutputSource.Body,
          "Account'AadTenantId.?Account~1~4AadUserId",
          "outputs.$.body.Account'AadTenantId.Account~1~4AadUserId",
          undefined,
          false
        );

        const expression2 = ExpressionParser.parseTemplateExpression("@triggerBody()?['Account''AadTenantId']['Account.?AadUserId']");
        const tokenSegment2 = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression2);
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
        const expression = ExpressionParser.parseTemplateExpression("@triggerBody('f')");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });
    });

    describe('triggerOutputs()', () => {
      it('should convert to token segment successfully.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs()');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Outputs, OutputKeys.Outputs, 'outputs.$', undefined, false);
      });

      it('should convert to token segment successfully when having dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().foo');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Outputs, 'foo', 'outputs.$.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one statusCode dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().statusCode');
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
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().statusCode.foo');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.StatusCode, 'foo', 'outputs.$.statusCode.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one queries dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().queries');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Queries, OutputKeys.Queries, 'outputs.$.queries', undefined, false);
      });

      it('should convert to token segment successfully when having one queries dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().queries.foo');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Queries, 'foo', 'outputs.$.queries.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one headers dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().headers');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Headers, OutputKeys.Headers, 'outputs.$.headers', undefined, false);
      });

      it('should convert to token segment successfully when having one headers dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().headers.foo');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Headers, 'foo', 'outputs.$.headers.foo', undefined, true);
      });

      it('should convert to token segment successfully when having one body dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().body');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'body', 'outputs.$.body', undefined, true);
      });

      it('should convert to token segment successfully when having one body dereference and another dereference.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs().body.foo');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expectOutputTokenSegment(tokenSegment, undefined, OutputSource.Body, 'body.foo', 'outputs.$.body.foo', undefined, true);
      });

      it('should return null when having arguments.', () => {
        const expression = ExpressionParser.parseTemplateExpression("@triggerOutputs('f')");
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      // TODO - Should we fix this?
      it('should return null when having non string dereferences.', () => {
        const expression = ExpressionParser.parseTemplateExpression('@triggerOutputs()[1]');
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment).toBeNull();
      });

      it('should preserve the output token value when configured to do so', () => {
        const definitionExpression = `triggerOutputs()['body/value']`;
        const expression = ExpressionParser.parseTemplateExpression(`@${definitionExpression}`);
        const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
        expect(tokenSegment?.value).toBe(definitionExpression);
      });
    });

    for (const func of ['actionBody', 'body']) {
      describe(`${func}()`, () => {
        it('should convert to token segment successfully.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, OutputKeys.Body, 'outputs.$.body', undefined, false);
        });

        it('should convert to token segment successfully when having string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'statusCode', 'outputs.$.body.statusCode', undefined, true);
        });

        it('should return null when having non string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')[1]`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when not having 1 arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}()`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when having non string arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}(123)`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });
      });
    }

    for (const func of ['actionOutputs', 'outputs']) {
      describe(`${func}()`, () => {
        it('should convert to token segment successfully.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Outputs, OutputKeys.Outputs, 'outputs.$', undefined, false);
        });

        it('should convert to token segment successfully when having string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').foo`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Outputs, 'foo', 'outputs.$.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one statusCode dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode`);
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
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').statusCode.foo`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.StatusCode, 'foo', 'outputs.$.statusCode.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one queries dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').queries`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Queries, OutputKeys.Queries, 'outputs.$.queries', undefined, false);
        });

        it('should convert to token segment successfully when having one queries dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').queries.foo`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Queries, 'foo', 'outputs.$.queries.foo', undefined, true);
        });

        it('should convert to token segment successfully when having one headers dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').headers`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Headers, OutputKeys.Headers, 'outputs.$.headers', undefined, false);
        });

        it('should convert to token segment successfully when having one headers dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').headers.foo`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Headers, 'foo', 'outputs.$.headers.foo', undefined, true);
        });

        it('should convert to token segment successfully when having body dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').body`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'body', 'outputs.$.body', undefined, true);
        });

        it('should convert to token segment successfully when having one body dereference and another dereference.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a').body.foo`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expectOutputTokenSegment(tokenSegment, 'a', OutputSource.Body, 'body.foo', 'outputs.$.body.foo', undefined, true);
        });

        it('should return null when having non string dereferences.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}('a')[utcNow()]`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when having non string arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}(123)`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });

        it('should return null when not having 1 arguments.', () => {
          const expression = ExpressionParser.parseTemplateExpression(`@${func}()`);
          const tokenSegment = new TokenSegmentConvertor().tryConvertToDynamicContentTokenSegment(expression as ExpressionFunction);
          expect(tokenSegment).toBeNull();
        });
      });
    }

    // TODO - Add tests for @item and @items when implementation is completed
  });
});
