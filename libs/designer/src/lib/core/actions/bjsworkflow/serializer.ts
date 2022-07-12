import type { Workflow } from '../../../common/models/workflow';
import type { RootState } from '../../store';
import {
  encodePathValue,
  getAndEscapeSegment,
  getEncodeValue,
  getJSONValueFromString,
  parameterValueToString,
} from '../../utils/parameters/helper';
import type { Segment } from '@microsoft-logic-apps/parsers';
import { cleanIndexedValue, isAncestorKey, parseEx, SegmentType } from '@microsoft-logic-apps/parsers';
import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { first } from '@microsoft-logic-apps/utils';
import type { ParameterInfo } from '@microsoft/designer-ui';

export const serializeWorkflow = (_rootState: RootState): Workflow => {
  return {
    definition: {} as any,
    connectionReferences: {},
    parameters: {},
  };
};

export const serializeOperationParameters = (inputs: ParameterInfo[], manifest: OperationManifest): Record<string, any> => {
  const inputsToSerialize = inputs
    .filter((input) => !input.info.serialization?.skip)
    .map((input) => ({
      ...input,
      value: parameterValueToString(input, true /* isDefinitionValue */),
    }));

  const inputsLocation = (manifest.properties.inputsLocation ?? ['inputs']).slice(1);
  const inputPathValue = constructInputValues('inputs.$', inputsToSerialize, true /* encodePathComponents */);
  let parametersValue: any = inputPathValue;

  while (inputsLocation.length) {
    const property = inputsLocation.pop() as string;
    parametersValue = { [property]: parametersValue };
  }

  return parametersValue;
};

export interface SerializedParameter extends ParameterInfo {
  value: any;
}

export const constructInputValues = (key: string, inputs: SerializedParameter[], encodePathComponents: boolean): any => {
  let result: any;

  const rootParameter = first((parameter) => cleanIndexedValue(parameter.parameterKey) === cleanIndexedValue(key), inputs);
  if (rootParameter) {
    result = getJSONValueFromString(rootParameter.value, rootParameter.type);
    if (encodePathComponents) {
      const encodeCount = getEncodeValue(rootParameter.info.encode ?? '');
      result = encodePathValue(result, encodeCount);
    }
    return result !== undefined ? result : rootParameter.required ? null : undefined;
  } else {
    const descendantParameters = inputs.filter((item) => isAncestorKey(item.parameterKey, key));
    for (const serializedParameter of descendantParameters) {
      let parameterValue = getJSONValueFromString(serializedParameter.value, serializedParameter.type);
      if (encodePathComponents) {
        const encodeCount = getEncodeValue(serializedParameter.info.encode ?? '');
        parameterValue = encodePathValue(parameterValue, encodeCount);
      }
      result = serializeParameterWithPath(result, parameterValue, key, serializedParameter);
    }
  }

  return result;
};

const serializeParameterWithPath = (
  parent: any,
  serializedValue: any,
  parentKey: string,
  serializedParameter: SerializedParameter
): any => {
  const valueKeys = serializedParameter.alternativeKey
    ? [serializedParameter.parameterKey, serializedParameter.alternativeKey]
    : [serializedParameter.parameterKey];
  const required = serializedParameter.required;
  let result = parent;

  for (const valueKey of valueKeys) {
    if (parentKey === valueKey) {
      return serializedValue;
    }

    if (!required && serializedValue === undefined) {
      return result;
    }

    const parentSegments = parseEx(parentKey);
    const valueSegments = parseEx(valueKey);
    const pathSegments = valueSegments.slice(parentSegments.length);
    if (result === undefined) {
      const firstSegment = pathSegments[0];
      if (firstSegment.type === SegmentType.Index) {
        result = [];
      } else {
        result = {};
      }
    }

    let p = result;
    while (pathSegments.length > 0) {
      const pathSegment = pathSegments.shift() as Segment;
      const propertyKey = getAndEscapeSegment(pathSegment);
      const lastSegment = pathSegments.length === 0;
      if (lastSegment) {
        p[propertyKey] = serializedValue !== undefined ? serializedValue : null;
      } else {
        const nextSegment = pathSegments[0];
        if (p[propertyKey] === undefined) {
          p[propertyKey] = nextSegment.type === SegmentType.Index ? [] : {};
        }
        p = p[propertyKey];
      }
    }
  }

  return result;
};
