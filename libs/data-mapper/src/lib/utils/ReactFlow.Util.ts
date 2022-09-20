import type { FunctionCardProps } from '../components/nodeCard/FunctionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { childOutputNodeCardIndent, nodeCardWidth } from '../constants/NodeConstants';
import type { ConnectionDictionary } from '../models/Connection';
import type { FunctionDictionary } from '../models/Function';
import type { SchemaNodeDictionary, SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { getFunctionBrandingForCategory } from './Function.Utils';
import { isLeafNode } from './Schema.Utils';
import { useMemo } from 'react';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import { ConnectionLineType, Position } from 'react-flow-renderer';

const inputX = 400;
const rootOutputX = 1100;
const childXOffSet = childOutputNodeCardIndent;
const rightOfInputs = inputX + nodeCardWidth;
const functionX = (rootOutputX - rightOfInputs) / 2 + rightOfInputs;

const rootY = 30;
const rootYOffset = 60;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  FunctionNode = 'functionNode',
}

export const inputPrefix = 'input-';
export const outputPrefix = 'output-';
export const functionPrefix = 'function-';

export const convertToReactFlowNodes = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[],
  allInputNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  outputSchemaNode: SchemaNodeExtended
): ReactFlowNode<CardProps>[] => {
  const reactFlowNodes: ReactFlowNode<CardProps>[] = [];

  reactFlowNodes.push(
    ...convertInputToReactFlowParentAndChildNodes(currentlySelectedInputNodes, connectedInputNodes, allInputNodes),
    ...convertOutputToReactFlowParentAndChildNodes(outputSchemaNode),
    ...convertFunctionsToReactFlowParentAndChildNodes(allFunctionNodes)
  );

  return reactFlowNodes;
};

const convertInputToReactFlowParentAndChildNodes = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[],
  allInputNodes: SchemaNodeDictionary
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

  const combinedNodes = [
    ...connectedInputNodes,
    ...currentlySelectedInputNodes.filter((selectedNode) => {
      const existingNode = connectedInputNodes.find((currentNode) => currentNode.key === selectedNode.key);
      return !existingNode;
    }),
  ];
  const flattenedKeys = Object.values(allInputNodes).map((inputNode) => inputNode.key);
  combinedNodes.sort((nodeA, nodeB) =>
    nodeA.pathToRoot.length !== nodeB.pathToRoot.length
      ? nodeA.pathToRoot.length - nodeB.pathToRoot.length
      : flattenedKeys.indexOf(nodeA.key) - flattenedKeys.indexOf(nodeB.key)
  );

  combinedNodes.forEach((inputNode) => {
    reactFlowNodes.push({
      id: `${inputPrefix}${inputNode.key}`,
      data: {
        schemaNode: inputNode,
        schemaType: SchemaTypes.Input,
        displayHandle: true,
        isLeaf: true,
        isChild: false,
        disabled: false,
        error: false,
      },
      type: ReactFlowNodeType.SchemaNode,
      sourcePosition: Position.Right,
      position: {
        x: inputX,
        y: rootY + rootYOffset * reactFlowNodes.length,
      },
    });
  });

  return reactFlowNodes;
};

const convertOutputToReactFlowParentAndChildNodes = (outputSchemaNode: SchemaNodeExtended): ReactFlowNode<SchemaCardProps>[] => {
  return convertToReactFlowParentAndChildNodes(outputSchemaNode, SchemaTypes.Output, true);
};

export const convertToReactFlowParentAndChildNodes = (
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaTypes,
  displayTargets: boolean
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];
  const rootX = schemaType === SchemaTypes.Input ? inputX : rootOutputX;
  const idPrefix = schemaType === SchemaTypes.Input ? inputPrefix : outputPrefix;

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
    targetPosition: !displayTargets ? undefined : SchemaTypes.Input ? Position.Right : Position.Left,
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
      targetPosition: !displayTargets ? undefined : SchemaTypes.Input ? Position.Right : Position.Left,
      position: {
        x: rootX + childXOffSet,
        y: rootY + rootYOffset * reactFlowNodes.length,
      },
    });
  });

  return reactFlowNodes;
};

const convertFunctionsToReactFlowParentAndChildNodes = (allFunctionNodes: FunctionDictionary): ReactFlowNode<FunctionCardProps>[] => {
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
        x: functionX,
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
    };
  });
};

export const useLayout = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[],
  allInputNodes: SchemaNodeDictionary,
  allFunctionNodes: FunctionDictionary,
  currentOutputNode: SchemaNodeExtended | undefined,
  connections: ConnectionDictionary
): [ReactFlowNode[], ReactFlowEdge[]] => {
  const reactFlowNodes = useMemo(() => {
    if (currentOutputNode) {
      return convertToReactFlowNodes(currentlySelectedInputNodes, connectedInputNodes, allInputNodes, allFunctionNodes, currentOutputNode);
    } else {
      return [];
    }
    // Explicitly ignoring connectedInputNodes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentlySelectedInputNodes, currentOutputNode, allFunctionNodes]);

  const reactFlowEdges = useMemo(() => {
    return convertToReactFlowEdges(connections);
  }, [connections]);

  return [reactFlowNodes, reactFlowEdges];
};
