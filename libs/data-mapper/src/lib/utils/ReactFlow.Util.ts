import type { ConnectionDictionary } from '../models/Connection';
import type { SchemaNodeExtended } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
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

export const InputPrefix = 'input-';
export const OutputPrefix = 'output-';

export const convertToReactFlowNodes = (inputSchemaNodes: SchemaNodeExtended[], outputSchemaNode: SchemaNodeExtended): ReactFlowNode[] => {
  const reactFlowNodes: ReactFlowNode[] = [];

  inputSchemaNodes.forEach((inputNodes, index) => {
    reactFlowNodes.push({
      id: `${InputPrefix}${inputNodes.key}`,
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
  const idPrefix = schemaType === SchemaTypes.Input ? InputPrefix : OutputPrefix;

  reactFlowNodes.push({
    id: `${idPrefix}${parentSchemaNode.key}`,
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
      id: `${idPrefix}${childNode.key}`,
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
