import type { ValueSegment } from '@microsoft/designer-ui';
import type { Expression, ExpressionFunction } from '@microsoft/logic-apps-shared';
/**
 * The token segment convertor.
 */
export declare class TokenSegmentConvertor {
    /**
     * Tries to convert a function expression into a dynamic content token segment.
     * @arg {ExpressionFunction} expression - The function expression.
     * @return {ValueSegment | null}
     */
    tryConvertToDynamicContentTokenSegment(expression: ExpressionFunction): ValueSegment | null;
    static isOutputToken(expression: ExpressionFunction): boolean;
    static isVariableToken(expression: ExpressionFunction): boolean;
    private _isParameterToken;
    static isAgentParameterToken(expression: ExpressionFunction): boolean;
    static isItemToken(expression: ExpressionFunction): boolean;
    static isItemsToken(expression: ExpressionFunction): boolean;
    static isIterationIndexesToken(expression: ExpressionFunction): boolean;
    static getTokenStep(functionArguments: Expression[]): string | undefined;
    private _getTokenSource;
    private _getExpressionFunctionDeferences;
    private _getOutputKey;
    private _isTokenRequired;
    private _getTokenName;
}
