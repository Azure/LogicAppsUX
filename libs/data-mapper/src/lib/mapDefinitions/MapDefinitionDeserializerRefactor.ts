import { reservedMapDefinitionKeysArray } from '../constants/MapDefinitionConstants';
import { targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData } from '../models';
import type { ConnectionDictionary } from '../models/Connection';
import { applyConnectionValue } from '../utils/Connection.Utils';
import { getSourceNode } from '../utils/DataMap.Utils';
import { separateFunctions, createTargetOrFunction, DReservedToken } from '../utils/DataMap.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix, createReactFlowFunctionKey } from '../utils/ReactFlow.Util';
import { findNodeForKey, flattenSchemaIntoDictionary } from '../utils/Schema.Utils';
import type { MapDefinitionEntry, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/utils-logic-apps';
import { SchemaType } from '@microsoft/utils-logic-apps';

export class MapDefinitionDeserializerRefactor {
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
      targetNode = parentTargetNode.children.find((child) => child.name === formattedTargetKey); // danielle account for *
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

  private handleSingleValue = (key: string, targetNode: SchemaNodeExtended, connections: ConnectionDictionary) => {
    const tokens = separateFunctions(key);
    const functionMetadata = createTargetOrFunction(tokens);

    const sourceNode = findNodeForKey(key, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
    if (!sourceNode) {
      // get function node
      if (typeof functionMetadata.term !== 'string') {
        const func = getSourceNode(
          functionMetadata.term.name,
          this._sourceSchema,
          functionMetadata.term.name.length + 1,
          this._functions,
          this._createdNodes
        ) as FunctionData;
        const funcKey = createReactFlowFunctionKey(func);

        // function to target
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
          findInputSlot: true,
          input: {
            reactFlowKey: funcKey,
            node: func,
          },
        });

        functionMetadata.term.inputs.forEach((input) => {
          const src = findNodeForKey(input as string, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;

          applyConnectionValue(connections, {
            targetNode: func,
            targetNodeReactFlowKey: funcKey,
            findInputSlot: true,
            input: {
              reactFlowKey: addSourceReactFlowPrefix(src.key),
              node: src,
            },
          });
        });
      }
      // custom value
      else {
        applyConnectionValue(connections, {
          targetNode: targetNode,
          targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
          findInputSlot: true,
          input: key,
        });
      }
    }
  };

  private danielleTryParseDefinitionToConnection = (
    sourceNodeObject: string | object,
    leftSideKey: string,
    parentTargetNode: SchemaNodeExtended | undefined,
    connections: ConnectionDictionary
  ) => {
    // target key can be either a target node- or a source side psuedofunction- for or if only?? Danielle confirm
    if (this.isTargetKey(leftSideKey)) {
      // process right side

      const currentTarget = leftSideKey;
      const targetNode = this.getTargetNodeInContextOfParent(currentTarget, parentTargetNode);
      if (typeof sourceNodeObject === 'string') {
        const tokens = separateFunctions(sourceNodeObject);
        const functionMetadata = createTargetOrFunction(tokens);

        const sourceNode = findNodeForKey(sourceNodeObject, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;
        if (!sourceNode) {
          // get function node
          if (typeof functionMetadata.term !== 'string') {
            const func = getSourceNode(
              functionMetadata.term.name,
              this._sourceSchema,
              functionMetadata.term.name.length + 1,
              this._functions,
              this._createdNodes
            ) as FunctionData;
            const funcKey = createReactFlowFunctionKey(func);

            // function to target
            applyConnectionValue(connections, {
              targetNode: targetNode,
              targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
              findInputSlot: true,
              input: {
                reactFlowKey: funcKey,
                node: func,
              },
            });

            functionMetadata.term.inputs.forEach((input) => {
              const src = findNodeForKey(input as string, this._sourceSchema.schemaTreeRoot, false) as SchemaNodeExtended;

              applyConnectionValue(connections, {
                targetNode: func,
                targetNodeReactFlowKey: funcKey,
                findInputSlot: true,
                input: {
                  reactFlowKey: addSourceReactFlowPrefix(src.key),
                  node: src,
                },
              });
            });
          }
          // custom value
          else {
            applyConnectionValue(connections, {
              targetNode: targetNode,
              targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
              findInputSlot: true,
              input: sourceNodeObject,
            });
          }
        } else {
          applyConnectionValue(connections, {
            // most basic case, just a source node
            targetNode: targetNode,
            targetNodeReactFlowKey: addTargetReactFlowPrefix(targetNode.key),
            findInputSlot: true,
            input: {
              reactFlowKey: addSourceReactFlowPrefix(sourceNode.key),
              node: sourceNode,
            },
          });
        }
      } else {
        Object.entries(sourceNodeObject).forEach((child) => {
          // eslint-disable-next-line @typescript-eslint/ban-types
          this.danielleTryParseDefinitionToConnection(child[1], child[0], targetNode, connections); // for testing only
        });
      }
    } else {
      // process left side
      // for or if statement
      const tokens = separateFunctions(leftSideKey);
      const idk = createTargetOrFunction(tokens);
      if (tokens[0] === DReservedToken.if) {
        // danielle how is 'if' different than any other function- see docs;
        // create a new node for the if statement
        // connect it to the input
        // input can only be like a function or a source node
        // this._createConnections(
        //   isInLoop ? getSourceValueFromLoop(ifContents, targetKey, this._sourceSchemaFlattened) : ifContents,
        //   ifRfKey,
        //   isChildValueArray ? targetArrayDepth + 1 : targetArrayDepth,
        //   connections,
        //   isInLoop ? `${targetKey}/${isChildValueArray ? '*' : Object.keys(childValue)[0]}` : undefined
        // );
      } else {
        // for statement
        // connect source and take into account possible sequence functions
        // what is different? creating the index function if second parameter
      }
      console.log(idk);
      // simplest case src to target
    }

    // danielle maybe call same functions and see if having the target helps?
  };

  //private connectIfDanielle

  private isTargetKey = (key: string) => {
    // danielle later combine this
    if (!key.includes('for') && !key.includes('if')) {
      return true;
    }
    return false;
  };
}
