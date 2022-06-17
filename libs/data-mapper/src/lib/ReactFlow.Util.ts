import type { SchemaNodeExtended } from './models/Schema';
import type { Node as ReactFlowNode } from 'react-flow-renderer';
import { Position } from 'react-flow-renderer';

const rootInputX = 0;
const rootInputY = 0;
const childInputX = rootInputX + 10;
const childInputYOffset = 50;

const rootOutputX = 200;
const rootOutputY = 0;
const childOutputX = rootOutputX + 10;
const childOutputYOffset = 50;

export const convertToReactFlowNode = (inputSchemaNode?: SchemaNodeExtended, outputSchemaNode?: SchemaNodeExtended): ReactFlowNode[] => {
  const reactFlowNodes: ReactFlowNode[] = [];

  if (inputSchemaNode) {
    reactFlowNodes.push({
      id: `input-${inputSchemaNode.key}`,
      data: {
        label: inputSchemaNode.name,
      },
      type: 'input',
      sourcePosition: Position.Right,
      position: {
        x: rootInputX,
        y: rootInputY,
      },
    });

    inputSchemaNode.children?.forEach((childNode, index) => {
      reactFlowNodes.push({
        id: `input-${childNode.key}`,
        data: {
          label: childNode.name,
        },
        type: 'input',
        sourcePosition: Position.Right,
        position: {
          x: childInputX,
          y: childInputYOffset * (index + 1),
        },
      });
    });
  }

  if (outputSchemaNode) {
    reactFlowNodes.push({
      id: `output-${outputSchemaNode.key}`,
      data: {
        label: outputSchemaNode.name,
      },
      type: 'output',
      targetPosition: Position.Left,
      position: {
        x: rootOutputX,
        y: rootOutputY,
      },
    });

    outputSchemaNode.children?.forEach((childNode, index) => {
      reactFlowNodes.push({
        id: `output-${childNode.key}`,
        data: {
          label: childNode.name,
        },
        type: 'output',
        targetPosition: Position.Left,
        position: {
          x: childOutputX,
          y: childOutputYOffset * (index + 1),
        },
      });
    });
  }

  return reactFlowNodes;
};
