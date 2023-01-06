/* eslint-disable no-param-reassign */
import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary } from '../models';
import { SchemaType } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { setConnectionInputValue } from '../utils/Connection.Utils';
import { getDestinationKey, getDestinationNode, getSourceValueFromLoop, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { findFunctionForFunctionName, isFunctionData } from '../utils/Function.Utils';
import { createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary } from '../utils/Schema.Utils';

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
    createConnections(
      sourceNodeObject,
      targetKey,
      connections,
      createdNodes,
      sourceSchema,
      sourceSchemaFlattened,
      targetSchema,
      targetSchemaFlattened,
      functions
    );
    return;
  }

  callChildObjects(
    sourceNodeObject,
    targetKey,
    connections,
    createdNodes,
    sourceSchema,
    sourceSchemaFlattened,
    targetSchema,
    targetSchemaFlattened,
    functions
  );
};

const parseDefinitionToConditionalConnection = (
  sourceNodeObject: any,
  sourceNodeObjectAsString: string,
  targetKey: string,
  connections: ConnectionDictionary,
  createdNodes: { [completeFunction: string]: string },
  sourceSchema: SchemaExtended,
  sourceSchemaFlattened: SchemaNodeDictionary,
  targetSchema: SchemaExtended,
  targetSchemaFlattened: SchemaNodeDictionary,
  functions: FunctionData[]
) => {
  createConnections(
    sourceNodeObjectAsString,
    targetKey,
    connections,
    createdNodes,
    sourceSchema,
    sourceSchemaFlattened,
    targetSchema,
    targetSchemaFlattened,
    functions
  );

  callChildObjects(
    sourceNodeObject,
    targetKey,
    connections,
    createdNodes,
    sourceSchema,
    sourceSchemaFlattened,
    targetSchema,
    targetSchemaFlattened,
    functions
  );
};

const callChildObjects = (
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
  const childEntries = Object.entries(sourceNodeObject);
  childEntries.forEach((childEntry) => {
    let childTargetKey = targetKey;
    if (childEntry[0] !== mapNodeParams.value) {
      const trimmedChildKey = childEntry[0].startsWith('$@') ? childEntry[0].substring(1) : childEntry[0];
      childTargetKey = `${targetKey}/${trimmedChildKey}`;
    }

    if (childEntry[0].startsWith(mapNodeParams.if)) {
      parseDefinitionToConditionalConnection(
        sourceNodeObject[childEntry[0]],
        childEntry[0],
        targetKey,
        connections,
        createdNodes,
        sourceSchema,
        sourceSchemaFlattened,
        targetSchema,
        targetSchemaFlattened,
        functions
      );
    } else {
      parseDefinitionToConnection(
        childEntry[1],
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
  });
};

const createConnections = (
  sourceNodeString: string,
  targetKey: string,
  connections: ConnectionDictionary,
  createdNodes: { [completeFunction: string]: string },
  sourceSchema: SchemaExtended,
  sourceSchemaFlattened: SchemaNodeDictionary,
  targetSchema: SchemaExtended,
  targetSchemaFlattened: SchemaNodeDictionary,
  functions: FunctionData[]
) => {
  const sourceEndOfFunction = sourceNodeString.indexOf('(');
  const amendedSourceKey = targetKey.includes(mapNodeParams.for) ? getSourceValueFromLoop(sourceNodeString, targetKey) : sourceNodeString;

  const sourceNode =
    sourceEndOfFunction > -1
      ? findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunction), functions)
      : findNodeForKey(amendedSourceKey, sourceSchema.schemaTreeRoot);

  let sourceKey: string;
  let functionAlreadyCreated = false;
  if (sourceNode && isFunctionData(sourceNode)) {
    if (createdNodes[amendedSourceKey]) {
      functionAlreadyCreated = true;
      sourceKey = createdNodes[amendedSourceKey];
    } else {
      sourceKey = createReactFlowFunctionKey(sourceNode);
    }
  } else {
    sourceKey = `${sourcePrefix}${amendedSourceKey}`;
  }
  createdNodes[amendedSourceKey] = sourceKey;

  const destinationNode = getDestinationNode(targetKey, functions, targetSchema.schemaTreeRoot);
  const destinationKey = getDestinationKey(targetKey, destinationNode);

  if (targetKey.includes(mapNodeParams.for)) {
    // if has $for, add parent connection
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
  if (sourceEndOfFunction > -1 && !functionAlreadyCreated) {
    const childFunctions = splitKeyIntoChildren(amendedSourceKey);

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
};
