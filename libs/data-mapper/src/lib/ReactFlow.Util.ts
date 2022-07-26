import { SchemaTypes } from './components/configPanel/EditorConfigPanel';
import type { SchemaNodeExtended } from './models/Schema';
import type { Node as ReactFlowNode } from 'react-flow-renderer';
import { Position } from 'react-flow-renderer';

const rootInputX = 0;
const rootInputY = 0;
const childInputX = rootInputX + 30;
const childInputYOffset = 60;

const rootOutputX = 500;
const rootOutputY = 0;
const childOutputX = rootOutputX + 30;
const childOutputYOffset = 60;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  ExpressionNode = 'expressionNode',
}

export const convertToReactFlowNode = (inputSchemaNode?: SchemaNodeExtended, outputSchemaNode?: SchemaNodeExtended): ReactFlowNode[] => {
  const reactFlowNodes: ReactFlowNode[] = [];

  if (inputSchemaNode) {
    reactFlowNodes.push({
      id: `input-${inputSchemaNode.key}`,
      data: {
        label: inputSchemaNode.name,
        schemaType: SchemaTypes.Input,
      },
      sourcePosition: Position.Right,
      type: ReactFlowNodeType.SchemaNode,
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
          schemaType: SchemaTypes.Input,
        },
        type: ReactFlowNodeType.SchemaNode,
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
        schemaType: SchemaTypes.Output,
      },
      type: ReactFlowNodeType.SchemaNode,
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
          schemaType: SchemaTypes.Output,
        },
        type: ReactFlowNodeType.SchemaNode,
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
