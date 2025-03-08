import { guid, type SchemaType, type SchemaNodeDictionary } from '@microsoft/logic-apps-shared';
import { sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { FunctionData, FunctionDictionary } from 'models';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import { generateInputHandleId, isNodeConnection } from './Connection.Utils';
import { isFunctionData } from './Function.Utils';
import { nodeScrollDirections } from './Schema.Utils';
import { UnboundedInput } from '../constants/FunctionConstants';

export const panelWidth = 315;
export const panelWidthWithoutHandles = 300;
export const addReactFlowPrefix = (key: string, type: SchemaType) => `${type}-${key}`;
export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;
export const isSourceNode = (key: string) => key.startsWith(sourcePrefix);
export const isTargetNode = (key: string) => key.startsWith(targetPrefix);
export const isIntermediateNode = (key: string) => [...nodeScrollDirections].findIndex((direction) => key.startsWith(direction)) >= 0;
export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;
export const isFunctionNode = (key: string): boolean => !isSourceNode(key) && !isTargetNode(key) && !isIntermediateNode(key);
export const getTreeNodeId = (key: string) =>
  isSourceNode(key) ? key.substring(sourcePrefix.length) : isTargetNode(key) ? key.substring(targetPrefix.length) : key;

const rootLayoutNodeId = 'root';
export const LayoutContainer = {
  SourceSchema: 'sourceSchemaBlock',
  Functions: 'functionsBlock',
  TargetSchema: 'targetSchemaBlock',
} as const;
type LayoutContainer = (typeof LayoutContainer)[keyof typeof LayoutContainer];

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  labels: string[];
  isRepeating: boolean;
}

export interface LayoutNode {
  id: string;
  x?: number;
  y?: number;
  children?: LayoutNode[];
}

export interface ContainerLayoutNode {
  id: LayoutContainer;
  children: LayoutNode[];
}

export interface RootLayoutNode {
  id: typeof rootLayoutNodeId;
  children: ContainerLayoutNode[];
  edges: LayoutEdge[];
  width?: number;
  height?: number;
}

export interface ReactFlowIdParts {
  sourceId: string;
  destinationId: string | undefined;
  portId: string | undefined;
}

export const reactFlowConnectionIdSeparator = '-to-';
export const reactFlowConnectionPortSeparator = '-port-';

export const getSplitIdsFromReactFlowConnectionId = (reactFlowId: string): ReactFlowIdParts => {
  const sourceDestSplit = reactFlowId.split(reactFlowConnectionIdSeparator);
  const destPortSplit = sourceDestSplit.length > 1 ? sourceDestSplit[1].split(reactFlowConnectionPortSeparator) : [undefined, undefined];

  return {
    sourceId: sourceDestSplit[0],
    destinationId: destPortSplit[0],
    portId: destPortSplit[1],
  };
};

const createReactFlowEdgeLabels = (connection: Connection, inputIndex: number): string[] => {
  let labels: string[] = [];
  if (isFunctionData(connection.self.node) && connection.self?.node?.inputs?.length > inputIndex) {
    // only function nodes need labels for their multiple inputs
    if (connection.self.node.maxNumberOfInputs > UnboundedInput) {
      labels = [connection.self.node.inputs[inputIndex].name];
    } else {
      labels = [generateInputHandleId(connection.self.node.inputs[0].name, inputIndex)]; // if unlimited inputs, the name is always the same
    }
  }
  return labels;
};

export const convertWholeDataMapToLayoutTree = (
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  functionNodes: FunctionDictionary,
  connections: ConnectionDictionary
): RootLayoutNode => {
  let nextEdgeIndex = 0;
  const layoutEdges: LayoutEdge[] = [];

  // loops through all connections and adds if not a custom value
  Object.values(connections).forEach((connection) => {
    connection.inputs.forEach((input, inputIndex) => {
      if (isNodeConnection(input)) {
        const targetId = connection.self.reactFlowKey;
        const labels = createReactFlowEdgeLabels(connection, inputIndex);
        const nextEdge: LayoutEdge = {
          id: `e${nextEdgeIndex}`,
          sourceId: input.reactFlowKey,
          targetId,
          labels,
          isRepeating: input.isRepeating ?? false,
        };

        layoutEdges.push(nextEdge);
        nextEdgeIndex += 1;
      }
    });
  });

  const layoutTree: RootLayoutNode = {
    id: rootLayoutNodeId,
    children: [
      {
        id: LayoutContainer.SourceSchema,
        children: Object.values(flattenedSourceSchema).map((srcNode) => ({
          id: addSourceReactFlowPrefix(srcNode.key),
        })),
      },
      {
        id: LayoutContainer.Functions,
        children: Object.keys(functionNodes).map((fnNodeKey) => ({
          id: fnNodeKey,
        })),
      },
      {
        id: LayoutContainer.TargetSchema,
        children: Object.values(flattenedTargetSchema).map((tgtNode) => ({
          id: addTargetReactFlowPrefix(tgtNode.key),
        })),
      },
    ],
    edges: layoutEdges,
  };

  return layoutTree;
};
