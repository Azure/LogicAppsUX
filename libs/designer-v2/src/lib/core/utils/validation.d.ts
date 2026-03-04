import { type ParameterInfo, type ValueSegment } from '@microsoft/designer-ui';
import type { IntlShape } from 'react-intl';
/**
 * Checks that the entered expression meets requirements for the parameter specified by its type, format, and pattern
 * @arg {ParameterInfo} parameterMetadata - The metadata of the parameter as described by its swagger
 * @arg {string} parameterValue - The current value of the expression entered for the parameter
 * @arg {string} shouldValidateUnknownParameterAsError - Flag indicating whether to consider unknown parameters as errors
 * @return {string[]} - An array of strings with validation error messages, if there are any
 */
export declare function validateStaticParameterInfo(parameterMetadata: ParameterInfo, parameterValue: string, shouldValidateUnknownParameterAsError: boolean): string[];
/**
 * @arg {string} type - The type of the parameter.
 * @arg {string} parameterFormat - The format of the parameter.
 * @arg {string} parameterValue - The stringified parameter value.
 * @return {string}
 */
export declare function validateType(type: string, parameterValue: string, editor: string | undefined, validationOptions: {
    format?: string;
    collectionFormat?: string;
    minimum?: number;
    maximum?: number;
}): string | undefined;
/**
 * @arg {ParameterInfo} parameterMetadata - An object with metadata describing a parameter
 * @arg {ValueSegment[]} parameterValue - An array of valuesegments from a parameter value to validate
 * @return {string[]} - An array of validation error messages, if there are any
 */
export declare function validateJSONParameter(parameterMetadata: ParameterInfo, parameterValue: ValueSegment[], shouldEncodeBasedOnMetadata?: boolean): string[];
export declare function parameterHasOnlyTokenBinding(parameterValue: ValueSegment[]): boolean;
/**
 * Removes empty segments that are part of a parameter value, which might exist between tokens or at the end of the value.
 * @arg {ValueSegment[]} value - The parameter value.
 * @return {ValueSegment[]} - The trimmed value.
 */
export declare function trimParameterValue(value: ValueSegment[]): ValueSegment[];
export declare const validateParameterValueWithSwaggerType: (type: string | undefined, valueToValidate: string | undefined, required: boolean, intl: IntlShape) => string | undefined;
export declare const isISO8601: (s: string) => boolean;
