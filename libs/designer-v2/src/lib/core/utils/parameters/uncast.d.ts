import type { Expression } from '@microsoft/logic-apps-shared';
export interface UncastResult {
    expression: Expression;
    format: string;
}
/**
 * The utility for uncasting.
 *
 * Here's the list of functions that we uncast.
 * {
 *      expression: /^base64\((?!concat\()/i,
 *      castFromFormat: 'binary'
 *  },
 *  {
 *      expression: /^base64\(concat\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^encodebase64\((?!concat\()/i,
 *      castFromFormat: 'binary'
 *  },
 *  {
 *      expression: /^encodebase64\(concat\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^base64tobinary\(/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^base64tostring\(/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^concat\('data:(application\/octet-stream)?;base64,'/i,
 *      castFromFormat: 'byte'
 *  },
 *  {
 *      expression: /^concat\('data:(application\/octet-stream)?,'/i,
 *      castFromFormat: ''
 *   },
 *  {
 *      expression: /^concat\('data:,'/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^decodebase64\(/i,
 *      castFromFormat: 'byte'
 *  },
 *   {
 *      expression: /^decodedatauri\(/i,
 *      castFromFormat: 'datauri'
 *  },
 *  {
 *      expression: /^encodeuricomponent\(/i,
 *      castFromFormat: ''
 *  },
 *  {
 *      expression: /^string\(/i,
 *      castFromFormat: ''
 *  }
 */
export declare class UncastingUtility {
    private _expression;
    constructor(expression: Expression);
    /**
     * Tries to uncast the expression.
     * @return {UncastResult[] | null} - The array of uncast result, or null if no uncasting is done.
     */
    uncast(): UncastResult[] | null;
    /**
     * Checks if the format is uncastable.
     * @param {string} format - The format to check.
     * @return {boolean} - True if the format is uncastable, false otherwise.
     */
    static isCastableFormat(format?: string): boolean;
    private _uncastOnce;
    private _uncastBase64;
    private _uncastConcat;
    private _uncastSingleFunction;
}
