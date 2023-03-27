/* eslint-disable no-param-reassign */
import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements, deleteConnectionFromConnections } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import {
  directAccessPseudoFunction,
  directAccessPseudoFunctionKey,
  ifPseudoFunction,
  ifPseudoFunctionKey,
  indexPseudoFunction,
  indexPseudoFunctionKey,
  SchemaType,
} from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { isConnectionUnit, setConnectionInputValue } from '../utils/Connection.Utils';
import type { UnknownNode } from '../utils/DataMap.Utils';
import {
  flattenMapDefinitionValues,
  getDestinationNode,
  getSourceKeyOfLastLoop,
  getSourceValueFromLoop,
  getTargetValueWithoutLoops,
  qualifyLoopRelativeSourceKeys,
  splitKeyIntoChildren,
} from '../utils/DataMap.Utils';
import { findFunctionForFunctionName, isFunctionData, isKeyAnIndexValue } from '../utils/Function.Utils';
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

  cleanupExtraneousConnections(connections);

  return connections;
};

const cleanupExtraneousConnections = (connections: ConnectionDictionary) => {
  const connectionEntries = Object.entries(connections);

  connectionEntries.forEach(([_connectionKey, connectionValue]) => {
    // This cleans up situations where the parent connection is auto created, but we are manually making one as well
    // Such as when we use an object level conditional
    if (connectionValue.self.node.key === ifPseudoFunctionKey) {
      const valueInput = connectionValue.inputs[1][0];
      if (isConnectionUnit(valueInput)) {
        connectionValue.outputs.forEach((output) => {
          deleteConnectionFromConnections(connections, valueInput.reactFlowKey, output.reactFlowKey);
        });
      }
    }
  });
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
  if (Array.isArray(sourceNodeObject)) {
    // TODO Support for multiple array entries
    for (let index = 0; index < sourceNodeObject.length; index++) {
      const element = sourceNodeObject[index];
      parseDefinitionToConnection(
        element,
        targetKey,
        connections,
        createdNodes,
        sourceSchema,
        sourceSchemaFlattened,
        targetSchema,
        targetSchemaFlattened,
        functions
      );
    }

    return;
  } else if (typeof sourceNodeObject === 'string') {
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
  // Hooks $if up to target
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
  const isInLoop = targetKey.includes(mapNodeParams.for);

  const childEntries = Object.entries<MapDefinitionEntry | string>(sourceNodeObject);
  childEntries.forEach(([childKey, childValue]) => {
    const ifRfKey = createReactFlowFunctionKey(ifPseudoFunction);

    if (childKey.startsWith(mapNodeParams.if)) {
      const ifContents = childKey.substring(mapNodeParams.if.length + 1, childKey.length - 1);

      // Create connections for $if's contents (condition)
      createConnections(
        isInLoop ? getSourceValueFromLoop(ifContents, targetKey, sourceSchemaFlattened) : ifContents,
        ifRfKey,
        connections,
        createdNodes,
        sourceSchema,
        sourceSchemaFlattened,
        targetSchema,
        targetSchemaFlattened,
        functions,
        isInLoop ? `${targetKey}/${Array.isArray(childValue) ? '*' : Object.keys(childValue)[0]}` : undefined
      );

      // Handle $if's values
      Object.entries(childValue).forEach(([childValueKey, childValueValue]) => {
        if (typeof childValueValue === 'string') {
          const srcValueKey = `${getSourceKeyOfLastLoop(qualifyLoopRelativeSourceKeys(targetKey))}/${childValueValue}`;
          createConnections(
            isInLoop && !(childValueValue.includes('[') && childValueValue.includes(']')) ? srcValueKey : childValueValue,
            ifRfKey,
            connections,
            createdNodes,
            sourceSchema,
            sourceSchemaFlattened,
            targetSchema,
            targetSchemaFlattened,
            functions
          );
        } else {
          Object.entries(childValueValue).forEach(([newDestinationKey, newSourceKey]) => {
            const finalNewDestinationKey = `${targetKey}${Array.isArray(childValue) ? '' : `/${childValueKey}`}/${newDestinationKey}`;

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

      const nextChildObject = sourceNodeObject[childKey];
      if (Array.isArray(nextChildObject)) {
        Object.entries(nextChildObject).forEach(([_nextKey, nextValue]) => {
          parseDefinitionToConditionalConnection(
            nextValue,
            ifRfKey,
            targetKey,
            connections,
            createdNodes,
            sourceSchema,
            sourceSchemaFlattened,
            targetSchema,
            targetSchemaFlattened,
            functions
          );
        });
      } else {
        parseDefinitionToConditionalConnection(
          nextChildObject,
          ifRfKey,
          `${targetKey}/${Object.keys(childValue)[0]}`,
          connections,
          createdNodes,
          sourceSchema,
          sourceSchemaFlattened,
          targetSchema,
          targetSchemaFlattened,
          functions
        );
      }
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
          // Object level conditional handling (flattenedChildValues will be [] if property conditional)
          const childTargetKeyWithoutLoop = getTargetValueWithoutLoops(childTargetKey);
          const flattenedChildValues = typeof childValue === 'string' ? [] : flattenMapDefinitionValues(childValue);
          const flattenedChildValueParents = flattenedChildValues
            .map((flattenedValue) => {
              const fqChild = getSourceValueFromLoop(flattenedValue, childTargetKey, sourceSchemaFlattened);
              return fqChild.substring(0, fqChild.lastIndexOf('/'));
            })
            .filter((parentVal) => parentVal !== ''); // Functions will map as ''
          const lowestCommonParent =
            flattenedChildValueParents.length > 1
              ? flattenedChildValueParents.reduce((a, b) => (a.lastIndexOf('/') <= b.lastIndexOf('/') ? a : b))
              : flattenedChildValueParents.length === 1
              ? flattenedChildValueParents[0]
              : undefined;
          const ifConnectionEntry = Object.entries(connections).find(
            ([_connectionKey, connectionValue]) =>
              connectionValue.self.node.key === ifPseudoFunctionKey &&
              connectionValue.outputs.some((output) => output.reactFlowKey === `${targetPrefix}${childTargetKeyWithoutLoop}`)
          );

          if (ifConnectionEntry && lowestCommonParent) {
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

    if (isInLoop && Array.isArray(childValue)) {
      // dot accessor will get the parent source node
      createConnections(
        getSourceValueFromLoop('.', targetKey, sourceSchemaFlattened),
        ifRfKey,
        connections,
        createdNodes,
        sourceSchema,
        sourceSchemaFlattened,
        targetSchema,
        targetSchemaFlattened,
        functions,
        `${targetKey}/*`
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
  functions: FunctionData[],
  conditionalLoopKey?: string
) => {
  const isLoop: boolean = targetKey.includes(mapNodeParams.for);
  const isConditional: boolean = targetKey.startsWith(mapNodeParams.if);
  const sourceEndOfFunctionName = sourceNodeString.indexOf('(');
  const amendedTargetKey = isLoop ? qualifyLoopRelativeSourceKeys(targetKey) : targetKey;
  let amendedSourceKey = isLoop ? getSourceValueFromLoop(sourceNodeString, amendedTargetKey, sourceSchemaFlattened) : sourceNodeString;

  // Parse the outermost Direct Access (if present) into the typical Function format
  let mockDirectAccessFnKey: string | undefined = undefined;
  const [daOpenBracketIdx, daClosedBracketIdx] = [amendedSourceKey.indexOf('['), amendedSourceKey.lastIndexOf(']')];
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
  let sourceNode: UnknownNode = undefined;
  if (amendedSourceKey.startsWith(indexPseudoFunctionKey)) {
    // Handle index variable usage
    sourceNode = indexPseudoFunction;
    createdNodes[amendedSourceKey] = amendedSourceKey; // Bypass below block since we already have rfKey here
  } else if (amendedSourceKey.startsWith(directAccessPseudoFunctionKey)) {
    sourceNode = directAccessPseudoFunction;
  } else if (amendedSourceKey.startsWith(ifPseudoFunctionKey)) {
    sourceNode = ifPseudoFunction;
    createdNodes[amendedSourceKey] = amendedSourceKey;
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

  // Loop + index variable handling (create index() node, match up variables to respective nodes, etc)
  const isLoopCase = isLoop || !!conditionalLoopKey;
  if (isLoopCase) {
    const loopKey = conditionalLoopKey ? qualifyLoopRelativeSourceKeys(conditionalLoopKey) : amendedTargetKey;

    let startIdxOfPrevLoop = loopKey.length;
    let startIdxOfCurLoop = loopKey.substring(0, startIdxOfPrevLoop).lastIndexOf(mapNodeParams.for);

    let tgtLoopNodeKey: string | undefined = undefined;
    let tgtLoopNode: SchemaNodeExtended | undefined = undefined;

    // Handle loops in targetKey by back-tracking
    while (startIdxOfCurLoop > -1) {
      const srcLoopNodeKey = getSourceKeyOfLastLoop(loopKey.substring(0, startIdxOfPrevLoop));
      const srcLoopNode = findNodeForKey(srcLoopNodeKey, sourceSchema.schemaTreeRoot);

      const idxOfIndexVariable = loopKey.substring(0, startIdxOfPrevLoop).indexOf('$', startIdxOfCurLoop + 1);
      let indexFnRfKey: string | undefined = undefined;

      const endOfFor = ')/';
      const endOfForIdx = loopKey.substring(0, startIdxOfPrevLoop).lastIndexOf(endOfFor);
      const tgtLoopNodeKeyChunk = loopKey.substring(endOfForIdx + 2);

      // If there's no target loop node for this source loop node,
      // it must go to the lower-level/previous target node
      if (!tgtLoopNodeKeyChunk.startsWith(mapNodeParams.for)) {
        // Gets tgtKey for current loop (which will be the single key chunk immediately following the loop path chunk)
        const startIdxOfNextPathChunk = loopKey.indexOf('/', endOfForIdx + 2);
        tgtLoopNodeKey = getTargetValueWithoutLoops(startIdxOfNextPathChunk > -1 ? loopKey.substring(0, startIdxOfNextPathChunk) : loopKey);
        tgtLoopNode = findNodeForKey(tgtLoopNodeKey, targetSchema.schemaTreeRoot);
      }

      // Handle index variables
      if (idxOfIndexVariable > -1 && tgtLoopNodeKey) {
        const idxVariable = loopKey[idxOfIndexVariable + 1];
        const idxVariableKey = `${idxVariable}-${tgtLoopNodeKey}`;

        // Check if an index() node/id has already been created for this loop's index variable
        if (createdNodes[idxVariableKey]) {
          indexFnRfKey = createdNodes[idxVariableKey];
        } else {
          indexFnRfKey = createReactFlowFunctionKey(indexPseudoFunction);
          createdNodes[idxVariableKey] = indexFnRfKey;
        }

        // Replace all instances of index variable w/ its key,
        // accounting for `$i` matching in `$if`s
        const placeholderIf = mapNodeParams.if.replace('$', '&');
        amendedSourceKey = amendedSourceKey
          .replaceAll(mapNodeParams.if, placeholderIf)
          .replaceAll(`$${idxVariable}`, indexFnRfKey)
          .replaceAll(placeholderIf, mapNodeParams.if);

        if (mockDirectAccessFnKey) {
          mockDirectAccessFnKey = mockDirectAccessFnKey.replaceAll(`$${idxVariable}`, indexFnRfKey);
        }
      }

      // Make the connection between loop nodes
      if (srcLoopNode && tgtLoopNode && !conditionalLoopKey) {
        addParentConnectionForRepeatingElements(
          tgtLoopNode,
          srcLoopNode,
          sourceSchemaFlattened,
          targetSchemaFlattened,
          connections,
          indexFnRfKey
        );
      }

      // This should handle cases where the index is being directly applied to the target property
      if (indexFnRfKey && destinationNode && isKeyAnIndexValue(sourceNodeString)) {
        setConnectionInputValue(connections, {
          targetNode: destinationNode,
          targetNodeReactFlowKey: destinationKey,
          findInputSlot: true,
          value: {
            reactFlowKey: indexFnRfKey,
            node: indexPseudoFunction,
          },
        });
      }

      startIdxOfPrevLoop = startIdxOfCurLoop;
      startIdxOfCurLoop = loopKey.substring(0, startIdxOfPrevLoop).lastIndexOf(mapNodeParams.for);
    }
  }

  if (
    destinationNode &&
    !isConditional &&
    (isLoopCase || !isKeyAnIndexValue(sourceNodeString) || (!isLoopCase && isKeyAnIndexValue(sourceNodeString)))
  ) {
    if (!sourceNode && amendedSourceKey.startsWith(indexPseudoFunctionKey)) {
      setConnectionInputValue(connections, {
        targetNode: destinationNode,
        targetNodeReactFlowKey: destinationKey,
        findInputSlot: true,
        value: {
          reactFlowKey: amendedSourceKey,
          node: indexPseudoFunction,
        },
      });
    } else {
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
