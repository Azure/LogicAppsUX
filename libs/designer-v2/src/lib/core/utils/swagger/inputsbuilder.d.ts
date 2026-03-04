import type { SerializedParameter } from '../../actions/bjsworkflow/serializer';
import type { InputParameter, Segment } from '@microsoft/logic-apps-shared';
export interface PathTemplate {
    template: string;
    parameters: Record<string, any>;
}
export interface OperationInputs {
    method?: string;
    path?: string;
    pathTemplate?: PathTemplate;
    headers?: Record<string, any>;
    queries?: Record<string, any>;
    body?: Record<string, any>;
}
export declare function buildOperationDetailsFromControls(parameters: SerializedParameter[], operationPath: string, encodePathComponents?: boolean, operationMethod?: string, shouldUsePathTemplateFormat?: boolean): OperationInputs;
export declare function loadInputValuesFromDefinition(inputValue: Record<string, any>, // tslint:disable-line: no-any
inputParameters: InputParameter[], operationPath: string, basePath: string, shouldUsePathTemplateFormat?: boolean): InputParameter[];
export declare function serializeFormData(formDataParameters: SerializedParameter[]): Partial<OperationInputs>;
export declare function loadFormDataValue(inputs: Record<string, any>, formDataInputParameters: InputParameter[]): InputParameter[];
/**
 * Processes the path value from definition and gets the input parameters from it
 * The path pattern it supports including:
 * - /abc/{name}
 * - /abc/de{name}
 * - /abc/{name}de
 * - expression value contains '/', like @{encodeUriComponent('a/b')}
 * And the pattern it does not support:
 * - /abc/{name1}{name2}
 * - /abc/de{name1}{name2}
 * - /abc/{name1}{name2}suffix
 * - literal path value contains '/'
 * NOTE: it's worth to use https://github.com/edj-boston/matchstick
 * @arg {string} pathValue - Value of the path input from definition
 * @arg {string} pathTemplate - Value of the path template
 * @return {Record<string, any>} - input parameters in the path input {pathKey: value}
 */
export declare function processPathInputs(pathValue: string, pathTemplate: string): Record<string, any>;
export declare function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive?: boolean): any;
export declare function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive?: boolean): void;
