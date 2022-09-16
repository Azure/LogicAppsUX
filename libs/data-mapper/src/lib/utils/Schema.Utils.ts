import type { ConnectionDictionary } from '../models/Connection';
import type { PathItem, Schema, SchemaExtended, SchemaNode, SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaNodeDataType, SchemaTypes } from '../models/Schema';
import { inputPrefix, outputPrefix } from './ReactFlow.Util';

export const convertSchemaToSchemaExtended = (schema: Schema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, []),
  };

  return extendedSchema;
};

const convertSchemaNodeToSchemaNodeExtended = (schemaNode: SchemaNode, parentPath: PathItem[]): SchemaNodeExtended => {
  const pathToRoot: PathItem[] = [...parentPath, { key: schemaNode.key, name: schemaNode.name }];

  const extendedSchemaNode: SchemaNodeExtended = {
    ...schemaNode,
    children: schemaNode.children ? schemaNode.children.map((child) => convertSchemaNodeToSchemaNodeExtended(child, pathToRoot)) : [],
    pathToRoot: pathToRoot,
  };

  return extendedSchemaNode;
};

export const flattenSchema = (schema: SchemaExtended, schemaType: SchemaTypes): SchemaNodeDictionary => {
  const result: SchemaNodeDictionary = {};
  const idPrefix = schemaType === SchemaTypes.Input ? inputPrefix : outputPrefix;
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

export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean =>
  schemaNode.schemaNodeDataType !== SchemaNodeDataType.ComplexType && schemaNode.schemaNodeDataType !== SchemaNodeDataType.None;

export const allChildNodesSelected = (schemaNode: SchemaNodeExtended, selectedNodes: SchemaNodeExtended[]): boolean =>
  schemaNode.children.every((childNode) => selectedNodes.some((selectedNode) => selectedNode.key === childNode.key));

export const hasAConnection = (schemaNode: SchemaNodeExtended, connections: ConnectionDictionary): boolean => {
  return Object.values(connections).some(
    (connection) =>
      connection.reactFlowSource === `${inputPrefix}${schemaNode.key}` ||
      connection.reactFlowDestination === `${outputPrefix}${schemaNode.key}`
  );
};

export const hasAConnectionAtCurrentOutputNode = (
  schemaNode: SchemaNodeExtended,
  currentOutputNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): boolean => {
  return Object.values(connections)
    .filter((connection) => currentOutputNode.children.some((outputChild) => outputChild.key === connection.destination))
    .some(
      (connection) =>
        connection.reactFlowSource === `${inputPrefix}${schemaNode.key}` ||
        connection.reactFlowDestination === `${outputPrefix}${schemaNode.key}`
    );
};
