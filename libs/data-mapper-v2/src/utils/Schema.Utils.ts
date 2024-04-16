// import type { FilteredDataTypesDict } from '../components/tree/SchemaTreeSearchbar';
// import { arrayType } from '../components/tree/SchemaTreeSearchbar';
// import type { ITreeNode } from '../components/tree/Tree';
import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
//import { getLoopTargetNodeWithJson } from '../mapDefinitions';
import type { FunctionData } from '../models/Function';
import { LogCategory, LogService } from './Logging.Utils';
import type {
  PathItem,
  DataMapSchema,
  SchemaExtended,
  SchemaNode,
  SchemaNodeDictionary,
  SchemaNodeExtended,
} from '@microsoft/logic-apps-shared';
import { NormalizedDataType, SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';

export const convertSchemaToSchemaExtended = (schema: DataMapSchema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, undefined, []),
  };

  LogService.log(LogCategory.SchemaUtils, 'convertSchemaToSchemaExtended', {
    message: 'Schema converted',
    data: {
      schemaFileFormat: schema.type,
      largestNode: telemetryLargestNode(extendedSchema),
      deepestNodeChild: telemetryDeepestNodeChild(extendedSchema),
      totalNumberOfNodes: telemetrySchemaNodeCount(extendedSchema),
      roughSchemaSize: JSON.stringify(schema).length,
      roughExtendedSchemaSize: JSON.stringify(extendedSchema).length,
    },
  });

  return extendedSchema;
};

export const getFileNameAndPath = (fullPath: string): [string, string] => {
  const normalizedPath = fullPath.replaceAll(`\\`, '/');
  const lastIndexOfSlash = normalizedPath.lastIndexOf('/');
  const fileName = lastIndexOfSlash !== -1 ? normalizedPath.slice(lastIndexOfSlash + 1, normalizedPath.length + 1) : normalizedPath;
  const filePath = normalizedPath.slice(0, lastIndexOfSlash + 1);
  return [fileName, filePath];
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
      qName: schemaNode.qName,
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
    arrayItemIndex: nodeProperties.find((prop) => prop === SchemaNodeProperty.ArrayItem) ? 0 : undefined,
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

export const flattenSchemaNode = (schemaNode: SchemaNodeExtended): SchemaNodeExtended[] => {
  const result: SchemaNodeExtended[] = [schemaNode];
  const childArray = schemaNode.children.flatMap((childNode) => flattenSchemaNode(childNode));

  return result.concat(childArray);
};

export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean => schemaNode.children.length < 1;

/**
 * Finds a node for a key, searching within a given schema structure
 *
 * @param nodeKey The key to search for
 * @param schemaNode The root node search to search within
 * @param collapseLoopFallback Should the search attempt to collapse multiple loops into a single one
 * in order to find a a potential many-one situation.
 */
export const findNodeForKey = (
  nodeKey: string,
  schemaNode: SchemaNodeExtended,
  collapseLoopFallback: boolean
): SchemaNodeExtended | undefined => {
  let tempKey = nodeKey;
  if (tempKey.includes(mapNodeParams.for)) {
    const layeredArrayItemForRegex = new RegExp(/\$for\([^)]*(?:\/\*){2,}\)/g);
    tempKey = nodeKey.replaceAll(layeredArrayItemForRegex, '');

    const forRegex = new RegExp(/\$for\([^)]+\)/g);
    // ArrayItems will have an * instead of a key name
    // And that * is stripped out during serialization
    tempKey = tempKey.replaceAll(forRegex, nodeKey.indexOf('*') !== -1 ? '*' : '');

    while (tempKey.indexOf('//') !== -1) {
      tempKey = tempKey.replaceAll('//', '/');
    }
  }

  let result = searchChildrenNodeForKey(tempKey, schemaNode);

  if (!result) {
    //result = getLoopTargetNodeWithJson(tempKey, schemaNode) as SchemaNodeExtended | undefined;
  }

  if (result || !collapseLoopFallback) {
    return result;
  }

  let lastInstanceOfMultiLoop = tempKey.lastIndexOf('*/*');
  while (lastInstanceOfMultiLoop > -1 && !result) {
    const start = tempKey.substring(0, lastInstanceOfMultiLoop);
    const end = tempKey.substring(lastInstanceOfMultiLoop + 2);
    tempKey = start + end;

    result = searchChildrenNodeForKey(tempKey, schemaNode);
    lastInstanceOfMultiLoop = tempKey.lastIndexOf('*/*');
  }

  return result;
};

const searchChildrenNodeForKey = (key: string, schemaNode: SchemaNodeExtended): SchemaNodeExtended | undefined => {
  if (schemaNode.key === key) {
    return schemaNode;
  }

  let result: SchemaNodeExtended | undefined = undefined;
  schemaNode.children.forEach((childNode) => {
    const tempResult = searchChildrenNodeForKey(key, childNode);

    if (tempResult) {
      result = tempResult;
    }
  });

  return result;
};

// Search key will be the node's key
// Returns nodes that include the search key in their node.key (while maintaining the tree/schema's structure)
// export const searchSchemaTreeFromRoot = (
//   schemaTreeRoot: ITreeNode<SchemaNodeExtended>,
//   flattenedSchema: SchemaNodeDictionary,
//   nodeKeySearchTerm: string,
//   filteredDataTypes: FilteredDataTypesDict
// ): ITreeNode<SchemaNodeExtended> => {
//   const fuseSchemaTreeSearchOptions = {
//     includeScore: true,
//     minMatchCharLength: 2,
//     includeMatches: true,
//     threshold: 0.4,
//     keys: ['qName'],
//   };

//   // Fuzzy search against flattened schema tree to build a dictionary of matches
//   const fuse = new Fuse(Object.values(flattenedSchema), fuseSchemaTreeSearchOptions);
//   const matchedSchemaNodesDict: { [key: string]: true } = {};

//   fuse.search(nodeKeySearchTerm).forEach((result) => {
//     matchedSchemaNodesDict[result.item.key] = true;
//   });

//   // Recurse through schema tree, adding children that match the criteria
//   const searchChildren = (result: ITreeNode<SchemaNodeExtended>[], node: ITreeNode<SchemaNodeExtended>) => {
//     // NOTE: Type-cast (safely) node for second condition so Typescript sees all properties
//     if (
//       (nodeKeySearchTerm.length >= fuseSchemaTreeSearchOptions.minMatchCharLength ? matchedSchemaNodesDict[node.key] : true) &&
//       (filteredDataTypes[(node as SchemaNodeExtended).type] ||
//         ((node as SchemaNodeExtended).nodeProperties.includes(SchemaNodeProperty.Repeating) && filteredDataTypes[arrayType]))
//     ) {
//       result.push({ ...node });
//     } else if (node.children && node.children.length > 0) {
//       const childNodes = node.children.reduce(searchChildren, []);

//       if (childNodes.length) {
//         result.push({ ...node, isExpanded: true, children: childNodes } as ITreeNode<SchemaNodeExtended>);
//       }
//     }

//     return result;
//   };

//   return {
//     ...schemaTreeRoot,
//     isExpanded: true,
//     children: schemaTreeRoot.children ? schemaTreeRoot.children.reduce<ITreeNode<SchemaNodeExtended>[]>(searchChildren, []) : [],
//   };
// };

export const isSchemaNodeExtended = (node: SchemaNodeExtended | FunctionData): node is SchemaNodeExtended => 'pathToRoot' in node;

export const isObjectType = (nodeType: NormalizedDataType): boolean =>
  nodeType === NormalizedDataType.Complex || nodeType === NormalizedDataType.Object;

export const telemetryLargestNode = (schema: SchemaExtended): number => {
  return Math.max(...maxProperties(schema.schemaTreeRoot));
};

const maxProperties = (schemaNode: SchemaNodeExtended): number[] => {
  return [schemaNode.children.length, ...schemaNode.children.flatMap((childNode) => maxProperties(childNode))];
};

export const telemetryDeepestNodeChild = (schema: SchemaExtended): number => {
  return Math.max(...deepestNode(schema.schemaTreeRoot));
};

const deepestNode = (schemaNode: SchemaNodeExtended): number[] => {
  return [schemaNode.pathToRoot.length, ...schemaNode.children.flatMap((childNode) => maxProperties(childNode))];
};

export const telemetrySchemaNodeCount = (schema: SchemaExtended): number => {
  return nodeCount(schema.schemaTreeRoot);
};

const nodeCount = (schemaNode: SchemaNodeExtended): number => {
  let result = 1;
  schemaNode.children.forEach((childNode) => {
    result = result + nodeCount(childNode);
  });

  return result;
};
