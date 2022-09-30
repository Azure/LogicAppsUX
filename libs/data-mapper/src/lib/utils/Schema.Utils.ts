import type { ConnectionDictionary } from '../models/Connection';
import type { PathItem, Schema, SchemaExtended, SchemaNode, SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeDataType, SchemaTypes } from '../models/Schema';
import { sourcePrefix, targetPrefix } from './ReactFlow.Util';

export const convertSchemaToSchemaExtended = (schema: Schema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, []),
  };

  return extendedSchema;
};

const convertSchemaNodeToSchemaNodeExtended = (schemaNode: SchemaNode, parentPath: PathItem[]): SchemaNodeExtended => {
  const pathToRoot: PathItem[] = [...parentPath, { key: schemaNode.key, name: schemaNode.name, fullName: schemaNode.fullName }];

  const extendedSchemaNode: SchemaNodeExtended = {
    ...schemaNode,
    children: schemaNode.children ? schemaNode.children.map((child) => convertSchemaNodeToSchemaNodeExtended(child, pathToRoot)) : [],
    pathToRoot: pathToRoot,
  };

  return extendedSchemaNode;
};

export const flattenSchema = (schema: SchemaExtended, schemaType: SchemaTypes): SchemaNodeDictionary => {
  const result: SchemaNodeDictionary = {};
  const idPrefix = schemaType === SchemaTypes.Source ? sourcePrefix : targetPrefix;
  const schemaNodeArray = flattenSchemaNode(schema.schemaTreeRoot);

  schemaNodeArray.reduce((dict, node) => {
    // eslint-disable-next-line no-param-reassign
    dict[`${idPrefix}${node.key}`] = node;
    return dict;
  }, result);

  return result;
};

const flattenSchemaNode = (schemaNode: SchemaNodeExtended): SchemaNodeExtended[] => {
  const childArray = schemaNode.children.flatMap((childNode) => flattenSchemaNode(childNode));
  childArray.push(schemaNode);

  return childArray;
};

// TODO Handle values with attributes
export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean => schemaNode.schemaNodeDataType !== SchemaNodeDataType.None;

export const allChildNodesSelected = (schemaNode: SchemaNodeExtended, selectedNodes: SchemaNodeExtended[]): boolean =>
  schemaNode.children.every((childNode) => selectedNodes.some((selectedNode) => selectedNode.key === childNode.key));

export const hasAConnection = (schemaNode: SchemaNodeExtended, connections: ConnectionDictionary): boolean => {
  return Object.values(connections).some(
    (connection) =>
      connection.reactFlowSource === `${sourcePrefix}${schemaNode.key}` ||
      connection.reactFlowDestination === `${targetPrefix}${schemaNode.key}`
  );
};

export const hasAConnectionAtCurrentTargetNode = (
  schemaNode: SchemaNodeExtended,
  currentTargetNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): boolean => {
  return Object.values(connections)
    .filter((connection) => currentTargetNode.children.some((outputChild) => outputChild.key === connection.destination.key))
    .some(
      (connection) =>
        connection.reactFlowSource === `${sourcePrefix}${schemaNode.key}` ||
        connection.reactFlowDestination === `${targetPrefix}${schemaNode.key}`
    );
};

export const findNodeForKey = (nodeKey: string, schemaNode: SchemaNodeExtended): SchemaNodeExtended | undefined => {
  if (schemaNode.key === nodeKey) {
    return schemaNode;
  }

  let result: SchemaNodeExtended | undefined = undefined;
  schemaNode.children.forEach((childNode) => {
    const tempResult = findNodeForKey(nodeKey, childNode);

    if (tempResult) {
      result = tempResult;
    }
  });

  return result;
};
