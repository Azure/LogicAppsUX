import Constants from '../../../../common/constants';
import { addCastToExpression } from '../casting';

describe('core/utils/parameters/casting', () => {
  describe('addCastToExpression', () => {
    it('should return original expression if formats match', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BINARY,
        castingTo = Constants.SWAGGER.FORMAT.BINARY,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe(expression);
    });

    it('should return empty expression if the expression is empty string', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BINARY,
        castingTo = Constants.SWAGGER.FORMAT.BINARY,
        expression = '',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe(expression);
    });

    it('should convert bytes to binary', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BYTE,
        castingTo = Constants.SWAGGER.FORMAT.BINARY,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('base64ToBinary(triggerBody())');
    });

    it('should convert datauri to binary', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.DATAURI,
        castingTo = Constants.SWAGGER.FORMAT.BINARY,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('decodeDataUri(triggerBody())');
    });

    it('should convert string to binary', () => {
      const castingFrom = '',
        castingTo = Constants.SWAGGER.FORMAT.BINARY,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('triggerBody()');
    });

    it('should convert binary to bytes', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BINARY,
        castingTo = Constants.SWAGGER.FORMAT.BYTE,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('base64(triggerBody())');
    });

    it('should convert datauri to bytes', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.DATAURI,
        castingTo = Constants.SWAGGER.FORMAT.BYTE,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('base64(decodeDataUri(triggerBody()))');
    });

    it('should convert string to bytes', () => {
      const castingFrom = '',
        castingTo = Constants.SWAGGER.FORMAT.BYTE,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('base64(triggerBody())');
    });

    it('should convert binary to datauri', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BINARY,
        castingTo = Constants.SWAGGER.FORMAT.DATAURI,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe("concat('data:;base64,',base64(triggerBody()))");
    });

    it('should convert bytes to datauri', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BYTE,
        castingTo = Constants.SWAGGER.FORMAT.DATAURI,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe("concat('data:;base64,',triggerBody())");
    });

    it('should convert string to datauri', () => {
      const castingFrom = '',
        castingTo = Constants.SWAGGER.FORMAT.DATAURI,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe("concat('data:,',encodeURIComponent(triggerBody()))");
    });

    it('should convert byte to string', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.BYTE,
        castingTo = '',
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('base64ToString(triggerBody())');
    });

    it('should convert datauri to string', () => {
      const castingFrom = Constants.SWAGGER.FORMAT.DATAURI,
        castingTo = '',
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFrom, castingTo, expression);

      expect(castExpression).toBe('decodeDataUri(triggerBody())');
    });

    it('should return original expression if toType is any', () => {
      const castingFromFormat = Constants.SWAGGER.FORMAT.BYTE,
        castingToFormat = '',
        castingFromType = Constants.SWAGGER.TYPE.STRING,
        castingToType = Constants.SWAGGER.TYPE.ANY,
        expression = 'triggerBody()',
        castExpression = addCastToExpression(castingFromFormat, castingToFormat, expression, castingFromType, castingToType);

      expect(castExpression).toBe(expression);
    });
  });
});
