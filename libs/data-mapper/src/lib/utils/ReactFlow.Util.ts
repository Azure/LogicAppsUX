import type { SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'react-flow-renderer';
import { Position } from 'react-flow-renderer';

const inputX = 100;
const rootOutputX = 500;
const childXOffSet = 30;

const rootY = 30;
const rootYOffset = 60;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  ExpressionNode = 'expressionNode',
}

export const convertToReactFlowNodes = (inputSchemaNodes: SchemaNodeExtended[], outputSchemaNode: SchemaNodeExtended): ReactFlowNode[] => {
  const reactFlowNodes: ReactFlowNode[] = [];

  inputSchemaNodes.forEach((inputNodes, index) => {
    reactFlowNodes.push({
      id: `input-${inputNodes.key}`,
      data: {
        label: inputNodes.name,
        schemaType: SchemaTypes.Input,
        displayHandle: true,
      },
      type: ReactFlowNodeType.SchemaNode,
      sourcePosition: Position.Right,
      position: {
        x: inputX,
        y: rootY + rootYOffset * index,
      },
    });
  });

  reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(outputSchemaNode, SchemaTypes.Output, true));

  return reactFlowNodes;
};

export const convertToReactFlowParentAndChildNodes = (
  parentSchemaNode: SchemaNodeExtended,
  schemaType: SchemaTypes,
  displayTargets: boolean
): ReactFlowNode[] => {
  const reactFlowNodes: ReactFlowNode[] = [];
  const rootX = schemaType === SchemaTypes.Input ? inputX : rootOutputX;

  reactFlowNodes.push({
    id: `${schemaType}-${parentSchemaNode.key}`,
    data: {
      label: parentSchemaNode.name,
      schemaType,
      displayHandle: displayTargets,
    },
    type: ReactFlowNodeType.SchemaNode,
    targetPosition: !displayTargets ? undefined : SchemaTypes.Input ? Position.Right : Position.Left,
    position: {
      x: rootX,
      y: rootY,
    },
  });

  parentSchemaNode.children?.forEach((childNode, index) => {
    reactFlowNodes.push({
      id: `${schemaType}-${childNode.key}`,
      data: {
        label: childNode.name,
        schemaType,
        displayHandle: displayTargets,
      },
      type: ReactFlowNodeType.SchemaNode,
      targetPosition: !displayTargets ? undefined : SchemaTypes.Input ? Position.Right : Position.Left,
      position: {
        x: rootX + childXOffSet,
        y: rootY + rootYOffset * (index + 1),
      },
    });
  });

  return reactFlowNodes;
};

export const convertToReactFlowEdges = (connections: { [key: string]: string }): ReactFlowEdge[] => {
  return Object.keys(connections).map((connectionKey) => {
    const connection = connections[connectionKey];
    return {
      id: `${connection}-to-${connectionKey}`,
      source: connection,
      target: connectionKey,
    };
  });
};
