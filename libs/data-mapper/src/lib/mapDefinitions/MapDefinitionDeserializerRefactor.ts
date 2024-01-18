import { reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData } from '../models';
import { indexPseudoFunction } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { applyConnectionValue } from '../utils/Connection.Utils';
import type { FunctionCreationMetadata, ParseFunc } from '../utils/DataMap.Utils';
import {
  getSourceNode,
  separateFunctions,
  createTargetOrFunction,
  DReservedToken,
  createTargetOrFunctionRefactor,
} from '../utils/DataMap.Utils';
import { isFunctionData } from '../utils/Function.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary } from '../utils/Schema.Utils';
import { getLoopTargetNodeWithJson } from './MapDefinitionDeserializer';
import type { MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/utils-logic-apps';
import { SchemaType } from '@microsoft/utils-logic-apps';

export class MapDefinitionDeserializerRefactor {
  private readonly _mapDefinition: MapDefinitionEntry;
  private readonly _sourceSchema: SchemaExtended;
  private readonly _targetSchema: SchemaExtended;
  private readonly _functions: FunctionData[];
  private _loop: string;
  private _loopDest: string;

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
    this._loop = '';
    this._loopDest = '';

    this._sourceSchemaFlattened = flattenSchemaIntoDictionary(this._sourceSchema, SchemaType.Source);
    this._targetSchemaFlattened = flattenSchemaIntoDictionary(this._targetSchema, SchemaType.Target);

    this._createdNodes = {};
  }

  public convertFromMapDefinition = (): ConnectionDictionary => {
    const connections: ConnectionDictionary = {};
    const parsedYamlKeys: string[] = Object.keys(this._mapDefinition);

    const rootNodeKey = parsedYamlKeys.filter((key) => reservedMapDefinitionKeysArray.indexOf(key) < 0)[0];

    if (rootNodeKey) {
      this.danielleTryParseDefinitionToConnection(this._mapDefinition[rootNodeKey], `/${rootNodeKey}`, undefined, connections);
      // this._parseDefinitionToConnection(this._mapDefinition[rootNodeKey], `/${rootNodeKey}`, 0, connections);
    }

    //this._cleanupExtraneousConnections(connections);

    return connections;
  };

  private getTargetNodeInContextOfParent = (currentTargetKey: string, parentTargetNode: SchemaNodeExtended | undefined) => {
    let targetNode: SchemaNodeExtended | undefined = undefined;
    let formattedTargetKey = currentTargetKey.startsWith('$@') ? currentTargetKey.substring(2) : currentTargetKey; // danielle this probably needs to be done on source side too
    formattedTargetKey = currentTargetKey.startsWith('$') ? currentTargetKey.substring(1) : formattedTargetKey;
    if (parentTargetNode === undefined) {
      targetNode = this._targetSchemaFlattened[`${targetPrefix}${formattedTargetKey}`];
    } else {
      targetNode = parentTargetNode.children.find((child) => child.name === formattedTargetKey);
      if (targetNode === undefined) {
        targetNode = getLoopTargetNodeWithJson(
          `${parentTargetNode.key}/${currentTargetKey}`,
          this._targetSchema.schemaTreeRoot
        ) as SchemaNodeExtended;
        console.log(targetNode);
      }
    }
    if (targetNode === undefined) {
      throw new Error(`Target node not found for key ${currentTargetKey}`);
    }
    return targetNode;
  };

  //   private handleFunction = (funcCreationMetadata: FunctionCreationMetadata) => {
  //     if (typeof funcCreationMetadata !== 'string') {
  //         getSourceNode()
  //         //createReactFlowFunctionKey(funcCreationMetadata.name);
  //     }
  //   }
  private getSourceNodeForRelativeKeyInLoop = (
    key: string,
    _connections: ConnectionDictionary,
    _targetNode: SchemaNodeExtended | FunctionData
  ) => {
    let srcNode: SchemaNodeExtended | undefined;
    if (key === '.') {
      // current loop
      srcNode = findNodeForKey(this._loop, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
    } else if (key.startsWith('../')) {
      srcNode = this.getSourceNodeWithBackout(key);
    } else {
      srcNode = findNodeForKey(`${this._loop}/${key}`, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
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
    const functionMetadata = funcMetadata || createTargetOrFunctionRefactor(tokens).term;

    let sourceNode = findNodeForKey(key, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended | undefined;
    if ((this._loop || this._loopDest) && !sourceNode) {
      sourceNode = this.getSourceNodeForRelativeKeyInLoop(key, connections, targetNode);
    }
    if (!sourceNode) {
      // get function node
      if (typeof functionMetadata !== 'string') {
        const func = getSourceNode(
          functionMetadata.name,
          this._sourceSchema,
          functionMetadata.name.length + 1,
          this._functions,
          this._createdNodes
        ) as FunctionData;
        const funcKey = createReactFlowFunctionKey(func);
        // eslint-disable-next-line no-param-reassign
        func.key = funcKey;

        // function to target
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: this.getTargetKey(targetNode),
          findInputSlot: true,
          input: {
            reactFlowKey: funcKey,
            node: func,
          },
        });

        functionMetadata.inputs.forEach((input) => {
          const srcStr = typeof input === 'string' ? input : input.name;
          this.handleSingleValueOrFunction(srcStr, input, func, connections);
        });
      }
      // custom value or index
      else {
        if (key.startsWith('$')) {
          // custom value
          const indexFnKey = this._createdNodes[key];
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
        } else {
          applyConnectionValue(connections, {
            targetNode: targetNode,
            targetNodeReactFlowKey: this.getTargetKey(targetNode),
            findInputSlot: true,
            input: key,
          });
        }
      }
    } else {
      applyConnectionValue(connections, {
        // most basic case, just a source node
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(sourceNode.key),
          node: sourceNode,
        },
      });
    }
  };

  private getTargetKey = (targetNode: SchemaNodeExtended | FunctionData) =>
    isFunctionData(targetNode) ? targetNode.key : addTargetReactFlowPrefix(targetNode.key);

  private addLoopConnectionIfNeeded = (
    addLoopConnection: boolean,
    connections: ConnectionDictionary,
    targetNode: SchemaNodeExtended | FunctionData
  ) => {
    if (addLoopConnection && this._loop) {
      let loopSrc: SchemaNodeExtended | FunctionData = findNodeForKey(
        this._loop,
        this._sourceSchema.schemaTreeRoot,
        false
      ) as SchemaNodeExtended;
      let key = addSourceReactFlowPrefix(loopSrc.key);
      if (this._loopDest) {
        loopSrc = connections[this._loopDest].self.node;
        key = this._loopDest;
        this._loopDest = '';
      }

      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: {
          reactFlowKey: key,
          node: loopSrc,
        },
      });
    }
  };

  private danielleTryParseDefinitionToConnection = (
    sourceNodeObject: string | object,
    leftSideKey: string,
    parentTargetNode: SchemaNodeExtended | undefined,
    connections: ConnectionDictionary,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    addLoopConnection: boolean = false
  ) => {
    if (this.isTargetKey(leftSideKey)) {
      // process right side

      const currentTarget = leftSideKey;
      const targetNode = this.getTargetNodeInContextOfParent(currentTarget, parentTargetNode);

      this.addLoopConnectionIfNeeded(addLoopConnection, connections, targetNode);

      if (typeof sourceNodeObject === 'string') {
        this.handleSingleValueOrFunction(sourceNodeObject, undefined, targetNode, connections);
      } else {
        Object.entries(sourceNodeObject).forEach((child) => {
          this.danielleTryParseDefinitionToConnection(child[1], child[0], targetNode, connections);
        });
      }
    } else {
      // process left side
      // for or if statement
      const tokens = separateFunctions(leftSideKey);
      const idk = createTargetOrFunction(tokens);
      if (tokens[0] === DReservedToken.if) {
        // add if function
        if (parentTargetNode) {
          this.handleSingleValueOrFunction('', idk.term, parentTargetNode, connections);
        }

        // danielle how is 'if' different than any other function- see docs;
        // create a new node for the if statement
        // connect it to the input
        // input can only be like a function or a source node
        Object.entries(sourceNodeObject).forEach((child) => {
          this.danielleTryParseDefinitionToConnection(child[1], child[0], parentTargetNode, connections, true);
        });
      } else {
        // for statement
        this.processForStatement(idk.term, parentTargetNode as SchemaNodeExtended, connections);

        Object.entries(sourceNodeObject).forEach((child) => {
          this.danielleTryParseDefinitionToConnection(child[1], child[0], parentTargetNode, connections, true);
        });
      }
    }
  };

  private forHasIndex = (forSrc: ParseFunc) => forSrc.inputs.length > 1;

  private handleIndexFuncCreation = (forFunc: ParseFunc, loopSource: SchemaNodeExtended, connections: ConnectionDictionary) => {
    if (this.forHasIndex(forFunc)) {
      const index = forFunc.inputs[1] as string;
      // const idxSourceVariableKey = `${index}-${loopSource.key}`; // danielle eventually will need this
      const indexFullKey = createReactFlowFunctionKey(indexPseudoFunction);
      this._createdNodes[index.trim()] = indexFullKey;
      applyConnectionValue(connections, {
        targetNode: indexPseudoFunction,
        targetNodeReactFlowKey: indexFullKey,
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(loopSource.key),
          node: loopSource,
        },
      });

      this._loopDest = indexFullKey;
    }
  };

  private processForStatement = (sourceFor: FunctionCreationMetadata, _target: SchemaNodeExtended, connections: ConnectionDictionary) => {
    // take out for statement to get to inner objects
    const forFunc = sourceFor as ParseFunc;
    const sourceLoopKey = forFunc.inputs[0];
    if (typeof sourceLoopKey === 'string') {
      let loopSource = findNodeForKey(sourceLoopKey, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
      if (!loopSource) {
        // loop is relative
        loopSource = findNodeForKey(`${this._loop}/${sourceLoopKey}`, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
      }
      if (!loopSource) {
        const idk = getLoopTargetNodeWithJson(sourceLoopKey, this._targetSchema.schemaTreeRoot);
        console.log(idk);
      }
      this._loop = loopSource.key;
      this.handleIndexFuncCreation(forFunc, loopSource, connections);
    } else {
      // must be a sequence function
    }
  };

  public getSourceNodeWithBackout = (key: string) => {
    let loop = this._sourceSchemaFlattened[addSourceReactFlowPrefix(this._loop)];
    let child;
    if (key.startsWith('../')) {
      const backoutRegex = new RegExp(/\.\.\//g);
      let backoutCount = [...key.matchAll(backoutRegex)].length;
      const childKey = key.substring(backoutCount * 3);
      while (backoutCount > 0) {
        if (loop.parentKey) {
          loop = this._sourceSchemaFlattened[addSourceReactFlowPrefix(loop.parentKey)];
          backoutCount--;
        }
      }
      child = this._sourceSchemaFlattened[addSourceReactFlowPrefix(`${loop.key}/${childKey}`)];
    }
    return child;
  };

  private handleSingleValue = (key: string, targetNode: SchemaNodeExtended | FunctionData, connections: ConnectionDictionary) => {
    // ", Esq" can we count quotes to determine if custom value?
    // "."
    // ../ns0:author/ns0:first-name
    // /ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild[$b]/SourceDirect
    // /ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure
    // /ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration
    if (key === '.') {
      // current loop
      const loopNode = findNodeForKey(this._loop, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(loopNode.key),
          node: loopNode,
        },
      });
      if (key.startsWith('"')) {
        // custom value danielle custom value can also be a number without quotes
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
          findInputSlot: true,
          input: key,
        });
      }
      if (key.startsWith('$')) {
        // custom value
        const indexFnKey = this._createdNodes[key];
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
        // idk
      } else {
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
          findInputSlot: true,
          input: key,
        });
      }
    }
  };

  private isTargetKey = (key: string) => {
    if (!key.includes('$for') && !key.includes('$if')) {
      return true;
    }
    return false;
  };
}
