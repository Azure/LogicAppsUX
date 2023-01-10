/* eslint-disable no-param-reassign */
import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import {
  SchemaType,
  directAccessPseudoFunction,
  directAccessPseudoFunctionKey,
  indexPseudoFunction,
  indexPseudoFunctionKey,
} from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { setConnectionInputValue } from '../utils/Connection.Utils';
import { getDestinationNode, getSourceValueFromLoop, splitKeyIntoChildren } from '../utils/DataMap.Utils';
import { findFunctionForFunctionName, isFunctionData } from '../utils/Function.Utils';
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
  const childEntries = Object.entries<MapDefinitionEntry>(sourceNodeObject);
  childEntries.forEach((childEntry) => {
    let childTargetKey = targetKey;
    if (childEntry[0] !== mapNodeParams.value) {
      const trimmedChildKey = childEntry[0].startsWith('$@') ? childEntry[0].substring(1) : childEntry[0];
      childTargetKey = `${targetKey}/${trimmedChildKey}`;
    }

    if (childEntry[0].startsWith(mapNodeParams.if)) {
      Object.values(childEntry[1]).forEach((childSubValue) => {
        parseDefinitionToConnection(
          childSubValue,
          childEntry[0],
          connections,
          createdNodes,
          sourceSchema,
          sourceSchemaFlattened,
          targetSchema,
          targetSchemaFlattened,
          functions
        );
      });

      const childSubKey = Object.keys(childEntry[1])[0];
      parseDefinitionToConditionalConnection(
        sourceNodeObject[childEntry[0]],
        childEntry[0],
        `${targetKey}/${childSubKey}`,
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
  const isLoop: boolean = targetKey.includes(mapNodeParams.for);
  const isConditional: boolean = targetKey.startsWith(mapNodeParams.if);
  const sourceEndOfFunction = sourceNodeString.indexOf('(');
  let amendedSourceKey = isLoop ? getSourceValueFromLoop(sourceNodeString, targetKey) : sourceNodeString;
  let mockDirectAccessFnKey: string | undefined = undefined;
  const [daOpenBracketIdx, daClosedBracketIdx] = [amendedSourceKey.indexOf('['), amendedSourceKey.indexOf(']')];

  // Identify source schema node, or Function(Data) from source key
  let sourceNode: SchemaNodeExtended | FunctionData | undefined = undefined;
  if (sourceEndOfFunction > -1) {
    // We found a Function in source key -> let's find its data
    sourceNode = findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunction), functions);
  } else if (daOpenBracketIdx > -1 && daClosedBracketIdx > -1) {
    // One of the source key's chunks contained a Direct Access, so let's format it
    // into the Function syntax the deserializer can parse
    sourceNode = directAccessPseudoFunction;

    mockDirectAccessFnKey = `${directAccessPseudoFunctionKey}(`;
    mockDirectAccessFnKey += `${amendedSourceKey.substring(daOpenBracketIdx + 1, daClosedBracketIdx)}, `; // Index value
    mockDirectAccessFnKey += `${amendedSourceKey.substring(0, daOpenBracketIdx)}, `; // Scope (source loop element)
    mockDirectAccessFnKey += `${amendedSourceKey.substring(0, daOpenBracketIdx)}${amendedSourceKey.substring(daClosedBracketIdx + 1)}`; // Output value
    mockDirectAccessFnKey += ')';
  } else if (amendedSourceKey.startsWith(indexPseudoFunctionKey)) {
    // Handle index variable usage
    sourceNode = indexPseudoFunction;
    createdNodes[amendedSourceKey] = amendedSourceKey; // Bypass below block since we already have rfKey here
  } else {
    sourceNode = findNodeForKey(amendedSourceKey, sourceSchema.schemaTreeRoot);
  }

  let sourceKey: string;
  let isSourceFunctionAlreadyCreated = false;
  if (sourceNode && isFunctionData(sourceNode)) {
    if (createdNodes[amendedSourceKey]) {
      isSourceFunctionAlreadyCreated = true;
      sourceKey = createdNodes[amendedSourceKey];
    } else {
      sourceKey = createReactFlowFunctionKey(sourceNode);
    }
  } else {
    sourceKey = `${sourcePrefix}${amendedSourceKey}`;
  }
  createdNodes[amendedSourceKey] = sourceKey;

  const destinationNode = getDestinationNode(targetKey, functions, targetSchema.schemaTreeRoot);

  let destinationKey: string;
  if (destinationNode && isFunctionData(destinationNode)) {
    if (createdNodes[targetKey]) {
      destinationKey = createdNodes[targetKey];
    } else if (isAGuid(targetKey.substring(targetKey.length - 36))) {
      destinationKey = targetKey;
    } else {
      destinationKey = createReactFlowFunctionKey(destinationNode);
      createdNodes[targetKey] = destinationKey;
    }
  } else {
    destinationKey = `${targetPrefix}${destinationNode?.key}`;
  }

  if (isLoop && sourceNode && destinationNode) {
    let indexFnRfKey: string | undefined = undefined;

    // TODO: Ensure support for nested loops w/ index variables

    // Loop index variable handling (create index() node, match up variables to respective nodes, etc)
    const idxOfIdxVariable = targetKey.replaceAll('$for', '').lastIndexOf('$');
    if (idxOfIdxVariable > -1) {
      const [forPathFirstPart, forPathSecondPart] = targetKey.split(')/');
      const forTgtBasePath = forPathFirstPart + ')/' + forPathSecondPart.substring(0, forPathSecondPart.indexOf('/') ?? undefined);

      // Check if an index() node/id has already been created for this $for()'s index variable
      if (createdNodes[forTgtBasePath]) {
        indexFnRfKey = createdNodes[forTgtBasePath];
      } else {
        indexFnRfKey = createReactFlowFunctionKey(indexPseudoFunction);
        createdNodes[forTgtBasePath] = indexFnRfKey;
      }

      const idxVariable = targetKey.replaceAll('$for', '').substring(idxOfIdxVariable, idxOfIdxVariable + 2);
      amendedSourceKey = amendedSourceKey.replaceAll(idxVariable, indexFnRfKey);
      mockDirectAccessFnKey = mockDirectAccessFnKey?.replaceAll(idxVariable, indexFnRfKey);
    }

    const srcLoopNodeKey = amendedSourceKey.includes('[')
      ? `${amendedSourceKey.substring(0, amendedSourceKey.indexOf('['))}${amendedSourceKey.substring(amendedSourceKey.indexOf(']') + 1)}`
      : amendedSourceKey;
    const srcLoopNode = findNodeForKey(srcLoopNodeKey, sourceSchema.schemaTreeRoot);
    if (srcLoopNode) {
      addParentConnectionForRepeatingElements(
        destinationNode,
        srcLoopNode,
        sourceSchemaFlattened,
        targetSchemaFlattened,
        connections,
        indexFnRfKey
      );
    }
  }

  if (destinationNode) {
    if (isConditional) {
      // Create connections for conditional's contents as well
      const trimmedTargetKey = targetKey.substring(mapNodeParams.if.length + 1, targetKey.length - 1);

      createConnections(
        trimmedTargetKey,
        destinationKey,
        connections,
        createdNodes,
        sourceSchema,
        sourceSchemaFlattened,
        targetSchema,
        targetSchemaFlattened,
        functions
      );
    }

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

  // Extract and create connections for function inputs
  if ((sourceEndOfFunction > -1 && !isSourceFunctionAlreadyCreated) || mockDirectAccessFnKey) {
    const fnInputKeys = splitKeyIntoChildren(mockDirectAccessFnKey ?? amendedSourceKey);

    fnInputKeys.forEach((fnInputKey) => {
      parseDefinitionToConnection(
        fnInputKey,
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
