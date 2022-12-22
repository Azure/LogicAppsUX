/* eslint-disable no-param-reassign */
import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary } from '../models';
import { SchemaType } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { setConnectionInputValue } from '../utils/Connection.Utils';
import { getSourceValueFromLoop, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { findFunctionForFunctionName, findFunctionForKey, isFunctionData } from '../utils/Function.Utils';
import { createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary } from '../utils/Schema.Utils';
import { isAGuid } from '@microsoft/utils-logic-apps';

export const convertFromMapDefinition = (
  mapDefinition: MapDefinitionEntry,
  sourceSchema: SchemaExtended,
  targetSchema: SchemaExtended,
  functions: FunctionData[]
): ConnectionDictionary => {
  const connections: ConnectionDictionary = {};
  const parsedYamlKeys: string[] = Object.keys(mapDefinition);

  const sourceFlattened = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
  const targetFlattened = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);

  const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

  if (rootNodeKey) {
    parseDefinitionToConnection(
      mapDefinition[rootNodeKey],
      `/${rootNodeKey}`,
      connections,
      {},
      sourceSchema,
      sourceFlattened,
      targetSchema,
      targetFlattened,
      functions
    );
  }
  return connections;
};

const parseDefinitionToConnection = (
  sourceNodeObject: string | object | any,
  targetKey: string,
  connections: ConnectionDictionary,
  createdNodes: { [completeFunction: string]: string },
  sourceSchema: SchemaExtended,
  sourceSchemaFlattened: SchemaNodeDictionary,
  targetSchema: SchemaExtended,
  targetSchemaFlattened: SchemaNodeDictionary,
  functions: FunctionData[]
) => {
  if (typeof sourceNodeObject === 'string') {
    const sourceEndOfFunction = sourceNodeObject.indexOf('(');
    const amendedSourceKey = targetKey.includes(mapNodeParams.for) ? getSourceValueFromLoop(sourceNodeObject, targetKey) : sourceNodeObject;

    const sourceNode =
      sourceEndOfFunction > -1
        ? findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunction), functions)
        : findNodeForKey(amendedSourceKey, sourceSchema.schemaTreeRoot);
    const sourceKey =
      sourceNode && isFunctionData(sourceNode)
        ? createdNodes[amendedSourceKey]
          ? createdNodes[amendedSourceKey]
          : createReactFlowFunctionKey(sourceNode)
        : `${sourcePrefix}${amendedSourceKey}`;
    createdNodes[amendedSourceKey] = sourceKey;

    const destinationFunctionKey = targetKey.slice(0, targetKey.indexOf('-'));
    const destinationFunctionGuid = targetKey.slice(targetKey.indexOf('-') + 1);
    const destinationNode = isAGuid(destinationFunctionGuid)
      ? findFunctionForKey(destinationFunctionKey, functions)
      : findNodeForKey(targetKey, targetSchema.schemaTreeRoot);
    const destinationKey = isAGuid(destinationFunctionGuid) ? targetKey : `${targetPrefix}${destinationNode?.key}`;

    if (targetKey.includes(mapNodeParams.for)) {
      // if has for, add parent connection
      if (sourceNode && destinationNode) {
        addParentConnectionForRepeatingElements(destinationNode, sourceNode, sourceSchemaFlattened, targetSchemaFlattened, connections);
      }
    }

    if (destinationNode) {
      setConnectionInputValue(connections, {
        targetNode: destinationNode,
        targetNodeReactFlowKey: destinationKey,
        findInputSlot: true,
        value: sourceNode
          ? {
              reactFlowKey: sourceKey,
              node: sourceNode,
            }
          : amendedSourceKey,
      });
    }

    // Need to extract and create connections for nested functions
    if (sourceEndOfFunction > -1) {
      const childFunctions = splitKeyIntoChildren(sourceNodeObject);

      childFunctions.forEach((childFunction) => {
        parseDefinitionToConnection(
          childFunction,
          sourceKey,
          connections,
          createdNodes,
          sourceSchema,
          sourceSchemaFlattened,
          targetSchema,
          targetSchemaFlattened,
          functions
        );
      });
    }

    return;
  }

  for (const childKey in sourceNodeObject) {
    let childTargetKey = targetKey;
    if (childKey !== mapNodeParams.value) {
      const trimmedChildKey =
        childKey.startsWith('$') && !(childKey.startsWith(mapNodeParams.for) || childKey.startsWith(mapNodeParams.if))
          ? childKey.substring(1)
          : childKey;
      childTargetKey = `${targetKey}/${trimmedChildKey}`;
    }

    parseDefinitionToConnection(
      sourceNodeObject[childKey],
      childTargetKey,
      connections,
      createdNodes,
      sourceSchema,
      sourceSchemaFlattened,
      targetSchema,
      targetSchemaFlattened,
      functions
    );
  }
};
