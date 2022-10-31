import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { PathItem, Schema, SchemaExtended, SchemaNode, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { SchemaNodeProperty, SchemaType } from '../models';
import type { FunctionData } from '../models/Function';

export const convertSchemaToSchemaExtended = (schema: Schema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, []),
  };

  return extendedSchema;
};

const convertSchemaNodeToSchemaNodeExtended = (schemaNode: SchemaNode, parentPath: PathItem[]): SchemaNodeExtended => {
  const nodeProperties = parsePropertiesIntoNodeProperties(schemaNode.properties);
  const pathToRoot: PathItem[] = [
    ...parentPath,
    {
      key: schemaNode.key,
      name: schemaNode.name,
      fullName: schemaNode.fullName,
      repeating: nodeProperties.indexOf(SchemaNodeProperty.Repeating) > -1,
    },
  ];

  const extendedSchemaNode: SchemaNodeExtended = {
    ...schemaNode,
    nodeProperties,
    children: schemaNode.children ? schemaNode.children.map((child) => convertSchemaNodeToSchemaNodeExtended(child, pathToRoot)) : [],
    pathToRoot: pathToRoot,
  };

  return extendedSchemaNode;
};

// Exported for testing purposes
export const parsePropertiesIntoNodeProperties = (propertiesString: string): SchemaNodeProperty[] => {
  if (propertiesString) {
    return propertiesString.split(',').map((propertyString) => {
      return SchemaNodeProperty[propertyString.trim() as keyof typeof SchemaNodeProperty];
    });
  }

  return [];
};

export const flattenSchema = (schema: SchemaExtended, schemaType: SchemaType): SchemaNodeDictionary => {
  const result: SchemaNodeDictionary = {};
  const idPrefix = schemaType === SchemaType.Source ? sourcePrefix : targetPrefix;
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

export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean => schemaNode.children.length < 1;

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

export const isSchemaNodeExtended = (node: SchemaNodeExtended | FunctionData): node is SchemaNodeExtended => 'pathToRoot' in node;
