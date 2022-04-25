import { createEx, decodePropertySegment, InputParameter, isAncestorKey, parseEx, Segment, SegmentType } from "@microsoft-logic-apps/parsers";
import { clone, first, getPropertyValue, isNullOrUndefined, isObject } from "@microsoft-logic-apps/utils";

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
                            let alternativeParameterKeyExtraSegment: Segment[] = null;

                            if (descendantInputParameter.alternativeKey) {
                                alternativeParameterKeyExtraSegment = getExtraSegments(descendantInputParameter.alternativeKey, parameterKey);
                                const alternativeParameterKeyDescendantValue = getPropertyValueWithSpecifiedPathSegments(clonedParameterValue, alternativeParameterKeyExtraSegment);
                                if (alternativeParameterKeyDescendantValue !== descendantValue) {
                                    throw new ValidationException(
                                        ValidationErrorCode.UNSPECIFIED,
                                        format(
                                            Resources.ERROR_DESERIALIZATION_APINOTIFICATIONCONNECTION_TRIGGER_VALUE_MISMATCH,
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
                                        key: createEx(childKeySegments),
                                        name: restPropertyName,
                                        type: Constants.SWAGGER.TYPE.ANY,
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
                                summary = Resources.HTTP_INPUTS_RAW_INPUTS_SUMMARY;
                            }

                            inputParameter = {
                                key: parameterKey,
                                name,
                                type: Constants.SWAGGER.TYPE.OBJECT,
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
                                key: createEx([...segments, { type: SegmentType.Property, value: propertyName }]),
                                name: propertyName,
                                type: Constants.SWAGGER.TYPE.ANY,
                                in: parameterLocation,
                                required: false,
                            };

                            parameters.push(transformInputParameter(childInputParameter, clonedParameterValue[propertyName], invisible));
                        }
                    } else {
                        inputParameter = {
                            key: parameterKey,
                            name: lastSegment.value as string,
                            type: Constants.SWAGGER.TYPE.ANY,
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
    const propertyName = getAndEscapeSegment(firstSegment);

    let propertyValue: any; // tslint:disable-line: no-any
    if (typeof propertyName === 'string') {
        // tslint:disable-next-line: no-any
        propertyValue = caseSensitive ? (<any>value)[propertyName] : getPropertyValue(value, propertyName);
    } else {
        propertyValue = value[propertyName];
    }
    return getPropertyValueWithSpecifiedPathSegments(propertyValue, cloneSegments, caseSensitive);
}

function getAndEscapeSegment(segment: Segment): string | number {
    // NOTE(johnwa): for property segment, return the property name as key; for index segment, return the index value or 0
    switch (segment.type) {
        case SegmentType.Property:
            return tryConvertStringToExpression(decodePropertySegment(segment.value as string));
        case SegmentType.Index:
            return segment.value || 0;
        default:
            return segment.value;
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
function isTemplateExpression(value: string) {
    throw new Error("Function not implemented.");
}

