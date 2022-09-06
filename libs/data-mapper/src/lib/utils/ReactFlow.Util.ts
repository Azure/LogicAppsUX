import type { SchemaCardProps } from '../components/nodeCard/SchemaCard';
import type { ConnectionDictionary } from '../models/Connection';
import type { SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { isLeafNode } from './Schema.Utils';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import { ConnectionLineType, Position } from 'react-flow-renderer';

const inputX = 100;
const rootOutputX = 500;
const childXOffSet = 30;

const rootY = 30;
const rootYOffset = 60;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  ExpressionNode = 'expressionNode',
}

export const inputPrefix = 'input-';
export const outputPrefix = 'output-';

export const convertToReactFlowNodes = (
  currentlySelectedInputNodes: SchemaNodeExtended[],
  connectedInputNodes: SchemaNodeExtended[],
  outputSchemaNode: SchemaNodeExtended
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

  reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(outputSchemaNode, SchemaTypes.Output, true));

  return reactFlowNodes;
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

export const convertToReactFlowEdges = (connections: ConnectionDictionary): ReactFlowEdge[] => {
  return Object.keys(connections).map((connectionKey) => {
    const connection = connections[connectionKey];
    return {
      id: `${connection.value}-to-${connectionKey}`,
      source: connection.reactFlowSource,
      target: connection.reactFlowDestination,
      type: ConnectionLineType.SmoothStep,
    };
  });
};
