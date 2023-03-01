import type { FilteredDataTypesDict } from '../components/tree/SchemaTreeSearchbar';
import { arrayType } from '../components/tree/SchemaTreeSearchbar';
import type { ITreeNode } from '../components/tree/Tree';
import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { PathItem, Schema, SchemaExtended, SchemaNode, SchemaNodeDictionary, SchemaNodeExtended } from '../models';
import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '../models';
import type { FunctionData } from '../models/Function';
import Fuse from 'fuse.js';

export const convertSchemaToSchemaExtended = (schema: Schema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, undefined, []),
  };

  return extendedSchema;
};

const convertSchemaNodeToSchemaNodeExtended = (
  schemaNode: SchemaNode,
  parentKey: string | undefined,
  parentPath: PathItem[]
): SchemaNodeExtended => {
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
    children: schemaNode.children
      ? schemaNode.children.map((child) => convertSchemaNodeToSchemaNodeExtended(child, schemaNode.key, pathToRoot))
      : [],
    pathToRoot: pathToRoot,
    parentKey,
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

export const flattenSchemaIntoDictionary = (schema: SchemaExtended, schemaType: SchemaType): SchemaNodeDictionary => {
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

export const flattenSchemaIntoSortArray = (schemaNode: SchemaNodeExtended): string[] => {
  return flattenSchemaNode(schemaNode).map((node) => node.key);
};

const flattenSchemaNode = (schemaNode: SchemaNodeExtended): SchemaNodeExtended[] => {
  const result: SchemaNodeExtended[] = [schemaNode];
  const childArray = schemaNode.children.flatMap((childNode) => flattenSchemaNode(childNode));

  return result.concat(childArray);
};

export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean => schemaNode.children.length < 1;

export const findNodeForKey = (nodeKey: string, schemaNode: SchemaNodeExtended): SchemaNodeExtended | undefined => {
  let tempKey = nodeKey;
  if (tempKey.includes(mapNodeParams.for)) {
    const forRegex = new RegExp(/\$for\([^)]+\)\//);
    tempKey = nodeKey.replace(forRegex, '');
  }
  if (schemaNode.key === tempKey) {
    return schemaNode;
  }

  let result: SchemaNodeExtended | undefined = undefined;
  schemaNode.children.forEach((childNode) => {
    // found this issue in test, children can be undefined? Ask Reid maybe
    const tempResult = findNodeForKey(tempKey, childNode);

    if (tempResult) {
      result = tempResult;
    }
  });

  return result;
};

// Search key will be the node's key
// Returns nodes that include the search key in their node.key (while maintaining the tree/schema's structure)
export const searchSchemaTreeFromRoot = (
  schemaTreeRoot: ITreeNode<SchemaNodeExtended>,
  flattenedSchema: SchemaNodeDictionary,
  nodeKeySearchTerm: string,
  filteredDataTypes: FilteredDataTypesDict
): ITreeNode<SchemaNodeExtended> => {
  const fuseSchemaTreeSearchOptions = {
    includeScore: true,
    minMatchCharLength: 2,
    includeMatches: true,
    threshold: 0.4,
    keys: ['fullName'],
  };

  // Fuzzy search against flattened schema tree to build a dictionary of matches
  const fuse = new Fuse(Object.values(flattenedSchema), fuseSchemaTreeSearchOptions);
  const matchedSchemaNodesDict: { [key: string]: true } = {};

  fuse.search(nodeKeySearchTerm).forEach((result) => {
    matchedSchemaNodesDict[result.item.key] = true;
  });

  // Recurse through schema tree, adding children that match the criteria
  const searchChildren = (result: ITreeNode<SchemaNodeExtended>[], node: ITreeNode<SchemaNodeExtended>) => {
    // NOTE: Type-cast (safely) node for second condition so Typescript sees all properties
    if (
      (nodeKeySearchTerm.length >= fuseSchemaTreeSearchOptions.minMatchCharLength ? matchedSchemaNodesDict[node.key] : true) &&
      (filteredDataTypes[(node as SchemaNodeExtended).normalizedDataType] ||
        ((node as SchemaNodeExtended).nodeProperties.includes(SchemaNodeProperty.Repeating) && filteredDataTypes[arrayType]))
    ) {
      result.push({ ...node });
    } else if (node.children && node.children.length > 0) {
      const childNodes = node.children.reduce(searchChildren, []);

      if (childNodes.length) {
        result.push({ ...node, isExpanded: true, children: childNodes } as ITreeNode<SchemaNodeExtended>);
      }
    }

    return result;
  };

  return {
    ...schemaTreeRoot,
    isExpanded: true,
    children: schemaTreeRoot.children ? schemaTreeRoot.children.reduce<ITreeNode<SchemaNodeExtended>[]>(searchChildren, []) : [],
  };
};

export const isSchemaNodeExtended = (node: SchemaNodeExtended | FunctionData): node is SchemaNodeExtended => 'pathToRoot' in node;

export const isObjectType = (nodeType: NormalizedDataType): boolean =>
  nodeType === NormalizedDataType.ComplexType || nodeType === NormalizedDataType.Object;
