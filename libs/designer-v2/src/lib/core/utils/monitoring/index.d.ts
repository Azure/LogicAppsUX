import type { BoundParameters } from '@microsoft/logic-apps-shared';
/**
 * Parses the given outputs and returns a BoundParameters object. This function is used as a fallback outputs parser.
 * @param outputs - The outputs to parse, which can be a record of any type.
 * @returns A BoundParameters object where each key is a parameter name and the value is an object containing the display name and value.
 */
export declare const parseOutputs: (outputs: any) => BoundParameters;
/**
 * Parses the given inputs and returns a BoundParameters object. This function is used as a fallback inputs parser.
 * @param inputs - A record containing the inputs to be parsed.
 * @returns A BoundParameters object with the parsed inputs.
 */
export declare const parseInputs: (inputs: any) => BoundParameters;
