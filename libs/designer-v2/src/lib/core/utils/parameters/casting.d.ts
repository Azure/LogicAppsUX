import type { ValueSegment } from '@microsoft/designer-ui';
/**
 * @arg {string} fromFormat - A string with the original format of the expression being cast.
 * @arg {string} toFormat - A string with the desired format for the expression being cast.
 * @arg {string} expression - A string with an expression to be cast.
 * @arg {string} [fromType] - A string with the original type of the expression being cast.
 * @arg {string} [toType] - A string with the desired type for the expression being cast.
 * @return {string} - A string with the casting function applied to the expression.
 */
export declare function addCastToExpression(fromFormat: string, toFormat: string, expression: string, fromType?: string, toType?: string): string;
/**
 * @arg {string} convertingTo - A string with the desired type for the expression being cast.
 * @arg {ValueSegment[]} valueSegments - An array of mixed literals and tokens to be cast together.
 * @arg {string} parameterType - Used by getInterpolatedExpression to determine when to emit interpolated syntax.
 * @arg {string} parameterFormat - Used by getInterpolatedExpression to determine when to emit interpolated syntax.
 * @return {string} - A string with the casting function(s) applied to the expressions.
 */
export declare function addFoldingCastToExpression(convertingTo: string, valueSegments: ValueSegment[], parameterType: string, parameterFormat: string): string | undefined;
/**
 * @arg {string} tokenType - The type of token segment that needs casting.
 * @arg {string} tokenFormat - The format associated with the token segment that needs casting.
 * @arg {string} parameterType - The type of the parameter where token is added.
 * @arg {string} parameterFormat - The format associated with the parameter where token is added.
 * @return {boolean} - Returns if casting needs to be applied.
 */
export declare function shouldCastTokenSegment(tokenType: string, tokenFormat: string, parameterType: string, parameterFormat: string): boolean;
