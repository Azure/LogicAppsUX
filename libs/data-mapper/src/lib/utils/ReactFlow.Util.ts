import type { ExpressionCardProps } from '../components/nodeCard/ExpressionCard';
import type { CardProps } from '../components/nodeCard/NodeCard';
import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import { childOutputNodeCardIndent, nodeCardWidth } from '../constants/NodeConstants';
import type { ConnectionDictionary } from '../models/Connection';
import type { ExpressionDictionary } from '../models/Expression';
import type { SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { getExpressionBrandingForCategory } from './Expression.Utils';
import { isLeafNode } from './Schema.Utils';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import { ConnectionLineType, Position } from 'react-flow-renderer';

const inputX = 400;
const rootOutputX = 1100;
const childXOffSet = childOutputNodeCardIndent;
const rightOfInputs = inputX + nodeCardWidth;
const expressionX = (rootOutputX - rightOfInputs) / 2 + rightOfInputs;

const rootY = 30;
const rootYOffset = 60;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  ExpressionNode = 'expressionNode',
}

export const inputPrefix = 'input-';
export const outputPrefix = 'output-';
export const expressionPrefix = 'ex-';

export const convertToReactFlowNodes = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[],
  allExpressionNodes: ExpressionDictionary,
  outputSchemaNode: SchemaNodeExtended
): ReactFlowNode<CardProps>[] => {
  const reactFlowNodes: ReactFlowNode<CardProps>[] = [];

  reactFlowNodes.push(
    ...convertInputToReactFlowParentAndChildNodes(currentlySelectedInputNodes, connectedInputNodes),
    ...convertOutputToReactFlowParentAndChildNodes(outputSchemaNode),
    ...convertExpressionsToReactFlowParentAndChildNodes(allExpressionNodes)
  );

  return reactFlowNodes;
};

const convertInputToReactFlowParentAndChildNodes = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[]
): ReactFlowNode<SchemaCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<SchemaCardProps>[] = [];

  connectedInputNodes.forEach((inputNode) => {
    reactFlowNodes.push({
      id: `${inputPrefix}${inputNode.key}`,
      data: {
        label: inputNode.name,
        schemaType: SchemaTypes.Input,
        displayHandle: true,
        isLeaf: true,
        isChild: false,
        nodeDataType: inputNode.schemaNodeDataType,
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

  currentlySelectedInputNodes.forEach((inputNode) => {
    const nodeId = `${inputPrefix}${inputNode.key}`;
    if (!reactFlowNodes.some((reactFlowNode) => reactFlowNode.id === nodeId)) {
      reactFlowNodes.push({
        id: nodeId,
        data: {
          label: inputNode.name,
          schemaType: SchemaTypes.Input,
          displayHandle: true,
          isLeaf: true,
          isChild: false,
          nodeDataType: inputNode.schemaNodeDataType,
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
    }
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
      label: parentSchemaNode.name,
      schemaType,
      displayHandle: displayTargets,
      isLeaf: false,
      isChild: false,
      nodeDataType: parentSchemaNode.schemaNodeDataType,
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
        label: childNode.name,
        schemaType,
        displayHandle: displayTargets,
        isLeaf: isLeafNode(childNode),
        isChild: true,
        nodeDataType: childNode.schemaNodeDataType,
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

const convertExpressionsToReactFlowParentAndChildNodes = (
  allExpressionNodes: ExpressionDictionary
): ReactFlowNode<ExpressionCardProps>[] => {
  const reactFlowNodes: ReactFlowNode<ExpressionCardProps>[] = [];

  Object.entries(allExpressionNodes).forEach(([expressionKey, expressionNode]) => {
    reactFlowNodes.push({
      id: expressionKey,
      data: {
        expressionName: expressionNode.name,
        displayHandle: true,
        numberOfInputs: expressionNode.numberOfInputs,
        inputs: expressionNode.inputs,
        expressionBranding: getExpressionBrandingForCategory(expressionNode.expressionCategory),
        disabled: false,
        error: false,
      },
      type: ReactFlowNodeType.ExpressionNode,
      sourcePosition: Position.Right,
      position: {
        x: expressionX,
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
