/* eslint-disable no-param-reassign */
import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import {
  directAccessPseudoFunction,
  directAccessPseudoFunctionKey,
  ifPseudoFunctionKey,
  indexPseudoFunction,
  indexPseudoFunctionKey,
  SchemaType,
} from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { setConnectionInputValue } from '../utils/Connection.Utils';
import {
  flattenMapDefinitionValues,
  getDestinationNode,
  getSourceKeyOfLastLoop,
  getSourceValueFromLoop,
  getTargetValueWithoutLoop,
  qualifyLoopRelativeSourceKeys,
  splitKeyIntoChildren,
} from '../utils/DataMap.Utils';
import { findFunctionForFunctionName, isFunctionData } from '../utils/Function.Utils';
import { LogCategory, LogService } from '../utils/Logging.Utils';
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
  childEntries.forEach(([childKey, childValue]) => {
    if (childKey.startsWith(mapNodeParams.if)) {
      Object.entries(childValue).forEach(([childSubKey, childSubValue]) => {
        if (typeof childSubValue === 'string') {
          parseDefinitionToConnection(
            childSubValue,
            childKey,
            connections,
            createdNodes,
            sourceSchema,
            sourceSchemaFlattened,
            targetSchema,
            targetSchemaFlattened,
            functions
          );
        } else {
          Object.entries(childSubValue).forEach(([newDestinationKey, newSourceKey]) => {
            const finalNewDestinationKey = `${targetKey}/${childSubKey}/${newDestinationKey}`;

            parseDefinitionToConnection(
              newSourceKey,
              finalNewDestinationKey,
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
      });

      const childSubKey = Object.keys(childValue)[0];
      parseDefinitionToConditionalConnection(
        sourceNodeObject[childKey],
        childKey,
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
      let childTargetKey = targetKey;
      if (childKey !== mapNodeParams.value && !(childTargetKey.indexOf(mapNodeParams.if) > -1 && childTargetKey.endsWith(')'))) {
        const trimmedChildKey = childKey.startsWith('$@') ? childKey.substring(1) : childKey;
        if (!targetKey.endsWith(trimmedChildKey) || targetSchemaFlattened[`${targetPrefix}${targetKey}/${trimmedChildKey}`]) {
          childTargetKey = `${targetKey}/${trimmedChildKey}`;
          parseDefinitionToConnection(
            childValue,
            childTargetKey,
            connections,
            createdNodes,
            sourceSchema,
            sourceSchemaFlattened,
            targetSchema,
            targetSchemaFlattened,
            functions
          );
        } else {
          // The only time this case should be valid is when making a object level conditional
          const childTargetKeyWithoutLoop = getTargetValueWithoutLoop(childTargetKey);
          const flattenedChildValues = flattenMapDefinitionValues(childValue);
          const flattenedChildValueParents = flattenedChildValues
            .map((flattenedValue) => {
              const fqChild = getSourceValueFromLoop(flattenedValue, childTargetKey, sourceSchemaFlattened);
              return fqChild.substring(0, fqChild.lastIndexOf('/'));
            })
            .filter((parentVal) => parentVal !== ''); // Functions will map as ''
          const lowestCommonParent = flattenedChildValueParents.reduce((a, b) => (a.lastIndexOf('/') <= b.lastIndexOf('/') ? a : b));
          const ifConnectionEntry = Object.entries(connections).find(
            ([_connectionKey, connectionValue]) =>
              connectionValue.self.node.key === ifPseudoFunctionKey &&
              connectionValue.outputs.some((output) => output.reactFlowKey === `${targetPrefix}${childTargetKeyWithoutLoop}`)
          );

          if (ifConnectionEntry) {
            parseDefinitionToConnection(
              lowestCommonParent,
              ifConnectionEntry[0],
              connections,
              createdNodes,
              sourceSchema,
              sourceSchemaFlattened,
              targetSchema,
              targetSchemaFlattened,
              functions
            );
          } else {
            LogService.error(LogCategory.MapDefinitionDeserializer, 'callChildObjects', {
              message: 'Failed to find conditional connection key',
            });
          }
        }
      } else {
        parseDefinitionToConnection(
          childValue,
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
  const sourceEndOfFunctionName = sourceNodeString.indexOf('(');
  const amendedTargetKey = isLoop ? qualifyLoopRelativeSourceKeys(targetKey) : targetKey;
  let amendedSourceKey = isLoop ? getSourceValueFromLoop(sourceNodeString, amendedTargetKey, sourceSchemaFlattened) : sourceNodeString;
  let mockDirectAccessFnKey: string | undefined = undefined;
  const [daOpenBracketIdx, daClosedBracketIdx] = [amendedSourceKey.indexOf('['), amendedSourceKey.lastIndexOf(']')];

  console.log(amendedTargetKey, ': ', amendedSourceKey); // REMOVE

  // Parse the outermost Direct Access (if present) into the typical Function format
  if (daOpenBracketIdx > -1 && daClosedBracketIdx > -1) {
    // Need to isolate the singular key the DA is apart of as it could be wrapped in a function, etc.
    let keyWithDaStartIdx = 0;
    let keyWithDaEndIdx = amendedSourceKey.length;
    // For start, back track until idx-0, whitespace, or '('
    for (let i = daOpenBracketIdx; i >= 0; i--) {
      if (amendedSourceKey[i] === ' ' || amendedSourceKey[i] === '(') {
        keyWithDaStartIdx = i + 1; // +1 as substr includes start idx but excludes end idx
        break;
      }
    }
    // For end, idx-length-1, ',', or ')'
    for (let i = daClosedBracketIdx; i < amendedSourceKey.length; i++) {
      if (amendedSourceKey[i] === ',' || amendedSourceKey[i] === ')') {
        keyWithDaEndIdx = i;
        break;
      }
    }

    mockDirectAccessFnKey = `${directAccessPseudoFunctionKey}(`;
    mockDirectAccessFnKey += `${amendedSourceKey.substring(daOpenBracketIdx + 1, daClosedBracketIdx)}, `; // Index value
    mockDirectAccessFnKey += `${amendedSourceKey.substring(keyWithDaStartIdx, daOpenBracketIdx)}, `; // Scope (source loop element)
    mockDirectAccessFnKey += `${amendedSourceKey.substring(keyWithDaStartIdx, daOpenBracketIdx)}${amendedSourceKey.substring(
      daClosedBracketIdx + 1,
      keyWithDaEndIdx
    )}`; // Output value
    mockDirectAccessFnKey += ')';

    // Replace the previous DA format within amendedSourceKey with the new one
    amendedSourceKey =
      amendedSourceKey.substring(0, keyWithDaStartIdx) + mockDirectAccessFnKey + amendedSourceKey.substring(keyWithDaEndIdx);
  }

  // Identify source schema node, or Function(Data) from source key
  let sourceNode: SchemaNodeExtended | FunctionData | undefined = undefined;
  if (amendedSourceKey.startsWith(indexPseudoFunctionKey)) {
    // Handle index variable usage
    sourceNode = indexPseudoFunction;
    createdNodes[amendedSourceKey] = amendedSourceKey; // Bypass below block since we already have rfKey here
  } else if (amendedSourceKey.startsWith(directAccessPseudoFunctionKey)) {
    sourceNode = directAccessPseudoFunction;
  } else if (sourceEndOfFunctionName > -1) {
    // We found a Function in source key -> let's find its data
    sourceNode = findFunctionForFunctionName(amendedSourceKey.substring(0, sourceEndOfFunctionName), functions);
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

  const destinationNode = getDestinationNode(amendedTargetKey, functions, targetSchema.schemaTreeRoot);

  let destinationKey: string;
  if (destinationNode && isFunctionData(destinationNode)) {
    if (createdNodes[amendedTargetKey]) {
      destinationKey = createdNodes[amendedTargetKey];
    } else if (isAGuid(amendedTargetKey.substring(amendedTargetKey.length - 36))) {
      destinationKey = amendedTargetKey;
    } else {
      destinationKey = createReactFlowFunctionKey(destinationNode);
      createdNodes[amendedTargetKey] = destinationKey;
    }
  } else {
    destinationKey = `${targetPrefix}${destinationNode?.key}`;
  }

  if (isLoop && sourceNode && destinationNode) {
    let srcLoopNodeKey = amendedSourceKey;
    let indexFnRfKey: string | undefined = undefined;

    // Loop index variable handling (create index() node, match up variables to respective nodes, etc)
    let idxOfIdxVariable = amendedTargetKey.length;
    while (idxOfIdxVariable > -1) {
      // Back-track index variables in target key (if there's multiple)
      const placeholderFor = `&${mapNodeParams.for.substring(1)}`;
      idxOfIdxVariable = amendedTargetKey.replaceAll(mapNodeParams.for, placeholderFor).substring(0, idxOfIdxVariable).lastIndexOf('$');

      if (idxOfIdxVariable > -1) {
        const startIdxOfChildrenPath = amendedTargetKey.indexOf('/', idxOfIdxVariable + 4);
        const forTgtBasePath =
          startIdxOfChildrenPath > -1 ? amendedTargetKey.substring(0, startIdxOfChildrenPath) : amendedTargetKey.substring(0);
        const idxVariable = amendedTargetKey
          .replaceAll(mapNodeParams.for, placeholderFor)
          .substring(idxOfIdxVariable, idxOfIdxVariable + 2);

        // Check if an index() node/id has already been created for this $for()'s index variable
        if (createdNodes[forTgtBasePath]) {
          indexFnRfKey = createdNodes[forTgtBasePath];
        } else {
          indexFnRfKey = createReactFlowFunctionKey(indexPseudoFunction);
          createdNodes[forTgtBasePath] = indexFnRfKey;
        }

        amendedSourceKey = amendedSourceKey.replaceAll(idxVariable, indexFnRfKey);
        mockDirectAccessFnKey = mockDirectAccessFnKey?.replaceAll(idxVariable, indexFnRfKey);

        srcLoopNodeKey = getSourceKeyOfLastLoop(amendedTargetKey.substring(0, idxOfIdxVariable + 4));
      }

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
  }

  if (destinationNode) {
    if (isConditional) {
      // Create connections for conditional's contents as well
      const trimmedTargetKey = amendedTargetKey.substring(mapNodeParams.if.length + 1, amendedTargetKey.length - 1);

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
  if ((sourceEndOfFunctionName > -1 && !isSourceFunctionAlreadyCreated) || mockDirectAccessFnKey) {
    const fnInputKeys = splitKeyIntoChildren(amendedSourceKey);

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
