import { LogEntryLevel, LoggerService, wrapStringifiedTokenSegments } from '@microsoft/logic-apps-shared';
import type { InitializeVariableProps } from '.';
import { createEmptyLiteralValueSegment, createLiteralValueSegment } from '../base/utils/helper';
import { convertSegmentsToString, isEmptySegments } from '../base/utils/parsesegments';
import type { ValueSegment } from '../models/parameter';
import { convertStringToSegments } from '../base/utils/editorToSegment';
import { VARIABLE_TYPE } from '../../constants';

export const parseVariableEditorSegments = (initialValue: ValueSegment[]): InitializeVariableProps[] => {
  if (isEmptySegments(initialValue)) {
    return [
      { name: [createEmptyLiteralValueSegment()], type: [createEmptyLiteralValueSegment()], value: [createEmptyLiteralValueSegment()] },
    ];
  }

  const nodeMap: Map<string, ValueSegment> = new Map<string, ValueSegment>();
  const initialValueString = convertSegmentsToString(initialValue, nodeMap);
  const wrappedValueString = wrapStringifiedTokenSegments(initialValueString);

  try {
    const variables = JSON.parse(wrappedValueString);

    return Array.isArray(variables)
      ? variables.map((variable: { name: string; type: string; value: string }) => ({
          name: [createLiteralValueSegment(variable.name)],
          type: [createLiteralValueSegment(variable.type)],
          value: convertStringToSegments(variable.value, nodeMap, {
            tokensEnabled: true,
            stringifyNonString: variable.type !== VARIABLE_TYPE.STRING,
          }),
        }))
      : [];
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'Variable Editor',
      message: 'Failed to parse variable editor segments',
      args: [
        {
          error,
        },
      ],
    });
    return [];
  }
};

export const createVariableEditorSegments = (variables: InitializeVariableProps[] | undefined): ValueSegment[] => {
  if (!variables || variables.length === 0) {
    return [createEmptyLiteralValueSegment()];
  }

  const nodeMap = new Map<string, ValueSegment>();
  const mappedVariables = variables.map((variable) => {
    const name = convertSegmentsToString(variable.name);
    const type = convertSegmentsToString(variable.type);
    let value = convertSegmentsToString(variable.value, nodeMap);

    try {
      if (type !== VARIABLE_TYPE.STRING) {
        value = JSON.parse(value);
      }
    } catch (_error) {
      // do nothing
    }
    return { name, type, value };
  });

  const stringifiedVariables = JSON.stringify(mappedVariables);

  return convertStringToSegments(stringifiedVariables, nodeMap, { tokensEnabled: true });
};
