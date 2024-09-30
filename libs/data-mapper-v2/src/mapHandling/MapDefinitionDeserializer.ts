import { mapNodeParams, reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData } from '../models';
import { indexPseudoFunction } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { applyConnectionValue } from '../utils/Connection.Utils';
import type { FunctionCreationMetadata, ParseFunc, SingleValueMetadata } from '../utils/DataMap.Utils';
import {
  getSourceNode,
  separateFunctions,
  DReservedToken,
  createSchemaNodeOrFunction,
  addParentConnectionForRepeatingElementsNested,
  amendSourceKeyForDirectAccessIfNeeded,
} from '../utils/DataMap.Utils';
import { isFunctionData } from '../utils/Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary, isSchemaNodeExtended } from '../utils/Schema.Utils';
import type { MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';

interface LoopMetadata {
  needsConnection: boolean;
  key: string;
  sequence?: ParseFunc;
  indexFn?: string;
}

interface ConditionalMetadata {
  needsConnection: boolean;
  key: string;
  children: string[];
  needsObjectConnection: boolean;
}
export class MapDefinitionDeserializer {
  private readonly _mapDefinition: MapDefinitionEntry;
  private readonly _sourceSchema: SchemaExtended;
  private readonly _targetSchema: SchemaExtended;
  private readonly _functions: FunctionData[];
  private _loop: LoopMetadata[];
  private _conditional: ConditionalMetadata;

  private readonly _sourceSchemaFlattened: SchemaNodeDictionary;
  private readonly _targetSchemaFlattened: SchemaNodeDictionary;

  private readonly _createdFunctions: { [completeFunction: string]: string };

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
    this._conditional = {
      key: '',
      needsConnection: false,
      children: [],
      needsObjectConnection: false,
    };
    this._loop = [];

    this._sourceSchemaFlattened = flattenSchemaIntoDictionary(this._sourceSchema, SchemaType.Source);
    this._targetSchemaFlattened = flattenSchemaIntoDictionary(this._targetSchema, SchemaType.Target);

    this._createdFunctions = {};
  }

  public convertFromMapDefinition = (): ConnectionDictionary => {
    const connections: ConnectionDictionary = {};
    const parsedYamlKeys: string[] = Object.keys(this._mapDefinition);

    const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

    if (rootNodeKey) {
      const rootNodeFormatted = rootNodeKey.startsWith('/') ? rootNodeKey : `/${rootNodeKey}`;
      this.createConnectionsForLMLObject(this._mapDefinition[rootNodeKey], `${rootNodeFormatted}`, undefined, connections);
    }

    //this._cleanupExtraneousConnections(connections);

    return connections;
  };

  private removePropertySymbolFromKey = (key: string) => {
    let formattedTargetKey = key;
    if (key.startsWith('$')) {
      formattedTargetKey = key.substring(1);
    }
    return formattedTargetKey;
  };

  private getTargetNodeInContextOfParent = (
    currentTargetKey: string,
    parentTargetNode: SchemaNodeExtended | undefined
  ): SchemaNodeExtended => {
    let targetNode: SchemaNodeExtended | undefined = undefined;
    const formattedTargetKey = this.removePropertySymbolFromKey(currentTargetKey);

    if (currentTargetKey.endsWith(mapNodeParams.value) && parentTargetNode !== undefined) {
      return parentTargetNode;
    }

    // root node
    if (parentTargetNode === undefined) {
      targetNode = this._targetSchemaFlattened[`${targetPrefix}${formattedTargetKey}`];
    } else {
      targetNode = parentTargetNode.children.find((child) => child.qName === formattedTargetKey);
      if (targetNode === undefined) {
        targetNode = getLoopTargetNodeWithJson(
          // eventually this can be simplified because we have the parent
          `${parentTargetNode.key}/${currentTargetKey}`,
          this._targetSchema.schemaTreeRoot
        ) as SchemaNodeExtended;
      }
    }
    if (targetNode === undefined) {
      throw new Error(`Target node not found for key ${currentTargetKey}`);
    }
    return targetNode;
  };

  private getLowestLoop = () => {
    return this._loop[this._loop.length - 1];
  };

  private getSourceNodeForRelativeKeyInLoop = (
    key: string,
    _connections: ConnectionDictionary,
    _targetNode: SchemaNodeExtended | FunctionData
  ) => {
    let srcNode: SchemaNodeExtended | undefined;
    if (key === '.') {
      // current loop
      const lowestLoopNodeKey = this.getLowestLoop().key;
      srcNode = findNodeForKey(lowestLoopNodeKey, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
    } else if (key.startsWith(mapNodeParams.backout)) {
      srcNode = this.getSourceNodeWithBackout(key);
    } else {
      const lastLoop = this.getLowestLoop().key;
      srcNode = findNodeForKey(`${lastLoop}/${key}`, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
    }
    return srcNode;
  };

  private handleSingleValueOrFunction = (
    key: string,
    funcMetadata: FunctionCreationMetadata | undefined,
    targetNode: SchemaNodeExtended | FunctionData,
    connections: ConnectionDictionary
  ) => {
    const tokens = separateFunctions(key);
    const functionMetadata = funcMetadata || createSchemaNodeOrFunction(tokens).term;

    let sourceSchemaNode = findNodeForKey(key, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended | undefined;

    if (!sourceSchemaNode && funcMetadata?.type === 'SingleValueMetadata') {
      sourceSchemaNode = findNodeForKey(funcMetadata.value, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended | undefined;
    }

    if (this._loop.length > 0 && !sourceSchemaNode) {
      sourceSchemaNode = this.getSourceNodeForRelativeKeyInLoop(key, connections, targetNode);
    }
    if (sourceSchemaNode && this._loop.length > 0) {
      addParentConnectionForRepeatingElementsNested(
        sourceSchemaNode,
        targetNode as SchemaNodeExtended,
        this._sourceSchemaFlattened,
        this._targetSchemaFlattened,
        connections
      );
    }

    if (sourceSchemaNode && this._conditional) {
      this._conditional.children.push(sourceSchemaNode.key);
    }

    if (!sourceSchemaNode && functionMetadata.type === 'Function') {
      let funcKey = '';
      let func: FunctionData;
      const metadataString = JSON.stringify(functionMetadata);
      if (this._createdFunctions[metadataString]) {
        funcKey = this._createdFunctions[metadataString];
        func = this.getFunctionForKey(funcKey) as FunctionData;
      }
      // get function node
      else {
        func = {
          ...getSourceNode(
            functionMetadata.name,
            this._sourceSchema,
            functionMetadata.name.length + 1,
            this._functions,
            this._createdFunctions
          ),
        } as FunctionData;
        funcKey = createReactFlowFunctionKey(func);
        func.key = funcKey;
        this._createdFunctions[metadataString] = funcKey;
      }

      // function to target
      if (targetNode !== undefined) {
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: this.getTargetKey(targetNode),
          findInputSlot: true,
          input: {
            reactFlowKey: funcKey,
            node: func,
          },
        });

        // connect inputs
        functionMetadata.inputs.forEach((input) => {
          const srcStr = input.type !== 'Function' ? input.value : input.name;
          this.handleSingleValueOrFunction(srcStr, input, func, connections);
        });
      }
    } else if (!sourceSchemaNode && functionMetadata.type !== 'Function') {
      // custom value or index
      this.handleSingleValue(key, targetNode, connections);
    } else if (targetNode) {
      //danielle temporary to unblock
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix((sourceSchemaNode as SchemaNodeExtended).key),
          node: sourceSchemaNode as SchemaNodeExtended,
        },
      });
    }
  };

  private getTargetKey = (targetNode?: SchemaNodeExtended | FunctionData) =>
    targetNode ? (isFunctionData(targetNode) ? targetNode.key : addTargetReactFlowPrefix(targetNode.key)) : '';

  private addLoopConnectionIfNeeded = (connections: ConnectionDictionary, targetNode: SchemaNodeExtended) => {
    if (this._loop.length > 0) {
      this._loop.forEach((loop) => {
        if (loop.needsConnection) {
          if (loop.sequence) {
            loop.needsConnection = false;
            this.handleSingleValueOrFunction('', loop.sequence, targetNode, connections);
          }
          let loopSrc: SchemaNodeExtended | FunctionData = findNodeForKey(
            loop.key,
            this._sourceSchema.schemaTreeRoot,
            false
          ) as SchemaNodeExtended;
          let key = addSourceReactFlowPrefix(loopSrc.key);
          if (loop.indexFn) {
            loopSrc = this.getFunctionForKey(loop.indexFn) as FunctionData;
            key = loop.indexFn;
          }

          if (targetNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
            applyConnectionValue(connections, {
              targetNode: targetNode,
              targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
              findInputSlot: true,
              input: {
                reactFlowKey: key,
                node: loopSrc,
              },
            });
            loop.needsConnection = false;
          }
        }
      });
    }
  };

  private getFunctionForKey = (key: string) => {
    return this._functions.find((func) => func.key === key);
  };

  // connection from the conditional function to the target node
  private addConnectionFromConditionalToTargetIfNeeded = (
    connections: ConnectionDictionary,
    targetNode: SchemaNodeExtended | FunctionData
  ) => {
    if (this._conditional.needsConnection) {
      const ifFunction = connections[this._conditional.key].self.node as FunctionData;
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: {
          reactFlowKey: this._conditional.key,
          node: ifFunction,
        },
      });
      if (isSchemaNodeExtended(targetNode) && targetNode.children.length !== 0) {
        this._conditional.needsObjectConnection = true;
        this._conditional.needsConnection = false;
      }
    }
  };

  private createConnectionsForLMLObject = (
    rightSideStringOrObject: string | object,
    leftSideKey: string,
    parentTargetNode: SchemaNodeExtended | undefined,
    connections: ConnectionDictionary
  ) => {
    if (this.isSchemaNodeTargetKey(leftSideKey)) {
      const currentTarget = leftSideKey;
      let targetNode = this.getTargetNodeInContextOfParent(currentTarget, parentTargetNode);

      // skip <ArrayItem>
      if (parentTargetNode?.children[0].name === '<ArrayItem>') {
        parentTargetNode = parentTargetNode.children[0] as SchemaNodeExtended;
      }

      this.addLoopConnectionIfNeeded(connections, targetNode as SchemaNodeExtended);
      this.addConnectionFromConditionalToTargetIfNeeded(connections, targetNode);

      if (parentTargetNode?.name === '<ArrayItem>') {
        targetNode = parentTargetNode.children.find((child) => child.qName === leftSideKey) as SchemaNodeExtended;
      }

      // if right side is string- process it, if object, process all children
      if (typeof rightSideStringOrObject === 'string') {
        // must connect conditional

        // danielle this is messsyyyyyy- basically connects the right side (source) to the if function instead of the node directly
        if (this._conditional.needsConnection) {
          const ifFunction = connections[this._conditional.key].self.node as FunctionData;
          this.handleSingleValueOrFunction(rightSideStringOrObject, undefined, ifFunction, connections);
          this._conditional.needsConnection = false;
        } else {
          this.handleSingleValueOrFunction(rightSideStringOrObject, undefined, targetNode, connections);
        }
      } else {
        Object.entries(rightSideStringOrObject).forEach((child) => {
          this.createConnectionsForLMLObject(child[1], child[0], targetNode, connections);
        });
      }
    } else {
      this.processLeftSideForOrIf(leftSideKey, parentTargetNode, rightSideStringOrObject, connections);
    }
  };

  public getLowestCommonParentForConditional = (conditionalChildren: string[]): string => {
    if (conditionalChildren.length === 1) {
      return conditionalChildren[0].slice(0, conditionalChildren[0].lastIndexOf('/'));
    }

    let lowestCommonParent = '';
    const parents = conditionalChildren;
    [...parents[0]].forEach((char, index) => {
      const currentChar = char;
      parents.forEach((parent) => {
        if (index >= parent.length && lowestCommonParent === '') {
          lowestCommonParent = parent;
        }
        if (parent[index] !== currentChar && lowestCommonParent === '') {
          const stripped = parent.substring(0, index);
          lowestCommonParent = stripped.substring(0, stripped.lastIndexOf('/'));
        }
      });
    });

    return lowestCommonParent;
  };

  private processLeftSideForOrIf = (
    leftSideKey: string,
    parentTargetNode: SchemaNodeExtended | undefined,
    rightSideStringOrObject: string | object,
    connections: ConnectionDictionary
  ) => {
    const tokens = separateFunctions(leftSideKey);
    const forOrIfObj = createSchemaNodeOrFunction(tokens);
    if ((forOrIfObj.term as ParseFunc).name === DReservedToken.if) {
      if (parentTargetNode) {
        this.handleIfFunction(forOrIfObj.term as ParseFunc, connections);
      }
    } else {
      this.processForStatement(forOrIfObj.term, connections);
    }
    Object.entries(rightSideStringOrObject).forEach((child) => {
      this.createConnectionsForLMLObject(child[1], child[0], parentTargetNode, connections);
    });
    if (this._conditional.needsObjectConnection) {
      const lowestCommonParent = this.getLowestCommonParentForConditional(this._conditional.children);
      if (lowestCommonParent) {
        applyConnectionValue(connections, {
          targetNode: this.getFunctionForKey(this._conditional.key) as FunctionData,
          targetNodeReactFlowKey: this._conditional.key,
          inputIndex: 1,
          input: {
            reactFlowKey: addSourceReactFlowPrefix(lowestCommonParent),
            node: findNodeForKey(lowestCommonParent, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended,
          },
        });
      }
    }
    this._conditional = {
      key: '',
      needsConnection: false,
      children: [],
      needsObjectConnection: false,
    };
  };

  private handleIfFunction = (functionMetadata: ParseFunc, connections: ConnectionDictionary) => {
    const func = getSourceNode(
      functionMetadata.name,
      this._sourceSchema,
      functionMetadata.name.length + 1,
      this._functions,
      this._createdFunctions
    ) as FunctionData;
    const funcKey = createReactFlowFunctionKey(func);

    this.handleSingleValueOrFunction('', functionMetadata.inputs[0], { ...func, key: funcKey }, connections);
    this.getFunctionForKey(funcKey);
    this._conditional.key = funcKey;
    this._conditional.needsConnection = true;
  };
  private forHasIndex = (forSrc: ParseFunc) => forSrc.inputs.length > 1;

  private createIndexFunctionIfNeeded = (
    forFunc: ParseFunc,
    loopSource: SchemaNodeExtended,
    connections: ConnectionDictionary,
    loopSourceRef: LoopMetadata
  ) => {
    if (this.forHasIndex(forFunc)) {
      const index = (forFunc.inputs[1] as SingleValueMetadata).value;
      const indexFullKey = createReactFlowFunctionKey(indexPseudoFunction);
      this._createdFunctions[index.trim()] = indexFullKey;
      applyConnectionValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFullKey,
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(loopSource.key),
          node: loopSource,
        },
      });
      loopSourceRef.indexFn = indexFullKey;
    }
  };

  private getAbsoluteLoopKey = (key: string): string => {
    if (!key.includes(this._sourceSchema.schemaTreeRoot.key)) {
      const lastLoop = this._loop.length > 0 ? this.getLowestLoop().key : '';
      return `${lastLoop}/${key}`;
    }
    return key;
  };

  private getLoopNode = (sourceLoopKey: string) => {
    const absoluteKey = this.getAbsoluteLoopKey(sourceLoopKey);
    let loopSource = findNodeForKey(absoluteKey, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
    if (!loopSource) {
      loopSource = getLoopTargetNodeWithJson(absoluteKey, this._sourceSchema.schemaTreeRoot) as SchemaNodeExtended;
    }
    return loopSource;
  };

  private getSourceLoopFromSequenceFunctions = (metadata: FunctionCreationMetadata) => {
    // loop through sequence functions until we get the loop
    while (metadata.type === 'Function') {
      metadata = metadata.inputs[0];
    }
    return metadata;
  };

  private processForStatement = (sourceFor: FunctionCreationMetadata, connections: ConnectionDictionary) => {
    // take out for statement to get to inner objects
    const forFunc = sourceFor as ParseFunc;
    const sourceLoopKey = forFunc.inputs[0];
    if (sourceLoopKey.type === 'SingleValueMetadata') {
      const loopSource = this.getLoopNode(sourceLoopKey.value);
      if (loopSource) {
        const loopMetadata: LoopMetadata = {
          key: loopSource.key,
          needsConnection: true,
        };
        this._loop.push(loopMetadata);
        this.createIndexFunctionIfNeeded(forFunc, loopSource, connections, loopMetadata);
      }
    } else {
      const meta: FunctionCreationMetadata = this.getSourceLoopFromSequenceFunctions(sourceFor);
      this._loop.push({
        key: meta.value,
        needsConnection: true,
        sequence: sourceLoopKey,
      });
    }
  };

  public getSourceNodeWithBackout = (key: string) => {
    const lastLoop = this.getLowestLoop();
    let loop = this._sourceSchemaFlattened[addSourceReactFlowPrefix(lastLoop.key)];
    if (key.startsWith(mapNodeParams.backout)) {
      const backoutRegex = new RegExp(/\.\.\//g);
      let backoutCount = [...key.matchAll(backoutRegex)].length;
      const childKey = key.substring(backoutCount * mapNodeParams.backout.length);
      while (backoutCount > 0) {
        if (loop.parentKey) {
          loop = this._sourceSchemaFlattened[addSourceReactFlowPrefix(loop.parentKey)];
          backoutCount--;
        }
      }
      const child = this._sourceSchemaFlattened[addSourceReactFlowPrefix(`${loop.key}/${childKey}`)];
      return child;
    }
    return loop;
  };

  private isCustomValue = (value: string): boolean => {
    return value.startsWith('"') || !Number.isNaN(Number.parseInt(value));
  };

  private handleSingleValue = (key: string, targetNode: SchemaNodeExtended | FunctionData, connections: ConnectionDictionary) => {
    if (key === '.') {
      // current loop
      const lastLoop = this._loop[this._loop.length - 1].key;

      const loopNode = findNodeForKey(lastLoop, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(loopNode.key),
          node: loopNode,
        },
      });
    } else if (this.isCustomValue(key)) {
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: key,
      });
      // index
    } else if (key.startsWith('$')) {
      const indexFnKey = this._createdFunctions[key];
      const indexFn = connections[indexFnKey];
      if (indexFn) {
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: this.getTargetKey(targetNode),
          findInputSlot: true,
          input: {
            reactFlowKey: indexFn.self.reactFlowKey,
            node: indexFn.self.node,
          },
        });
      }
    } else if (key.includes('[')) {
      // using this older function for now
      const amendedSourceKey = amendSourceKeyForDirectAccessIfNeeded(key);

      const directAccessSeparated = separateFunctions(amendedSourceKey[0]);
      const idk = createSchemaNodeOrFunction(directAccessSeparated);

      this.handleSingleValueOrFunction('', idk.term, targetNode, connections);
    } else if (targetNode) {
      //danielle temporary to unblock
      this._conditional.children.push(key);

      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: key,
      });
    }
  };

  private isSchemaNodeTargetKey = (key: string) => {
    if (!key.includes(DReservedToken.for) && !key.includes(DReservedToken.if)) {
      return true;
    }
    return false;
  };
}

export const getLoopTargetNodeWithJson = (targetKey: string, targetSchemaRoot: SchemaNodeExtended) => {
  let trimmedTargetKey = targetKey;
  if (!targetKey.includes('/')) {
    // excludes custom values and others that aren't schema nodes
    return undefined;
  }
  if (targetKey[0] === '/') {
    trimmedTargetKey = targetKey.substring(1);
  }
  const targetKeyPath = trimmedTargetKey.split('/');
  const matchingSchemaNode = getLoopTargetNode(targetKeyPath, 1, targetSchemaRoot);
  return matchingSchemaNode;
};

const getLoopTargetNode = (targetKeyPath: string[], ind: number, parentNode: SchemaNodeExtended) => {
  if (ind === targetKeyPath.length) {
    return parentNode;
  }

  const possibleNodes: (SchemaNodeExtended | SchemaExtended | undefined)[] = [];

  parentNode.children.forEach((child) => {
    if (child.name === targetKeyPath[ind]) {
      possibleNodes.push(getLoopTargetNode(targetKeyPath, ind + 1, child));
    }
    // need to handle multiple of these
    if (child.name === '<ArrayItem>') {
      if (targetKeyPath[ind] !== '*') {
        possibleNodes.push(getLoopTargetNode(targetKeyPath, ind + 1, child));
      }
      possibleNodes.push(child);
    }
  });

  return possibleNodes.find((node) => node !== null);
};
