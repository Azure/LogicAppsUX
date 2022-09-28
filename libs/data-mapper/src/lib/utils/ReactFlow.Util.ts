import type { FunctionCardProps } from '../components/nodeCard/FunctionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { childTargetNodeCardIndent, nodeCardWidth } from '../constants/NodeConstants';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import type { ViewportCoords } from '../models/ReactFlow';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { getFunctionBrandingForCategory } from './Function.Utils';
import { isLeafNode } from './Schema.Utils';
import { useMemo } from 'react';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import { ConnectionLineType, Position } from 'react-flow-renderer';

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

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  FunctionNode = 'functionNode',
}

export const sourcePrefix = 'source-';
export const targetPrefix = 'target-';
export const functionPrefix = 'function-';

export const convertToReactFlowNodes = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  targetSchemaNode: SchemaNodeExtended
): ReactFlowNode<CardProps>[] => {
  const reactFlowNodes: ReactFlowNode<CardProps>[] = [];

  reactFlowNodes.push(
    ...convertInputToReactFlowParentAndChildNodes(viewportCoords, currentlySelectedSourceNodes, connectedSourceNodes, allSourceNodes),
    ...convertOutputToReactFlowParentAndChildNodes(viewportCoords, targetSchemaNode),
    ...convertFunctionsToReactFlowParentAndChildNodes(viewportCoords, allFunctionNodes)
  );

  return reactFlowNodes;
};

const convertInputToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary
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
    reactFlowNodes.push({
      id: `${sourcePrefix}${sourceNode.key}`,
      data: {
        schemaNode: sourceNode,
        schemaType: SchemaTypes.Source,
        displayHandle: true,
        isLeaf: true,
        isChild: false,
        disabled: false,
        error: false,
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

const convertOutputToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  targetSchemaNode: SchemaNodeExtended
): ReactFlowNode<SchemaCardProps>[] => {
  return convertToReactFlowParentAndChildNodes(viewportCoords, targetSchemaNode, SchemaTypes.Target, true);
};

export const convertToReactFlowParentAndChildNodes = (
  viewportCoords: ViewportCoords,
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaTypes,
  displayTargets: boolean
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const rootX = schemaType === SchemaTypes.Source ? getInputX(viewportCoords) : getRootOutputX(viewportCoords);
  const idPrefix = schemaType === SchemaTypes.Source ? sourcePrefix : targetPrefix;

  reactFlowNodes.push({
    id: `${idPrefix}${parentSchemaNode.key}`,
    data: {
      schemaNode: parentSchemaNode,
      schemaType,
      displayHandle: displayTargets,
      isLeaf: false,
      isChild: false,
      disabled: false,
      error: false,
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
        isLeaf: isLeafNode(childNode),
        isChild: true,
        disabled: false,
        error: false,
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
        functionName: functionNode.name,
        displayHandle: true,
        numberOfInputs: functionNode.numberOfInputs,
        inputs: functionNode.inputs,
        functionBranding: getFunctionBrandingForCategory(functionNode.functionCategory),
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

export const convertToReactFlowEdges = (connections: ConnectionDictionary): ReactFlowEdge[] => {
  return Object.entries(connections).map(([connectionKey, connection]) => {
    return {
      id: connectionKey,
      source: connection.reactFlowSource,
      target: connection.reactFlowDestination,
      type: ConnectionLineType.SmoothStep,
      selected: connection.isSelected,
    };
  });
};

export const useLayout = (
  viewportCoords: ViewportCoords,
  currentlySelectedSourceNodes: SchemaNodeExtended[],
  connectedSourceNodes: SchemaNodeExtended[],
  allSourceNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  currentTargetNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary
): [ReactFlowNode[], ReactFlowEdge[]] => {
  const reactFlowNodes = useMemo(() => {
    if (currentTargetNode) {
      return convertToReactFlowNodes(
        viewportCoords,
        currentlySelectedSourceNodes,
        connectedSourceNodes,
        allSourceNodes,
        allFunctionNodes,
        currentTargetNode
      );
    } else {
      return [];
    }
    // Explicitly ignoring connectedSourceNodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportCoords, currentlySelectedSourceNodes, currentTargetNode, allFunctionNodes]);

  const reactFlowEdges = useMemo(() => {
    return convertToReactFlowEdges(connections);
  }, [connections]);

  return [reactFlowNodes, reactFlowEdges];
};
