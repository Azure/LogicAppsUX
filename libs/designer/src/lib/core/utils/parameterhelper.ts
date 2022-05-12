import { createEx, decodePropertySegment, InputParameter, isAncestorKey, isTemplateExpression, parseEx, ResolvedParameter, Segment, SegmentType } from "@microsoft-logic-apps/parsers";
import { clone, equals, first, format, getPropertyValue, guid, isNullOrUndefined, isObject } from "@microsoft-logic-apps/utils";
import { ParameterInfo, ValidationErrorCode, ValidationException } from "@microsoft/designer-ui";
import Constants from '../../common/constants';

export interface RepetitionContext {
    splitOn?: string;
    repetitionReferences: RepetitionReference[];
}

/**
 * Converts to parameter info map.
 * @arg {string} nodeType - The type of the node.
 * @arg {InputParameter[]} inputParameters - The input parameters.
 * @arg {PickerHelper} [pickerHelper] - The picker helper.
 * @arg {any} [stepDefinition] - The step definition.
 * @arg {string} [nodeId] - The graph node id which contains the specified parameters.
 * @arg {boolean} [rawModeEnabled=false] - The value indicating whether to enable raw mode.
 * @arg {boolean} [intellisenseComboboxEnabled=false] - The value indicating whether to enable intellisense combobox.
 * @arg {boolean} [fxTokenEnabled=false] - The value indicating whether fx token is enabled.
 * @arg {boolean} [fxTokenForConditionEnabled=false] - The value indicating whether fx token for condition is enabled.
 */
 export function toParameterInfoMap(
    nodeType: string,
    inputParameters: InputParameter[],
    stepDefinition?: any, // tslint:disable-line: no-any
    nodeId?: string,
    rawModeEnabled = false,
    intellisenseComboboxEnabled = false,
    fxTokenEnabled = false,
    fxTokenForConditionEnabled = false
): ParameterInfo[] {
    const metadata = stepDefinition && stepDefinition.metadata;
    const useNewParser = true;
    const areForeachTokensEnabled = false;
    const shouldIgnoreDefaultValue = false;
    const result: ParameterInfo[] = [];

    for (const inputParameter of inputParameters) {
        let repetitionContext: RepetitionContext | null;
        if (nodeId) {
            const includeSelf = shouldIncludeSelfForRepetitionReference(nodeType, inputParameter.name);
            repetitionContext = null;// TODO(psamband): Get repetition context from redux for this node
        } else {
            repetitionContext = null;
        }

        if (!inputParameter.dynamicSchema) {
            const parameter = createParameterInfo(
                inputParameter,
                repetitionContext,
                metadata,
                rawModeEnabled,
                intellisenseComboboxEnabled,
                fxTokenEnabled,
                fxTokenForConditionEnabled,
                useNewParser,
                areForeachTokensEnabled,
                shouldIgnoreDefaultValue
            );
            result.push(parameter);
        }
    }

    return result;
}

/**
 * Gets the parameter info object for UI elements from the resolved parameters from schema, swagger, definition, etc.
 * @arg {InputParameter} parameter - An object with metadata about a Swagger input parameter.
 * @arg {RepetitionContext} repetitionContext - An object contains the repetition related context data.
 * @arg {PickerHelper} [pickerHelper] - An object with helper methods for file/folder picker controls.
 * @arg {Record<string, string>} [metadata] - A hash mapping dynamic value lookup values to their display strings.
 * @arg {boolean} [enableRawMode=false] - True if raw mode is enabled for parameter fields (default false).
 * @arg {boolean} [enableIntellisenseCombobox=false] - True if the IntelliSense combobox should be used for this parameter (default false).
 * @arg {boolean} [fxTokenEnabled=false] - The value indicating whether the fx token is enabled.
 * @arg {boolean} [fxTokenForConditionEnabled=false] - The value indicating whether the fx token is enabled.
 * @arg {boolean} [shouldIgnoreDefaultValue=false] - True if should not populate with default value of dynamic parameter.
 * @return {ParameterInfo} - An object with the view model for an input parameter field.
 */
 export function createParameterInfo(
    parameter: ResolvedParameter,
    repetitionContext?: RepetitionContext | null,
    metadata?: Record<string, string>,
    enableRawMode = false,
    enableIntellisenseCombobox = false,
    fxTokenEnabled = false,
    fxTokenForConditionEnabled = false,
    useNewParser = false,
    areForeachTokensEnabled = false,
    shouldIgnoreDefaultValue = false
): ParameterInfo {
    if (!repetitionContext) {
        repetitionContext = {
            repetitionReferences: [],
        };
    }

    const editor = getParameterEditorProps(parameter, shouldIgnoreDefaultValue);
    const parameterInfo: ParameterInfo = {
        alternativeKey: parameter.alternativeKey,
        id: guid(),
        editor: editor.type,
        editorOptions: editor.options,
        info: {
            alias: parameter.alias,
            encode: parameter.encode,
            format: parameter.format,
            in: parameter.in,
            isDynamic: !!parameter.isDynamic,
            isUnknown: parameter.isUnknown,
        },
        hideInUI: parameter.invisible,
        label: parameter.title || parameter.summary || parameter.name,
        parameterKey: parameter.key,
        parameterName: parameter.name,
        placeholder: parameter.description,
        preservedValue: getPreservedValue(parameter),
        required: !!parameter.required,
        schema: editor.schema,
        showErrors: false,
        showTokens: false,
        suppressCasting: parameter.suppressCasting,
        type: parameter.type,
        value: loadParameterValue(
            parameter,
            repetitionContext,
            metadata,
            enableRawMode,
            /* enableIntellisenseCombobox */ false,
            fxTokenEnabled,
            fxTokenForConditionEnabled,
            useNewParser,
            areForeachTokensEnabled
        ),
        viewModel: editor.viewModel,
        visibility: parameter.visibility,
    };

    return parameterInfo;
}

export function shouldIncludeSelfForRepetitionReference(graphNodeType: string, parameterName?: string): boolean {
    if (equals(graphNodeType, Constants.NODE.TYPE.QUERY) || equals(graphNodeType, Constants.NODE.TYPE.SELECT) || equals(graphNodeType, Constants.NODE.TYPE.TABLE)) {
        return !parameterName || parameterName !== 'from';
    }

    return false;
}

export function loadParameterValuesFromDefault(inputParameters: Record<string, InputParameter>): void {
    for (const indexKey of Object.keys(inputParameters)) {
        const inputParameter = inputParameters[indexKey];
        if (inputParameter.default !== undefined) {
            inputParameter.value = inputParameter.default;
        }
    }
}

export function updateParameterWithValues(
    parameterKey: string,
    parameterValue: any, // tslint:disable-line: no-any
    parameterLocation: string,
    availableInputParameters: InputParameter[],
    createInvisibleParameter = true,
    useDefault = true
): InputParameter[] {
    const parameters: InputParameter[] = [];
    let inputParameter = first(parameter => parameter.key === parameterKey, availableInputParameters);

    const clonedParameterValue = typeof parameterValue === 'object' && !Array.isArray(parameterValue) ? clone(parameterValue) : parameterValue;

    if (isNullOrUndefined(clonedParameterValue) && useDefault) {
        // assign the default value to input parameter
        parameters.push(...availableInputParameters.map(parameter => transformInputParameter(parameter, parameter.default)));
    } else {
        if (Array.isArray(clonedParameterValue) && clonedParameterValue.length !== 1 && inputParameter) {
            // if inputParameter type is array, and the value is also array, but it contains more than one item
            // just assign the array value to input directly
            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
        } else {
            const keySegments = parseEx(parameterKey);
            const descendantInputParameters = availableInputParameters.filter(item => isAncestorKey(item.key, parameterKey));

            if (descendantInputParameters.length > 0) {
                if (isNullOrUndefined(clonedParameterValue)) {
                    parameters.push(...descendantInputParameters.map(parameter => transformInputParameter(parameter, /* parameterValue */ undefined)));
                } else {
                    const valueExpandable = isObject(clonedParameterValue) || (Array.isArray(clonedParameterValue) && clonedParameterValue.length === 1);
                    if (valueExpandable) {
                        for (const descendantInputParameter of descendantInputParameters) {
                            const extraSegments = getExtraSegments(descendantInputParameter.key, parameterKey);
                            const descendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, extraSegments);
                            let alternativeParameterKeyExtraSegment: Segment[] | null = null;

                            if (descendantInputParameter.alternativeKey) {
                                alternativeParameterKeyExtraSegment = getExtraSegments(descendantInputParameter.alternativeKey, parameterKey);
                                const alternativeParameterKeyDescendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, alternativeParameterKeyExtraSegment);
                                if (alternativeParameterKeyDescendantValue !== descendantValue) {
                                    throw new ValidationException(
                                        ValidationErrorCode.UNSPECIFIED,
                                        format(
                                            "The value '{0}' in '{1}' section and value '{2}' in '{3}' section should match.",
                                            descendantValue,
                                            descendantInputParameter.key.replace('$.', ''),
                                            alternativeParameterKeyDescendantValue,
                                            descendantInputParameter.alternativeKey.replace('$.', '')
                                        )
                                    );
                                }
                            }

                            parameters.push(transformInputParameter(descendantInputParameter, descendantValue, /* invisible */ false));
                            deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, extraSegments);
                            if (alternativeParameterKeyExtraSegment) {
                                deletePropertyValueWithSpecifiedPathSegment(clonedParameterValue, alternativeParameterKeyExtraSegment);
                            }
                        }

                        // for the rest properties, create corresponding invisible parameter to preserve the value when serialize
                        if (createInvisibleParameter) {
                            for (const restPropertyName of Object.keys(clonedParameterValue)) {
                                const propertyValue = clonedParameterValue[restPropertyName];
                                if (propertyValue !== undefined) {
                                    const childKeySegments = [...keySegments, { value: restPropertyName, type: SegmentType.Property }];
                                    const restInputParameter: ResolvedParameter = {
                                        key: createEx(childKeySegments) as string,
                                        name: restPropertyName,
                                        type: 'any',
                                        in: parameterLocation,
                                        required: false,
                                        isUnknown: true,
                                    };

                                    parameters.push(transformInputParameter(restInputParameter, propertyValue, /* invisible */ false));
                                }
                            }
                        }
                    } else {
                        // NOTE(johnwa): the value is not expandable, we should create a raw input for the specified parameterKey
                        // if the input parameter is not exist, then create the corresponding input parameter with specified key
                        if (inputParameter) {
                            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
                        } else {
                            const segments = parseEx(parameterKey);
                            const lastSegment = segments[segments.length - 1];
                            const required = descendantInputParameters.some(item => item.required);
                            let name: string = lastSegment.value as string;
                            let summary = name;

                            if (lastSegment.value === '$' && lastSegment.type === SegmentType.Property) {
                                name = parameterLocation;
                                summary = "Raw inputs";
                            }

                            inputParameter = {
                                key: parameterKey,
                                name,
                                type: 'object',
                                summary,
                                in: parameterLocation,
                                required,
                            };

                            parameters.push(transformInputParameter(inputParameter, clonedParameterValue, /* invisible */ false));
                        }
                    }
                }
            } else {
                let invisible = false;
                if (!inputParameter && createInvisibleParameter) {
                    invisible = true;
                }

                if (inputParameter) {
                    parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
                } else {
                    const segments = parseEx(parameterKey);
                    const lastSegment = segments[segments.length - 1];
                    if (
                        lastSegment.value === '$' &&
                        lastSegment.type === SegmentType.Property &&
                        typeof clonedParameterValue === 'object' &&
                        Object.keys(clonedParameterValue).length > 0
                    ) {
                        // expand the object
                        for (const propertyName of Object.keys(clonedParameterValue)) {
                            const childInputParameter = {
                                key: createEx([...segments, { type: SegmentType.Property, value: propertyName }]) as string,
                                name: propertyName,
                                type: 'any',
                                in: parameterLocation,
                                required: false,
                            };

                            parameters.push(transformInputParameter(childInputParameter, clonedParameterValue[propertyName], invisible));
                        }
                    } else {
                        inputParameter = {
                            key: parameterKey,
                            name: lastSegment.value as string,
                            type: 'any',
                            in: parameterLocation,
                            required: false,
                        };

                        parameters.push(transformInputParameter(inputParameter, clonedParameterValue, invisible));
                    }
                }
            }
        }
    }

    return parameters;
}

function getPropertyValueWithSpecifiedPathSegments(value: any, segments: Segment[], caseSensitive = false): any {
    if (segments.length === 0) {
        return value;
    }

    if (typeof value !== 'object' && !Array.isArray(value)) {
        return undefined;
    }

    const cloneSegments = [...segments];
    const firstSegment = cloneSegments.shift();
    const propertyName = getAndEscapeSegment(firstSegment as Segment);

    let propertyValue: any; // tslint:disable-line: no-any
    if (typeof propertyName === 'string') {
        // tslint:disable-next-line: no-any
        propertyValue = caseSensitive ? (<any>value)[propertyName] : getPropertyValue(value, propertyName);
    } else {
        propertyValue = value[propertyName];
    }
    return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

// tslint:disable-next-line: no-any
function deletePropertyValueWithSpecifiedPathSegment(value: any, segments: Segment[], caseSensitive = false) {
    let reachEnd = true;
    const cloneSegments = [...segments];
    while (cloneSegments.length > 0) {
        const deleteValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
        if (deleteValue === undefined) {
            break;
        }

        const lastSegment = cloneSegments.pop();
        const parentValue = getPropertyValueWithSpecifiedPathSegments(value, cloneSegments, caseSensitive);
        let propertyName = getAndEscapeSegment(lastSegment as Segment);
        if (!caseSensitive && typeof parentValue === 'object' && typeof propertyName === 'string') {
            for (const key of Object.keys(parentValue)) {
                if (equals(key, propertyName)) {
                    propertyName = key;
                    break;
                }
            }
        }

        if (reachEnd) {
            reachEnd = false;
            delete parentValue[propertyName];
        } else {
            let ableDelete = true;
            if (typeof deleteValue === 'object' && Object.keys(deleteValue).some(key => deleteValue[key] !== undefined)) {
                ableDelete = false;
            } else if (Array.isArray(deleteValue) && deleteValue.some(item => item !== undefined)) {
                ableDelete = false;
            }

            if (ableDelete) {
                delete parentValue[propertyName];
            }
        }
    }
}

function getAndEscapeSegment(segment: Segment): string | number {
    // NOTE(johnwa): for property segment, return the property name as key; for index segment, return the index value or 0
    switch (segment.type) {
        case SegmentType.Property:
            return tryConvertStringToExpression(decodePropertySegment(segment.value as string));
        case SegmentType.Index:
            return segment.value || 0;
        default:
            return segment.value as string | number;
    }
}

/**
 * Converts the value to a string that will be evaluated to the original value at runtime.
 * @arg {string} value - The value that the returned string will be evaluated to.
 * @return {string}
 */
 export function tryConvertStringToExpression(value: string): string {
    if (isTemplateExpression(value)) {
        if (value.charAt(0) === '@') {
            return `@${value}`;
        } else {
            return value.replace(/@{/g, '@@{');
        }
    } else {
        return value;
    }
}

function getExtraSegments(key: string, ancestorKey: string): Segment[] {
    let childSegments: Segment[] = [];
    let startIndex = 0;

    if (key && ancestorKey) {
        childSegments = parseEx(key);
        const ancestorSegments = parseEx(ancestorKey);
        let ancestorStartIndex = 0;
        if (ancestorSegments.length < childSegments.length) {
            for (startIndex = 0; startIndex < childSegments.length; startIndex++) {
                const childSegment = childSegments[startIndex];
                const ancestorSegment = ancestorSegments[ancestorStartIndex];
                if (childSegment.type === SegmentType.Property && childSegment.value === ancestorSegment.value) {
                    ancestorStartIndex++;
                }
                if (ancestorStartIndex === ancestorSegments.length) {
                    startIndex++;
                    break;
                }
            }
        }
    }

    return childSegments.slice(startIndex);
}

function transformInputParameter(
    inputParameter: InputParameter,
    parameterValue: any, // tslint:disable-line: no-any
    invisible = false
): InputParameter {
    return { ...inputParameter, invisible, value: parameterValue };
}
