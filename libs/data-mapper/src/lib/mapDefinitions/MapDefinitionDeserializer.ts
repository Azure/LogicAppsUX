import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import { addParentConnectionForRepeatingElements, deleteConnectionFromConnections } from '../core/state/DataMapSlice';
import type { FunctionData, MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { SchemaType, ifPseudoFunction, ifPseudoFunctionKey, indexPseudoFunction, indexPseudoFunctionKey } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { applyConnectionValue, isConnectionUnit } from '../utils/Connection.Utils';
import {
  amendSourceKeyForDirectAccessIfNeeded,
  flattenMapDefinitionValues,
  getDestinationNode,
  getSourceKeyOfLastLoop,
  getSourceNode,
  getSourceValueFromLoop,
  getTargetValueWithoutLoops,
  getTargetValueWithoutLoopsSchemaSpecific,
  qualifyLoopRelativeSourceKeys,
  splitKeyIntoChildren,
} from '../utils/DataMap.Utils';
import { isFunctionData, isKeyAnIndexValue } from '../utils/Function.Utils';
import { LogCategory, LogService } from '../utils/Logging.Utils';
import { createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary } from '../utils/Schema.Utils';
import { isAGuid } from '@microsoft/utils-logic-apps';

export class MapDefinitionDeserializer {
  private readonly _mapDefinition: MapDefinitionEntry;
  private readonly _sourceSchema: SchemaExtended;
  private readonly _targetSchema: SchemaExtended;
  private readonly _functions: FunctionData[];

  private readonly _sourceSchemaFlattened: SchemaNodeDictionary;
  private readonly _targetSchemaFlattened: SchemaNodeDictionary;

  private readonly _createdNodes: { [completeFunction: string]: string };

  public constructor(
    mapDefinition: MapDefinitionEntry,
    sourceSchema: SchemaExtended,
    targetSchema: SchemaExtended,
    functions: FunctionData[]
  ) {
    this._mapDefinition = mapDefinition;
    this._sourceSchema = sourceSchema;
    this._targetSchema = targetSchema;
    this._functions = functions;

    this._sourceSchemaFlattened = flattenSchemaIntoDictionary(this._sourceSchema, SchemaType.Source);
    this._targetSchemaFlattened = flattenSchemaIntoDictionary(this._targetSchema, SchemaType.Target);

    this._createdNodes = {};
  }

  public convertFromMapDefinition = (): ConnectionDictionary => {
    const connections: ConnectionDictionary = {};
    const parsedYamlKeys: string[] = Object.keys(this._mapDefinition);

    const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

    if (rootNodeKey) {
      this._parseDefinitionToConnection(this._mapDefinition[rootNodeKey], `/${rootNodeKey}`, 0, connections);
    }

    this._cleanupExtraneousConnections(connections);

    return connections;
  };

  private _cleanupExtraneousConnections = (connections: ConnectionDictionary) => {
    const connectionEntries = Object.entries(connections);

    connectionEntries.forEach(([_connectionKey, connectionValue]) => {
      // This cleans up situations where the parent connection is auto created, but we are manually making one as well
      // Such as when we use an object level conditional
      if (connectionValue.self.node.key === ifPseudoFunctionKey) {
        const valueInput = connectionValue.inputs[1][0];
        if (isConnectionUnit(valueInput)) {
          connectionValue.outputs.forEach((output) => {
            deleteConnectionFromConnections(connections, valueInput.reactFlowKey, output.reactFlowKey, undefined);
          });
        }
      }
    });
  };

  private _parseDefinitionToConnection = (
    sourceNodeObject: string | object | any,
    targetKey: string,
    targetArrayDepth: number,
    connections: ConnectionDictionary
  ) => {
    if (Array.isArray(sourceNodeObject)) {
      // TODO Support for multiple array entries
      for (let index = 0; index < sourceNodeObject.length; index++) {
        const element = sourceNodeObject[index];
        this._parseDefinitionToConnection(element, targetKey, targetArrayDepth + 1, connections);
      }

      return;
    } else if (typeof sourceNodeObject === 'string') {
      this._createConnections(sourceNodeObject, targetKey, targetArrayDepth, connections);

      return;
    }

    this._callChildObjects(sourceNodeObject, targetKey, targetArrayDepth, connections);
  };

  private _parseDefinitionToConditionalConnection = (
    sourceNodeObject: any,
    sourceNodeObjectAsString: string,
    targetKey: string,
    targetArrayDepth: number,
    connections: ConnectionDictionary
  ) => {
    // Hooks $if up to target
    this._createConnections(sourceNodeObjectAsString, targetKey, targetArrayDepth, connections);

    this._callChildObjects(sourceNodeObject, targetKey, targetArrayDepth, connections);
  };

  private _callChildObjects = (
    sourceNodeObject: string | object | any,
    targetKey: string,
    targetArrayDepth: number,
    connections: ConnectionDictionary
  ) => {
    const isInLoop = targetKey.includes(mapNodeParams.for);

    const childEntries = Object.entries<MapDefinitionEntry | string>(sourceNodeObject);
    childEntries.forEach(([childKey, childValue]) => {
      const ifRfKey = createReactFlowFunctionKey(ifPseudoFunction);

      if (childKey.startsWith(mapNodeParams.if)) {
        const ifContents = childKey.substring(mapNodeParams.if.length + 1, childKey.length - 1);

        // Create connections for $if's contents (condition)
        const isChildValueArray = Array.isArray(childValue);
        this._createConnections(
          isInLoop ? getSourceValueFromLoop(ifContents, targetKey, this._sourceSchemaFlattened) : ifContents,
          ifRfKey,
          isChildValueArray ? targetArrayDepth + 1 : targetArrayDepth,
          connections,
          isInLoop ? `${targetKey}/${isChildValueArray ? '*' : Object.keys(childValue)[0]}` : undefined
        );

        // Handle $if's values
        Object.entries(childValue).forEach(([childValueKey, childValueValue]) => {
          if (typeof childValueValue === 'string') {
            const srcValueKey = `${getSourceKeyOfLastLoop(qualifyLoopRelativeSourceKeys(targetKey))}/${childValueValue}`;
            this._createConnections(
              isInLoop && !(childValueValue.includes('[') && childValueValue.includes(']')) ? srcValueKey : childValueValue,
              ifRfKey,
              targetArrayDepth,
              connections
            );
          } else {
            Object.entries(childValueValue).forEach(([newDestinationKey, newSourceKey]) => {
              const finalNewDestinationKey = `${targetKey}${Array.isArray(childValue) ? '' : `/${childValueKey}`}/${newDestinationKey}`;

              this._parseDefinitionToConnection(newSourceKey, finalNewDestinationKey, targetArrayDepth, connections);
            });
          }
        });

        const nextChildObject = sourceNodeObject[childKey];
        if (Array.isArray(nextChildObject)) {
          Object.entries(nextChildObject).forEach(([_nextKey, nextValue]) => {
            this._parseDefinitionToConditionalConnection(nextValue, ifRfKey, targetKey, targetArrayDepth + 1, connections);
          });
        } else {
          this._parseDefinitionToConditionalConnection(
            nextChildObject,
            ifRfKey,
            `${targetKey}/${Object.keys(childValue)[0]}`,
            targetArrayDepth,
            connections
          );
        }
      } else {
        let childTargetKey = targetKey;
        if (childKey !== mapNodeParams.value && !(childTargetKey.indexOf(mapNodeParams.if) > -1 && childTargetKey.endsWith(')'))) {
          const trimmedChildKey = childKey.startsWith('$@') ? childKey.substring(1) : childKey;
          if (!targetKey.endsWith(trimmedChildKey) || this._targetSchemaFlattened[`${targetPrefix}${targetKey}/${trimmedChildKey}`]) {
            childTargetKey = `${targetKey}/${trimmedChildKey}`;
            this._parseDefinitionToConnection(childValue, childTargetKey, targetArrayDepth, connections);
          } else {
            // Object level conditional handling (flattenedChildValues will be [] if property conditional)
            const childTargetKeyWithoutLoop = getTargetValueWithoutLoops(childTargetKey, targetArrayDepth);
            const flattenedChildValues = typeof childValue === 'string' ? [] : flattenMapDefinitionValues(childValue);
            const flattenedChildValueParents = flattenedChildValues
              .map((flattenedValue) => {
                const fqChild = getSourceValueFromLoop(flattenedValue, childTargetKey, this._sourceSchemaFlattened);
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
              this._parseDefinitionToConnection(lowestCommonParent, ifConnectionEntry[0], targetArrayDepth, connections);
            } else {
              LogService.error(LogCategory.MapDefinitionDeserializer, 'callChildObjects', {
                message: 'Failed to find conditional connection key',
              });
            }
          }
        } else {
          this._parseDefinitionToConnection(childValue, childTargetKey, targetArrayDepth, connections);
        }
      }

      if (isInLoop && Array.isArray(childValue) && childKey.startsWith(ifPseudoFunction.functionName)) {
        // dot accessor will get the parent source node
        this._createConnections(
          getSourceValueFromLoop('.', targetKey, this._sourceSchemaFlattened),
          ifRfKey,
          targetArrayDepth + 1,
          connections,
          `${targetKey}/*`
        );
      }
    });
  };

  private _createConnections = (
    sourceNodeString: string,
    targetKey: string,
    targetArrayDepth: number,
    connections: ConnectionDictionary,
    conditionalLoopKey?: string
  ) => {
    const isLoop: boolean = targetKey.includes(mapNodeParams.for);
    const isConditional: boolean = targetKey.startsWith(mapNodeParams.if);
    const sourceEndOfFunctionName = sourceNodeString.indexOf('(');
    const amendedTargetKey = isLoop ? qualifyLoopRelativeSourceKeys(targetKey) : targetKey;
    let amendedSourceKey = isLoop
      ? getSourceValueFromLoop(sourceNodeString, amendedTargetKey, this._sourceSchemaFlattened)
      : sourceNodeString;

    let mockDirectAccessFnKey = '';
    [amendedSourceKey, mockDirectAccessFnKey] = amendSourceKeyForDirectAccessIfNeeded(amendedSourceKey);

    if (isKeyAnIndexValue(amendedSourceKey)) {
      const directAccessScopeNodeEntry = Object.entries(this._createdNodes).find(([_nodeKey, nodeValue]) => nodeValue === amendedTargetKey);

      if (directAccessScopeNodeEntry) {
        const directAccessScopeNodeKey = directAccessScopeNodeEntry[0];
        const sourceLoopKey = directAccessScopeNodeKey.split(',')[1].trim();
        const trimmedIndexVariable = amendedSourceKey.substring(1);
        const combinedKey = `${trimmedIndexVariable}-${sourceLoopKey}`;
        const indexKey = this._createdNodes[combinedKey];
        amendedSourceKey = indexKey;
      }
    }

    const sourceNode = getSourceNode(amendedSourceKey, this._sourceSchema, sourceEndOfFunctionName, this._functions, this._createdNodes);

    let sourceKey: string;
    let isSourceFunctionAlreadyCreated = false;
    if (sourceNode && isFunctionData(sourceNode)) {
      if (this._createdNodes[amendedSourceKey]) {
        isSourceFunctionAlreadyCreated = true;
        sourceKey = this._createdNodes[amendedSourceKey];
      } else {
        sourceKey = createReactFlowFunctionKey(sourceNode);
      }
    } else {
      sourceKey = `${sourcePrefix}${amendedSourceKey}`;
    }
    this._createdNodes[amendedSourceKey] = sourceKey;

    const destinationNode = getDestinationNode(amendedTargetKey, this._functions, this._targetSchema.schemaTreeRoot);

    let destinationKey: string;
    if (destinationNode && isFunctionData(destinationNode)) {
      if (this._createdNodes[amendedTargetKey]) {
        destinationKey = this._createdNodes[amendedTargetKey];
      } else if (isAGuid(amendedTargetKey.substring(amendedTargetKey.length - 36))) {
        destinationKey = amendedTargetKey;
      } else {
        destinationKey = createReactFlowFunctionKey(destinationNode);
        this._createdNodes[amendedTargetKey] = destinationKey;
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
        const srcLoopNode = findNodeForKey(srcLoopNodeKey, this._sourceSchema.schemaTreeRoot, false);

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
          tgtLoopNodeKey = getTargetValueWithoutLoopsSchemaSpecific(
            startIdxOfNextPathChunk > -1 ? loopKey.substring(0, startIdxOfNextPathChunk) : loopKey,
            loopKey.indexOf('*') > -1
          );
          tgtLoopNode = findNodeForKey(tgtLoopNodeKey, this._targetSchema.schemaTreeRoot, true);
        }

        // Handle index variables
        if (idxOfIndexVariable > -1 && tgtLoopNodeKey) {
          const idxVariable = loopKey[idxOfIndexVariable + 1];
          const idxTargetVariableKey = `${idxVariable}-${tgtLoopNodeKey}`;
          const idxSourceVariableKey = `${idxVariable}-${srcLoopNodeKey}`;

          // Check if an index() node/id has already been created for this loop's index variable
          if (this._createdNodes[idxTargetVariableKey]) {
            indexFnRfKey = this._createdNodes[idxTargetVariableKey];
          } else {
            indexFnRfKey = createReactFlowFunctionKey(indexPseudoFunction);
            // We apply the index function to both inputs and outputs so that we can go either direction in finding the source index key
            this._createdNodes[idxTargetVariableKey] = indexFnRfKey;
            this._createdNodes[idxSourceVariableKey] = indexFnRfKey;
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
            this._sourceSchemaFlattened,
            this._targetSchemaFlattened,
            connections,
            indexFnRfKey
          );
        }

        // This should handle cases where the index is being directly applied to the target property
        if (indexFnRfKey && destinationNode && isKeyAnIndexValue(sourceNodeString)) {
          applyConnectionValue(connections, {
            targetNode: destinationNode,
            targetNodeReactFlowKey: destinationKey,
            findInputSlot: true,
            input: {
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
        applyConnectionValue(connections, {
          targetNode: destinationNode,
          targetNodeReactFlowKey: destinationKey,
          findInputSlot: true,
          input: {
            reactFlowKey: amendedSourceKey,
            node: indexPseudoFunction,
          },
        });
      } else {
        applyConnectionValue(connections, {
          targetNode: destinationNode,
          targetNodeReactFlowKey: destinationKey,
          findInputSlot: true,
          input: sourceNode
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
        this._parseDefinitionToConnection(fnInputKey, sourceKey, targetArrayDepth, connections);
      });
    }
  };
}
