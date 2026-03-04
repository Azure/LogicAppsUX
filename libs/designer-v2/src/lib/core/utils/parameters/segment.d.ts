import type { Token, ValueSegment } from '@microsoft/designer-ui';
import type { Expression } from '@microsoft/logic-apps-shared';
/**
 * The options for value segment convertor.
 */
export interface ValueSegmentConvertorOptions {
    /**
     * @member {boolean} shouldUncast - The value indicating whether uncasting should be done.
     */
    shouldUncast: boolean;
    /**
     * @member {boolean} rawModeEnabled - The value indicating whether the raw mode is enabled.
     */
    rawModeEnabled: boolean;
}
/**
 * The value segment convertor.
 */
export declare class ValueSegmentConvertor {
    private readonly _tokenSegmentConvertor;
    private readonly _options;
    constructor(options?: ValueSegmentConvertorOptions);
    /**
     * Converts the value to value segments.
     * @arg {any} value - The value.
     * @return {ValueSegment[]}
     */
    convertToValueSegments(value: any, parameterType?: string, parameterSchema?: any): ValueSegment[];
    private _convertJsonToValueSegments;
    private _convertJsonSectionToSegments;
    private _convertStringToValueSegments;
    private _convertTemplateExpressionToValueSegments;
    private _uncastAndConvertExpressionToValueSegments;
    private _uncastAndConvertFunctionExpressionToValueSegments;
    private _convertExpressionToValueSegment;
    private _convertFunctionExpressionToValueSegment;
    private _createLiteralValueSegment;
    private _createExpressionTokenValueSegment;
}
/**
 * Checks whether the array is a value segment.
 * @arg {any[]} array - The value segment array.
 * @return {boolean}
 */
export declare function isValueSegmentArray(array: any[]): boolean;
/**
 * Checks whether the segment is a value segment.
 * @arg {any} object - The value segment.
 * @return {boolean}
 */
export declare function isValueSegment(object: any): boolean;
/**
 * Checks whether the segment is a literal value segment.
 * @arg {ValueSegment} segment - The value segment.
 * @return {boolean}
 */
export declare function isLiteralValueSegment(segment: ValueSegment): boolean;
/**
 * Checks whether the segment is a token value segment.
 * @arg {ValueSegment} segment - The value segment.
 * @return {boolean}
 */
export declare function isTokenValueSegment(segment: ValueSegment): boolean;
export declare function isOutputTokenValueSegment(segment: ValueSegment): boolean;
export declare function isFunctionValueSegment(segment: ValueSegment): boolean;
/**
 * Creates a literal value segment.
 * @arg {string} value - The literal value.
 * @arg {string} [segmentId] - The segment id.
 * @return {ValueSegment}
 */
export declare function createLiteralValueSegment(value: string, segmentId?: string): ValueSegment;
/**
 * Creates a token value segment.
 * @arg {Token} token - The token.
 * @arg {string} [tokenFormat] - The token format.
 * @return {ValueSegment}
 */
export declare function createTokenValueSegment(token: Token, value: string, _tokenFormat?: string): ValueSegment;
/**
 * Checks whether the token is an expression token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isExpressionToken(token: Token): boolean;
/**
 * Checks whether the token is a parameter token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isParameterToken(token: Token): boolean;
/**
 * Checks whether the token is a variable token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isVariableToken(token: Token): boolean;
/**
 * Checks whether the token is an item token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isItemToken(token: Token): boolean;
/**
 * Checks whether the token is an iteration index token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isIterationIndexToken(token: Token): boolean;
/**
 * Checks whether the token is an output token.
 * @arg {Token} token - The token.
 * @return {boolean}
 */
export declare function isOutputToken(token: Token): token is Token;
/**
 * Creates an output token.
 * @arg {string} key - The output key.
 * @arg {string} actionName - The step.
 * @arg {string} source - The output source.
 * @arg {string} name - The token name.
 * @arg {boolean} required - The value indicating if it is required.
 * @arg {string} [value] - The value.
 * @return {Token}
 */
export declare function createOutputToken(key: string, actionName: string | undefined, source: string, name: string, required: boolean, value: string): Token;
/**
 * Creates an expression token.
 * @arg {string} value - The value.
 * @arg {Expression} expression - The expression.
 * @return {Token}
 */
export declare function createExpressionToken(expression: Expression): Token;
/**
 * Creates a variable token.
 * @arg {string} value - The value.
 * @arg {string} variableName - The variable name.
 * @return {Token}
 */
export declare function createVariableToken(variableName: string, expression: string): Token;
/**
 * Creates a parameter token.
 * @arg {string} value - The value.
 * @arg {string} parameterName - The parameter name.
 * @return {Token}
 */
export declare function createParameterToken(parameterName: string): Token;
/**
 * Creates an agent parameter token.
 * @arg {string} value - The value.
 * @arg {string} parameterName - The parameter name.
 * @return {Token}
 */
export declare function createAgentParameterToken(parameterName: string): Token;
/**
 * Gets expression value for given segment key in value segments.
 * @arg {ValueSegment[]} valueSegments - The value segments.
 * @arg {string} segmentKey - The segment key to get the value from.
 * @return {string | undefined} - The value of the expression for segment key.
 */
export declare function getExpressionFromValueSegment(valueSegments: ValueSegment[], segmentKey: string): string | undefined;
