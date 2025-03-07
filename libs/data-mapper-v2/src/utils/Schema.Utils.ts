import { mapNodeParams } from '../constants/MapDefinitionConstants';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData } from '../models/Function';
import { LogCategory } from './Logging.Utils';
import type {
  PathItem,
  DataMapSchema,
  SchemaExtended,
  SchemaNode,
  SchemaNodeDictionary,
  SchemaNodeExtended,
} from '@microsoft/logic-apps-shared';
import {
  guid,
  guidLength,
  isAGuid,
  LogEntryLevel,
  LoggerService,
  NormalizedDataType,
  SchemaNodeProperty,
  SchemaType,
} from '@microsoft/logic-apps-shared';
import { addReactFlowPrefix } from './ReactFlow.Util';
import type { Node } from '@xyflow/react';

export const getReactFlowNodeId = (key: string, isLeftDirection: boolean) =>
  addReactFlowPrefix(key, isLeftDirection ? SchemaType.Source : SchemaType.Target);

export const convertSchemaToSchemaExtended = (schema: DataMapSchema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, undefined, []),
  };

  LoggerService().log({
    level: LogEntryLevel.Verbose,
    area: `${LogCategory.SchemaUtils}/convertSchemaToSchemaExtended`,
    message: 'Schema converted',
    args: [
      {
        schemaName: schema.name,
        schemaFileFormat: schema.type,
        largestNode: telemetryLargestNode(extendedSchema),
        deepestNodeChild: telemetryDeepestNodeChild(extendedSchema),
        totalNumberOfNodes: telemetrySchemaNodeCount(extendedSchema),
        roughSchemaSize: JSON.stringify(schema).length,
        roughExtendedSchemaSize: JSON.stringify(extendedSchema).length,
      },
    ],
  });

  return extendedSchema;
};

export const getFileNameAndPath = (fullPath: string): [string, string] => {
  const normalizedPath = fullPath.replaceAll('\\', '/');
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

export const flattenSchemaNodeMap = (schemaNode: SchemaNodeExtended): Record<string, SchemaNodeExtended> => {
  const flattenedSchema = flattenSchemaNode(schemaNode);
  const result: Record<string, SchemaNodeExtended> = {};
  for (const node of flattenedSchema) {
    result[node.key] = node;
  }
  return result;
};

export const isLeafNode = (schemaNode: SchemaNodeExtended): boolean => schemaNode.children.length < 1;

export const removeGuidFromKey = (key: string) => {
  return isAGuid(key.substring(0, guidLength)) ? key.substring(guidLength + 1) : key;
};

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
  let tempKey = removeGuidFromKey(nodeKey);

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

export const isSchemaNodeExtended = (node: SchemaNodeExtended | FunctionData): node is SchemaNodeExtended =>
  Object.keys(node ?? {}).includes('pathToRoot');

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

export const removePrefixFromNodeID = (nodeID: string): string => {
  const splitID = nodeID.split('-');
  return splitID[1];
};

export const nodeScrollDirections = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type NodeScrollDirectionType = (typeof nodeScrollDirections)[number];

/**
 *
 * @returns Need to return 4 nodes, one each for top-left, top-right, bottom-left, bottom-right
 */
export const getNodesForScroll = (): Record<string, Node> => {
  const map: Record<string, Node> = {};
  const ids = [`top-left-${guid()}`, `top-right-${guid()}`, `bottom-left-${guid()}`, `bottom-right-${guid()}`];
  for (const id of ids) {
    map[id] = {
      id,
      hidden: false,
      selectable: false,
      draggable: false,
      position: { x: 0, y: 0 },
      data: {
        isTemporary: true,
      },
      type: 'canvasNode',
    };
  }
  return map;
};

export const getNodeIdForScroll = (ids: string[], direction: NodeScrollDirectionType) => {
  return ids.find((id) => id.startsWith(direction));
};
