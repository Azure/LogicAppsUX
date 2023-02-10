import type { MapCheckerEntry } from '../components/mapChecker/MapCheckerItem';
import { MapCheckerItemSeverity } from '../components/mapChecker/MapCheckerItem';
import { sourcePrefix } from '../constants/ReactFlowConstants';
import type { FunctionData, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { NormalizedDataType, SchemaNodeProperty } from '../models';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import {
  flattenInputs,
  isCustomValue,
  isValidConnectionByType,
  isValidCustomValueByType,
  nodeHasSourceNodeEventually,
} from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { isSchemaNodeExtended } from './Schema.Utils';

export const collectErrorsForMapChecker = (connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const errors: MapCheckerEntry[] = [];

  // Valid input types
  Object.entries(connections).forEach(([_connectionKey, connectionValue]) => {
    if (!areInputsValid(connectionValue)) {
      const node = connectionValue.self.node;
      errors.push({
        title: 'Input type mismatch',
        description: `${isFunctionData(node) ? node.displayName : node.name} has an input with a mismatched type`,
        severity: MapCheckerItemSeverity.Error,
        reactFlowId: connectionValue.self.reactFlowKey,
      });
    }
  });

  return errors;
};

export const collectWarningsForMapChecker = (connections: ConnectionDictionary, targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const warnings: MapCheckerEntry[] = [];

  // Required fields
  Object.entries(targetSchema).forEach(([reactFlowId, schemaValue]) => {
    if (
      schemaValue.normalizedDataType !== NormalizedDataType.ComplexType &&
      schemaValue.nodeProperties.indexOf(SchemaNodeProperty.Optional) === -1
    ) {
      const connection = connections[reactFlowId];
      if (!nodeHasSourceNodeEventually(connection, connections)) {
        warnings.push({
          title: 'Required field missing',
          description: `${schemaValue.name} has an non-terminating connection chain`,
          severity: MapCheckerItemSeverity.Warning,
          reactFlowId,
        });
      }
    }
  });

  return warnings;
};

export const collectInfoForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const info: MapCheckerEntry[] = [];

  return info;
};

export const collectOtherForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerEntry[] => {
  const other: MapCheckerEntry[] = [];

  return other;
};

export const areInputsValid = (connection: Connection): boolean => {
  if (connection.self.reactFlowKey.startsWith(sourcePrefix)) {
    return true;
  } else if (isSchemaNodeExtended(connection.self.node)) {
    return areInputsValidForSchemaNode(connection.self.node, connection);
  } else {
    return areInputsValidForFunction(connection.self.node, connection);
  }
};

export const areInputsValidForSchemaNode = (selfNode: SchemaNodeExtended, connection: Connection): boolean => {
  const input = flattenInputs(connection.inputs)[0];
  if (input === undefined) {
    return true;
  }

  if (isCustomValue(input)) {
    return isValidCustomValueByType(input, selfNode.normalizedDataType);
  } else {
    if (isSchemaNodeExtended(input.node)) {
      return isValidConnectionByType(selfNode.normalizedDataType, input.node.normalizedDataType);
    } else {
      return isValidConnectionByType(selfNode.normalizedDataType, input.node.outputValueType);
    }
  }
};

export const areInputsValidForFunction = (functionData: FunctionData, connection: Connection): boolean => {
  let isEveryInputValid = true;

  Object.values(connection.inputs).forEach((inputArr, inputIdx) => {
    inputArr.forEach((inputVal) => {
      let inputValMatchedOneOfAllowedTypes = false;

      functionData.inputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
        if (inputVal !== undefined) {
          if (isCustomValue(inputVal)) {
            if (isValidCustomValueByType(inputVal, allowedInputType)) {
              inputValMatchedOneOfAllowedTypes = true;
            }
          } else {
            if (isSchemaNodeExtended(inputVal.node)) {
              if (isValidConnectionByType(allowedInputType, inputVal.node.normalizedDataType)) {
                inputValMatchedOneOfAllowedTypes = true;
              }
            } else if (isValidConnectionByType(allowedInputType, inputVal.node.outputValueType)) {
              inputValMatchedOneOfAllowedTypes = true;
            }
          }
        }
      });

      if (!inputValMatchedOneOfAllowedTypes) {
        isEveryInputValid = false;
      }
    });
  });

  return isEveryInputValid;
};
