import { SchemaTypes } from './components/configPanel/EditorConfigPanel';
import type { SchemaNodeExtended } from './models/Schema';
import type { Node as ReactFlowNode } from 'react-flow-renderer';
import { Position } from 'react-flow-renderer';

const inputX = 0;
const inputY = 0;
const inputYOffset = 60;

const rootOutputX = 500;
const rootOutputY = 0;
const childXOffSet = 30;
const childYOffset = 60;

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
        y: inputYOffset * index,
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
  const rootY = schemaType === SchemaTypes.Input ? inputY : rootOutputY;

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
        y: childYOffset * (index + 1),
      },
    });
  });

  return reactFlowNodes;
};
