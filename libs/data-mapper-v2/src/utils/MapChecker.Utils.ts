import { sourcePrefix } from '../constants/ReactFlowConstants';
import type { FunctionData } from '../models';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import {
  isCustomValueConnection,
  isEmptyConnection,
  isValidConnectionByType,
  isValidCustomValueByType,
  nodeHasSourceNodeEventually,
} from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { isObjectType, isSchemaNodeExtended } from './Schema.Utils';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty } from '@microsoft/logic-apps-shared';
import { defineMessages } from 'react-intl';
import type { IntlMessage } from './Intl.Utils';
import { UnboundedInput } from '../constants/FunctionConstants';

export class DeserializationError extends Error {
  public mapIssue: MapIssue;

  constructor(message: string, mapIssue: MapIssue) {
    super(message);
    this.name = 'DeserializationError';
    this.mapIssue = mapIssue;
  }
}
export interface MapIssue {
  severity: MapCheckerItemSeverity;
  reactFlowId: string;
  issueType: MapIssueType;
}

export const MapIssueType = {
  TargetSchemaNodeNotFound: 'TargetSchemaNodeNotFound',
  FunctionNotFound: 'FunctionNotFound',
  KeyNotFound: 'KeyNotFound',
  LoopSourceNotFound: 'LoopSourceNotFound',
  SourceSchemaNodeNotFound: 'SourceSchemaNodeNotFound',
};

export type MapIssueType = (typeof MapIssueType)[keyof typeof MapIssueType];

export const MapCheckerItemSeverity = {
  Error: 'Error',
  Warning: 'Warning',
  Info: 'Info',
  Unknown: 'Unknown',
} as const;
export type MapCheckerItemSeverity = (typeof MapCheckerItemSeverity)[keyof typeof MapCheckerItemSeverity];

export interface MapCheckerMessage {
  title: IntlMessage;
  description: IntlMessage;
  severity: MapCheckerItemSeverity;
  reactFlowId: string;
  data?: any;
}

export const collectErrorsForMapChecker = (connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerMessage[] => {
  const errors: MapCheckerMessage[] = [];

  // Valid input types
  Object.entries(connections).forEach(([_connectionKey, connectionValue]) => {
    const node = connectionValue.self.node;

    if (isFunctionData(node)) {
      if (!functionHasRequiredInputs(node, connectionValue)) {
        errors.push({
          title: { message: mapCheckerResources.functionMissingInputsTitle },
          description: { message: mapCheckerResources.functionMissingInputsBody, value: { functionName: node.displayName } },
          severity: MapCheckerItemSeverity.Error,
          reactFlowId: connectionValue.self.reactFlowKey,
          data: { functionName: node.displayName },
        });
      }
    }
  });

  return errors;
};

export const convertMapIssuesToMessages = (mapIssues: MapIssue[]): MapCheckerMessage[] => {
  const mapCheckerMessages: MapCheckerMessage[] = [];
  mapIssues.forEach((mapIssue) => {
    const mapMessage: MapCheckerMessage = {
      title: { message: deserializationMessages.MapLoadError },
      description: { message: deserializationMessages[mapIssue.issueType], value: { nodeKey: mapIssue.reactFlowId } },
      severity: MapCheckerItemSeverity.Error,
      reactFlowId: mapIssue.reactFlowId,
    };

    mapCheckerMessages.push(mapMessage);
  });
  return mapCheckerMessages;
};

export const collectWarningsForMapChecker = (
  connections: ConnectionDictionary,
  targetSchema: SchemaNodeDictionary
): MapCheckerMessage[] => {
  const warnings: MapCheckerMessage[] = [];

  // Valid input types
  Object.entries(connections).forEach(([_connectionKey, connectionValue]) => {
    const node = connectionValue.self.node;

    if (isFunctionData(node)) {
      // not needed until we get function types from backend
      //   if (!areInputTypesValidForFunction(node, connectionValue)) {
      //     warnings.push({
      //       title: { message: mapCheckerResources.inputTypeMismatchTitle },
      //       description: {
      //         message: mapCheckerResources.functionInputTypeMismatchBody,
      //         value: { nodeName: node.displayName },
      //       },
      //       severity: MapCheckerItemSeverity.Warning,
      //       reactFlowId: connectionValue.self.reactFlowKey,
      //     });
      //   }
    } else if (!connectionValue.self.reactFlowKey.startsWith(sourcePrefix) && !areInputTypesValidForSchemaNode(node, connectionValue)) {
      warnings.push({
        title: { message: mapCheckerResources.inputTypeMismatchTitle },
        description: {
          message: mapCheckerResources.schemaInputTypeMismatchBody,
          value: { nodeName: node.name },
        },
        severity: MapCheckerItemSeverity.Warning,
        reactFlowId: connectionValue.self.reactFlowKey,
      });
    }
  });

  // Required target schema fields
  Object.entries(targetSchema).forEach(([reactFlowId, schemaValue]) => {
    if (!isObjectType(schemaValue.type) && schemaValue.nodeProperties.indexOf(SchemaNodeProperty.Optional) === -1) {
      const connection = connections[reactFlowId];
      if (!nodeHasSourceNodeEventually(connection, connections)) {
        warnings.push({
          title: { message: mapCheckerResources.requiredSchemaNodeTitle },
          description: { message: mapCheckerResources.requiredSchemaNodeBody, value: { nodeName: schemaValue.name } },
          severity: MapCheckerItemSeverity.Warning,
          reactFlowId,
        });
      }
    }
  });

  return warnings;
};

export const collectInfoForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerMessage[] => {
  const info: MapCheckerMessage[] = [];

  return info;
};

export const collectOtherForMapChecker = (_connections: ConnectionDictionary, _targetSchema: SchemaNodeDictionary): MapCheckerMessage[] => {
  const other: MapCheckerMessage[] = [];

  return other;
};

export const areInputTypesValidForSchemaNode = (selfNode: SchemaNodeExtended, connection: Connection): boolean => {
  const input = connection.inputs[0];
  if (input === undefined || isEmptyConnection(input)) {
    return true;
  }

  if (isCustomValueConnection(input)) {
    return isValidCustomValueByType(input.value, selfNode.type);
  }
  if (isSchemaNodeExtended(input.node)) {
    return isValidConnectionByType(selfNode.type, input.node?.type);
  }
  return isValidConnectionByType(selfNode.type, input.node?.outputValueType);
};

// will add back when we get type info from backend
// export const areInputTypesValidForFunction = (functionData: FunctionData, connection: Connection): boolean => {
//   let isEveryInputValid = true;

//   Object.values(connection.inputs).forEach((inputVal, inputIdx) => {
//       let inputValMatchedOneOfAllowedTypes = false;

//       functionData.inputs[inputIdx].allowedTypes.forEach((allowedInputType) => {
//         if (inputVal !== undefined) {
//           if (isCustomValue(inputVal)) {
//             if (isValidCustomValueByType(inputVal, allowedInputType)) {
//               inputValMatchedOneOfAllowedTypes = true;
//             }
//           } else {
//             if (isSchemaNodeExtended(inputVal.node)) {
//               if (isValidConnectionByType(allowedInputType, inputVal.node.type)) {
//                 inputValMatchedOneOfAllowedTypes = true;
//               }
//             } else if (isValidConnectionByType(allowedInputType, inputVal.node.outputValueType)) {
//               inputValMatchedOneOfAllowedTypes = true;
//             }
//           }
//         } else {
//           // Ignore undefined for type checking
//           inputValMatchedOneOfAllowedTypes = true;
//         }
//       });

//       if (!inputValMatchedOneOfAllowedTypes) {
//         isEveryInputValid = false;
//       }
//   });

//   return isEveryInputValid;
// };

export const functionHasRequiredInputs = (functionData: FunctionData, connection: Connection): boolean => {
  let isEveryInputValid = true;

  if (functionData.maxNumberOfInputs === UnboundedInput) {
    return true;
  }

  functionData.inputs.forEach((input, inputIdx) => {
    if (!input.isOptional) {
      if (isEmptyConnection(connection.inputs[inputIdx])) {
        isEveryInputValid = false;
      }
    }
  });

  return isEveryInputValid;
};

const deserializationMessages = defineMessages<MapIssueType>({
  MapLoadError: {
    defaultMessage: 'Error loading data map',
    id: 'PEJ+e4',
    description: 'Error message for data map load error',
  },
  TargetSchemaNodeNotFound: {
    defaultMessage: `Target schema node not found for node key ''{nodeKey}''`,
    id: '5DkTf5',
    description: 'Error message for target schema node not found',
  },
  FunctionNotFound: {
    defaultMessage: `Function not found- ''{nodeKey}''`,
    id: 'GiR7ll',
    description: 'Error message for function not found',
  },
  KeyNotFound: {
    defaultMessage: `Key not found ''{nodeKey}''`,
    id: 'Bwqlxd',
    description: 'Error message for key not found',
  },
  SourceSchemaNodeNotFound: {
    defaultMessage: `Source schema node not found for node key ''{nodeKey}''`,
    id: 'FPBmrA',
    description: 'Error message for source schema node not found',
  },
});

const mapCheckerResources = defineMessages({
  inputTypeMismatchTitle: {
    defaultMessage: 'Input type mismatch',
    id: 'wkvUUA',
    description: 'Title for the input type mismatch card',
  },
  functionInputTypeMismatchBody: {
    defaultMessage: `Function ''{nodeName}'' has an input with a mismatched type`,
    id: 'qr1lLG',
    description: 'Body text for the input type mismatch card',
  },
  schemaInputTypeMismatchBody: {
    defaultMessage: `Schema node ''{nodeName}'' has an input with a mismatched type`,
    id: 'E3+TAA',
    description: 'Body text for the input type mismatch card',
  },
  functionMissingInputsTitle: {
    defaultMessage: 'Missing required inputs',
    id: '/vWMKW',
    description: 'Title for a function missing a required input card',
  },
  functionMissingInputsBody: {
    defaultMessage: `Function ''{functionName}'' is missing required inputs`,
    id: 'kfmLTY',
    description: 'Body text for a function missing a required input card',
  },
  requiredSchemaNodeTitle: {
    defaultMessage: 'Schema is missing required inputs',
    id: 'dBWIjR',
    description: 'Title for an unconnected required schema card',
  },
  requiredSchemaNodeBody: {
    defaultMessage: `Schema node ''{nodeName}'' has an non-terminating connection chain`,
    id: 'Ufv5m9',
    description: 'Body text for an unconnected required schema card',
  },
  functionExceedsMaxInputsTitle: {
    defaultMessage: 'Too many inputs assigned',
    id: 'tAbbH8',
    description: 'Title for a too many inputs card',
  },
  functionExceedsMaxInputsBody: {
    defaultMessage: `Function ''{functionName}'' has too many inputs assigned to it`,
    id: '6gZ4I3',
    description: 'Body text for a too many inputs card',
  },
});
