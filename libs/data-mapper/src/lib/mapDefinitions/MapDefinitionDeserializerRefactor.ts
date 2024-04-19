// biome-ignore-disable lint/style/useCollapsedElseIf
import { reservedMapDefinitionKeysArray } from "../constants/MapDefinitionConstants";
import { targetPrefix } from "../constants/ReactFlowConstants";
import type { FunctionData } from "../models";
import { indexPseudoFunction } from "../models";
import type { ConnectionDictionary } from "../models/Connection";
import { applyConnectionValue } from "../utils/Connection.Utils";
import type {
  FunctionCreationMetadata,
  ParseFunc,
} from "../utils/DataMap.Utils";
import {
  getSourceNode,
  separateFunctions,
  DReservedToken,
  createTargetOrFunctionRefactor,
  addParentConnectionForRepeatingElementsNested,
} from "../utils/DataMap.Utils";
import { isFunctionData } from "../utils/Function.Utils";
import {
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  createReactFlowFunctionKey,
} from "../utils/ReactFlow.Util";
import {
  findNodeForKey,
  flattenSchemaIntoDictionary,
} from "../utils/Schema.Utils";
import { getLoopTargetNodeWithJson } from "./MapDefinitionDeserializer";
import type {
  MapDefinitionEntry,
  SchemaExtended,
  SchemaNodeDictionary,
  SchemaNodeExtended,
} from "@microsoft/logic-apps-shared";
import { SchemaType } from "@microsoft/logic-apps-shared";

export class MapDefinitionDeserializerRefactor {
  private readonly _mapDefinition: MapDefinitionEntry;
  private readonly _sourceSchema: SchemaExtended;
  private readonly _targetSchema: SchemaExtended;
  private readonly _functions: FunctionData[];
  private _loop: { needsConnection: boolean; key: string }[];
  private _loopDest: string;
  private _conditional: string;

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
    this._conditional = "";
    this._loop = [];
    this._loopDest = "";

    this._sourceSchemaFlattened = flattenSchemaIntoDictionary(
      this._sourceSchema,
      SchemaType.Source
    );
    this._targetSchemaFlattened = flattenSchemaIntoDictionary(
      this._targetSchema,
      SchemaType.Target
    );

    this._createdNodes = {};
  }

  public convertFromMapDefinition = (): ConnectionDictionary => {
    const connections: ConnectionDictionary = {};
    const parsedYamlKeys: string[] = Object.keys(this._mapDefinition);

    const rootNodeKey = parsedYamlKeys.filter(
      (key) => reservedMapDefinitionKeysArray.indexOf(key) < 0
    )[0];

    if (rootNodeKey) {
      this.createConnectionsForLMLObject(
        this._mapDefinition[rootNodeKey],
        `/${rootNodeKey}`,
        undefined,
        connections
      );
    }

    //this._cleanupExtraneousConnections(connections);

    return connections;
  };

  private getTargetNodeInContextOfParent = (
    currentTargetKey: string,
    parentTargetNode: SchemaNodeExtended | undefined
  ) => {
    let targetNode: SchemaNodeExtended | undefined = undefined;
    let formattedTargetKey = "";
    if (currentTargetKey.startsWith("$@")) {
      formattedTargetKey = currentTargetKey.substring(2); // danielle this probably needs to be done on source side too
    } else if (currentTargetKey.startsWith("$")) {
      formattedTargetKey = currentTargetKey.substring(1);
    } else {
      formattedTargetKey = currentTargetKey;
    }
    if (parentTargetNode === undefined) {
      targetNode =
        this._targetSchemaFlattened[`${targetPrefix}${formattedTargetKey}`];
    } else {
      targetNode = parentTargetNode.children.find(
        (child) => child.name === formattedTargetKey
      );
      if (targetNode === undefined) {
        targetNode = getLoopTargetNodeWithJson(
          // danielle eventually this can be simplified because we have the parent
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

  private getSourceNodeForRelativeKeyInLoop = (
    key: string,
    _connections: ConnectionDictionary,
    _targetNode: SchemaNodeExtended | FunctionData
  ) => {
    let srcNode: SchemaNodeExtended | undefined;
    if (key === ".") {
      // current loop
      const lowestLoopNodeKey = this._loop[this._loop.length - 1].key;
      srcNode = findNodeForKey(
        lowestLoopNodeKey,
        this._sourceSchema.schemaTreeRoot,
        false
      ) as SchemaNodeExtended;
    } else if (key.startsWith("../")) {
      srcNode = this.getSourceNodeWithBackout(key);
    } else {
      const lastLoop = this._loop[this._loop.length - 1].key;
      srcNode = findNodeForKey(
        `${lastLoop}/${key}`,
        this._sourceSchema.schemaTreeRoot,
        false
      ) as SchemaNodeExtended;
    }
    return srcNode;
  };

  private handleSingleValueOrFunction = (
    key: string,
    funcMetadata: FunctionCreationMetadata | undefined,
    targetNode: SchemaNodeExtended | FunctionData,
    connections: ConnectionDictionary
  ) => {
    // danielle what is this for?
    const tokens = separateFunctions(key);
    const functionMetadata =
      funcMetadata || createTargetOrFunctionRefactor(tokens).term;

    let sourceNode = findNodeForKey(
      key,
      this._sourceSchema.schemaTreeRoot,
      false
    ) as SchemaNodeExtended | undefined;
    if ((this._loop.length > 0 || this._loopDest) && !sourceNode) {
      sourceNode = this.getSourceNodeForRelativeKeyInLoop(
        key,
        connections,
        targetNode
      );
    }
    if (sourceNode && this._loop.length > 0) {
      addParentConnectionForRepeatingElementsNested(
        targetNode as SchemaNodeExtended,
        sourceNode,
        this._sourceSchemaFlattened,
        this._targetSchemaFlattened,
        connections
      );
    }

    if (!sourceNode) {
      // get function node

      if (typeof functionMetadata !== "string") {
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
          const srcStr = typeof input === "string" ? input : input.name;
          this.handleSingleValueOrFunction(srcStr, input, func, connections);
        });
      } else { // custom value or index
        this.handleSingleValue(key, targetNode, connections);
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
    isFunctionData(targetNode)
      ? targetNode.key
      : addTargetReactFlowPrefix(targetNode.key);

  private addLoopConnectionIfNeeded = (
    addLoopConnection: boolean,
    connections: ConnectionDictionary,
    targetNode: SchemaNodeExtended | FunctionData
  ) => {
    if (addLoopConnection && this._loop.length > 0) {
      this._loop.forEach((loop) => {
        if (loop.needsConnection) {
          let loopSrc: SchemaNodeExtended | FunctionData = findNodeForKey(
            loop.key,
            this._sourceSchema.schemaTreeRoot,
            false
          ) as SchemaNodeExtended;
          let key = addSourceReactFlowPrefix(loopSrc.key);
          if (this._loopDest) {
            loopSrc = connections[this._loopDest].self.node;
            key = this._loopDest;
            this._loopDest = "";
          }
          // eslint-disable-next-line no-param-reassign
          loop.needsConnection = false;

          applyConnectionValue(connections, {
            targetNode: targetNode,
            targetNodeReactFlowKey: this.getTargetKey(targetNode),
            findInputSlot: true,
            input: {
              reactFlowKey: key,
              node: loopSrc,
            },
          });
        }
      });
    }
  };

  private addConditionalConnectionIfNeeded = (
    connections: ConnectionDictionary,
    targetNode: SchemaNodeExtended | FunctionData
  ) => {
    if (this._conditional) {
      const ifFunction = this._functions.find(
        (func) => func.key === this._conditional
      ) as FunctionData;
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
        findInputSlot: true,
        input: {
          reactFlowKey: this._conditional,
          node: ifFunction,
        },
      });
    }
  };

  private createConnectionsForLMLObject = (
    rightSideStringOrObject: string | object,
    leftSideKey: string,
    parentTargetNode: SchemaNodeExtended | undefined,
    connections: ConnectionDictionary,
    // eslint-disable-next-line @typescript-eslint/no-inferrable-types
    addLoopConnection: boolean = false
  ) => {
    if (this.isTargetKey(leftSideKey)) {
      const currentTarget = leftSideKey;
      const targetNode = this.getTargetNodeInContextOfParent(
        currentTarget,
        parentTargetNode
      );

      this.addLoopConnectionIfNeeded(
        addLoopConnection,
        connections,
        targetNode
      );
      this.addConditionalConnectionIfNeeded(connections, targetNode);

      // must connect conditional
      if (typeof rightSideStringOrObject === "string") {
        if (this._conditional) {
          const ifFunction = this._functions.find(
            (func) => func.key === this._conditional
          ) as FunctionData;
          this.handleSingleValueOrFunction(
            rightSideStringOrObject,
            undefined,
            ifFunction,
            connections
          );
        } else {
          this.handleSingleValueOrFunction(
            rightSideStringOrObject,
            undefined,
            targetNode,
            connections
          );
        }
      } else {
        Object.entries(rightSideStringOrObject).forEach((child) => {
          this.createConnectionsForLMLObject(
            child[1],
            child[0],
            targetNode,
            connections
          );
        });
      }
    } else {
      // left side is for or if statement
      const tokens = separateFunctions(leftSideKey);
      const forOrIfObj = createTargetOrFunctionRefactor(tokens);
      if (tokens[0] === DReservedToken.if) {
        if (parentTargetNode) {
          this.handleIfFunction(
            forOrIfObj.term as ParseFunc,
            parentTargetNode,
            connections
          );
        }
      } else {
        // for statement
        this.processForStatement(
          forOrIfObj.term,
          parentTargetNode as SchemaNodeExtended,
          connections
        );
      }
      Object.entries(rightSideStringOrObject).forEach((child) => {
        this.createConnectionsForLMLObject(
          child[1],
          child[0],
          parentTargetNode,
          connections,
          true
        );
      });
      this._conditional = "";
    }
  };

  private handleIfFunction = (
    functionMetadata: ParseFunc,
    _targetNode: SchemaNodeExtended | FunctionData,
    connections: ConnectionDictionary
  ) => {
    const func = getSourceNode(
      functionMetadata.name,
      this._sourceSchema,
      functionMetadata.name.length + 1,
      this._functions,
      this._createdNodes
    ) as FunctionData;
    const funcKey = createReactFlowFunctionKey(func);
    func.key = funcKey;

    this._conditional = funcKey;
    this.handleSingleValueOrFunction(
      "",
      functionMetadata.inputs[0],
      func,
      connections
    );
  };
  private forHasIndex = (forSrc: ParseFunc) => forSrc.inputs.length > 1;

  private handleIndexFuncCreation = (
    forFunc: ParseFunc,
    loopSource: SchemaNodeExtended,
    connections: ConnectionDictionary
  ) => {
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

  private getLoopNode = (sourceLoopKey: string) => {
    let absoluteKey = sourceLoopKey;
    if (!sourceLoopKey.includes(this._sourceSchema.schemaTreeRoot.key)) {
      // relative path
      const lastLoop =
        this._loop.length > 0 ? this._loop[this._loop.length - 1].key : "";
      absoluteKey = `${lastLoop}/${sourceLoopKey}`;
    }
    let loopSource = findNodeForKey(
      absoluteKey,
      this._sourceSchema.schemaTreeRoot,
      false
    ) as SchemaNodeExtended;
    if (!loopSource) {
      loopSource = getLoopTargetNodeWithJson(
        absoluteKey,
        this._sourceSchema.schemaTreeRoot
      ) as SchemaNodeExtended;
    }
    console.log("loopSource", loopSource);
    return loopSource;
  };

  private processForStatement = (
    sourceFor: FunctionCreationMetadata,
    _target: SchemaNodeExtended,
    connections: ConnectionDictionary
  ) => {
    // take out for statement to get to inner objects
    const forFunc = sourceFor as ParseFunc;
    const sourceLoopKey = forFunc.inputs[0];
    if (typeof sourceLoopKey === "string") {
      const loopSource = this.getLoopNode(sourceLoopKey);
      if (loopSource) {
        this._loop.push({ key: loopSource.key, needsConnection: true });
        this.handleIndexFuncCreation(forFunc, loopSource, connections);
      }
    } else {
      // must be a sequence function
    }
  };

  public getSourceNodeWithBackout = (key: string) => {
    const lastLoop = this._loop[this._loop.length - 1];
    let loop =
      this._sourceSchemaFlattened[addSourceReactFlowPrefix(lastLoop.key)];
    if (key.startsWith("../")) {
      const backoutRegex = new RegExp(/\.\.\//g);
      let backoutCount = [...key.matchAll(backoutRegex)].length;
      const childKey = key.substring(backoutCount * 3);
      while (backoutCount > 0) {
        if (loop.parentKey) {
          loop =
            this._sourceSchemaFlattened[
              addSourceReactFlowPrefix(loop.parentKey)
            ];
          backoutCount--;
        }
      }
      const child =
        this._sourceSchemaFlattened[
          addSourceReactFlowPrefix(`${loop.key}/${childKey}`)
        ];
      return child;
    }
    return loop;
  };

  private handleSingleValue = (
    key: string,
    targetNode: SchemaNodeExtended | FunctionData,
    connections: ConnectionDictionary
  ) => {
    // ", Esq" can we count quotes to determine if custom value?
    // "."
    // 300
    // ../ns0:author/ns0:first-name
    // /ns0:SourceSchemaRoot/Looping/ManyToOne/Simple/SourceSimpleChild/SourceSimpleChildChild[$b]/SourceDirect
    // /ns0:Root/LoopingWithIndex/WeatherReport[1]/@Pressure
    // /ns0:Root/Looping/VehicleTrips/Vehicle[is-equal(VehicleId, /ns0:Root/Looping/VehicleTrips/Trips[$i]/VehicleId)]/VehicleRegistration
    if (key === ".") {
      // current loop
      const lastLoop = this._loop[this._loop.length - 1].key;

      const loopNode = findNodeForKey(
        lastLoop,
        this._sourceSchema.schemaTreeRoot,
        false
      ) as SchemaNodeExtended;
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: {
          reactFlowKey: addSourceReactFlowPrefix(loopNode.key),
          node: loopNode,
        },
      });
    } else if (key.startsWith('"') || parseInt(key)) {
      // custom value danielle custom value can also be a number without quotes
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: key,
      });
    } else if (key.startsWith("$")) {
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
    } else if (key.includes("[")) {
      // idk
    } else {
      applyConnectionValue(connections, {
        targetNode: targetNode,
        targetNodeReactFlowKey: this.getTargetKey(targetNode),
        findInputSlot: true,
        input: key,
      });
    }
  };

  private isTargetKey = (key: string) => {
    if (!key.includes("$for") && !key.includes("$if")) {
      return true;
    }
    return false;
  };
}
