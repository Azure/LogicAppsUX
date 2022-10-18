import type { FunctionCardProps } from '../components/nodeCard/FunctionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { childTargetNodeCardIndent, nodeCardWidth } from '../constants/NodeConstants';
import { ReactFlowEdgeType, ReactFlowNodeType, sourcePrefix, targetPrefix } from '../constants/ReactFlowConstants';
import type { Connection, ConnectionDictionary } from '../models/Connection';
import type { FunctionData, FunctionDictionary } from '../models/Function';
import type { ViewportCoords } from '../models/ReactFlow';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { flattenInputs, isConnectionUnit } from './Connection.Utils';
import { getFunctionBrandingForCategory } from './Function.Utils';
import { isLeafNode } from './Schema.Utils';
import { guid } from '@microsoft-logic-apps/utils';
import { useMemo } from 'react';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'reactflow';
import { Position } from 'reactflow';

const getViewportWidth = (endX: number, startX: number) => endX - startX;

const getInputX = (viewportCoords: ViewportCoords) => getViewportWidth(viewportCoords.endX, viewportCoords.startX) * 0.15;
const getRightOfInputs = (viewportCoords: ViewportCoords) => getInputX(viewportCoords) + nodeCardWidth;

const getFunctionX = (viewportCoords: ViewportCoords) =>
  (getRootOutputX(viewportCoords) - getRightOfInputs(viewportCoords)) / 2 + getRightOfInputs(viewportCoords);

// NOTE: Accounting for nodeCardWidth to get proper *expected/visual* positioning
const getRootOutputX = (viewportCoords: ViewportCoords) => (viewportCoords.endX - viewportCoords.startX) * 0.85 - nodeCardWidth;
const childXOffSet = childTargetNodeCardIndent;

const rootY = 30;
const rootYOffset = 60;

export const convertToReactFlowNodes = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<CardProps>[] => {
  const reactFlowNodes: ReactFlowNode<CardProps>[] = [];

  reactFlowNodes.push(
    ...convertSourceToReactFlowParentAndChildNodes(
      viewportCoords,
      currentlySelectedSourceNodes,
      connectedSourceNodes,
      allSourceNodes,
      connections
    ),
    ...convertTargetToReactFlowParentAndChildNodes(viewportCoords, targetSchemaNode, connections),
    ...convertFunctionsToReactFlowParentAndChildNodes(viewportCoords, allFunctionNodes)
  );

  return reactFlowNodes;
};

const convertSourceToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const combinedNodes = [
    ...connectedSourceNodes,
    ...currentlySelectedSourceNodes.filter((selectedNode) => {
      const existingNode = connectedSourceNodes.find((currentNode) => currentNode.key === selectedNode.key);
      return !existingNode;
    }),
  ];
  const flattenedKeys = Object.values(allSourceNodes).map((sourceNode) => sourceNode.key);
  combinedNodes.sort((nodeA, nodeB) =>
    nodeA.pathToRoot.length !== nodeB.pathToRoot.length
      ? nodeA.pathToRoot.length - nodeB.pathToRoot.length
      : flattenedKeys.indexOf(nodeA.key) - flattenedKeys.indexOf(nodeB.key)
  );

  combinedNodes.forEach((sourceNode) => {
    const relatedConnections = getConnectionsForNode(connections, sourceNode.key, SchemaTypes.Source);

    reactFlowNodes.push({
      id: `${sourcePrefix}${sourceNode.key}`,
      data: {
        schemaNode: sourceNode,
        schemaType: SchemaTypes.Source,
        displayHandle: true,
        displayChevron: true,
        isLeaf: true,
        isChild: false,
        disabled: false,
        error: false,
        relatedConnections: relatedConnections,
      },
      type: ReactFlowNodeType.SchemaNode,
      sourcePosition: Position.Right,
      position: {
        x: getInputX(viewportCoords),
        y: rootY + rootYOffset * reactFlowNodes.length,
      },
    });
  });

  return reactFlowNodes;
};

const convertTargetToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  targetSchemaNode: SchemaNodeExtended,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  return convertToReactFlowParentAndChildNodes(viewportCoords, targetSchemaNode, SchemaTypes.Target, true, connections);
};

export const convertToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaTypes,
  displayTargets: boolean,
  connections: ConnectionDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const rootX = schemaType === SchemaTypes.Source ? getInputX(viewportCoords) : getRootOutputX(viewportCoords);
  const idPrefix = schemaType === SchemaTypes.Source ? sourcePrefix : targetPrefix;
  const relatedConnections = getConnectionsForNode(connections, parentSchemaNode.key, SchemaTypes.Source);

  reactFlowNodes.push({
    id: `${idPrefix}${parentSchemaNode.key}`,
    data: {
      schemaNode: parentSchemaNode,
      schemaType,
      displayHandle: displayTargets,
      displayChevron: false,
      isLeaf: false,
      isChild: false,
      disabled: false,
      error: false,
      relatedConnections: relatedConnections,
    },
    type: ReactFlowNodeType.SchemaNode,
    targetPosition: !displayTargets ? undefined : SchemaTypes.Source ? Position.Right : Position.Left,
    position: {
      x: rootX,
      y: rootY,
    },
  });

  parentSchemaNode.children?.forEach((childNode) => {
    reactFlowNodes.push({
      id: `${idPrefix}${childNode.key}`,
      data: {
        schemaNode: childNode,
        schemaType,
        displayHandle: displayTargets,
        displayChevron: true,
        isLeaf: isLeafNode(childNode),
        isChild: true,
        disabled: false,
        error: false,
        relatedConnections: [],
      },
      type: ReactFlowNodeType.SchemaNode,
      targetPosition: !displayTargets ? undefined : SchemaTypes.Source ? Position.Right : Position.Left,
      position: {
        x: rootX + childXOffSet,
        y: rootY + rootYOffset * reactFlowNodes.length,
      },
    });
  });

  return reactFlowNodes;
};

const convertFunctionsToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  allFunctionNodes: FunctionDictionary
): ReactFlowNode<FunctionCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<FunctionCardProps>[] = [];

  Object.entries(allFunctionNodes).forEach(([functionKey, functionNode]) => {
    reactFlowNodes.push({
      id: functionKey,
      data: {
        functionName: functionNode.functionName,
        displayHandle: true,
        maxNumberOfInputs: functionNode.maxNumberOfInputs,
        inputs: functionNode.inputs,
        functionBranding: getFunctionBrandingForCategory(functionNode.category),
        disabled: false,
        error: false,
      },
      type: ReactFlowNodeType.FunctionNode,
      sourcePosition: Position.Right,
      position: {
        x: getFunctionX(viewportCoords),
        y: rootY + rootYOffset * reactFlowNodes.length,
      },
    });
  });

  return reactFlowNodes;
};

export const convertToReactFlowEdges = (connections: ConnectionDictionary, selectedItemKey: string | undefined): ReactFlowEdge[] => {
  return Object.values(connections).flatMap((connection) => {
    const nodeInputs = flattenInputs(connection.inputs).filter(isConnectionUnit);

    return nodeInputs.map((input) => {
      const id = createReactFlowConnectionId(input.reactFlowKey, connection.self.reactFlowKey);
      return {
        id,
        source: input.reactFlowKey,
        target: connection.self.reactFlowKey,
        type: ReactFlowEdgeType.ConnectionEdge,
        selected: selectedItemKey === id,
      };
    });
  });
};

export const useLayout = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  currentTargetNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary,
  selectedItemKey: string | undefined
): [ReactFlowNode[], ReactFlowEdge[]] => {
  const reactFlowNodes = useMemo(() => {
    if (currentTargetNode) {
      return convertToReactFlowNodes(
        viewportCoords,
        currentlySelectedSourceNodes,
        connectedSourceNodes,
        allSourceNodes,
        allFunctionNodes,
        currentTargetNode,
        connections
      );
    } else {
      return [];
    }
    // Explicitly ignoring connectedSourceNodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportCoords, currentlySelectedSourceNodes, currentTargetNode, allFunctionNodes]);

  const reactFlowEdges = useMemo(() => {
    return convertToReactFlowEdges(connections, selectedItemKey);
  }, [connections, selectedItemKey]);

  return [reactFlowNodes, reactFlowEdges];
};

const getConnectionsForNode = (connections: ConnectionDictionary, nodeKey: string, nodeType: SchemaTypes): Connection[] => {
  const relatedConnections: Connection[] = [];
  Object.keys(connections).forEach((key) => {
    if ((nodeType === SchemaTypes.Source && key.startsWith(nodeKey)) || (nodeType === SchemaTypes.Target && key.endsWith(nodeKey))) {
      relatedConnections.push(connections[key]);
    }
  });
  return relatedConnections;
};

export const createReactFlowFunctionKey = (functionData: FunctionData): string => `${functionData.key}-${guid()}`;

export const createReactFlowConnectionId = (sourceId: string, targetId: string): string => `${sourceId}-to-${targetId}`;

export const addReactFlowPrefix = (key: string, type: SchemaTypes) => `${type}-${key}`;
export const addSourceReactFlowPrefix = (key: string) => `${sourcePrefix}${key}`;
export const addTargetReactFlowPrefix = (key: string) => `${targetPrefix}${key}`;

export const getSourceIdFromReactFlowId = (reactFlowId: string): string => reactFlowId.split('-to-')[0];

export const getDestinationIdFromReactFlowId = (reactFlowId: string): string => reactFlowId.split('-to-')[1];
