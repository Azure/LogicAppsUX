import type { SchemaNode } from '../../models/Schema';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
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

export interface UpdateReactFlowAction {
  inputSchema?: SchemaNode;
  outputSchema?: SchemaNode;
}

export interface ReactFlowState {
  graph?: ReactFlowNode[];
}

export const initialReactFlowState: ReactFlowState = {
  graph: undefined,
};

export const reactFlowSlice = createSlice({
  name: 'reactFlow',
  initialState: initialReactFlowState,
  reducers: {
    updateReactFlowForSchema: (state, action: PayloadAction<UpdateReactFlowAction>) => {
      const { inputSchema, outputSchema } = action.payload;
      const newGraph = convertToReactFlowNode(inputSchema, outputSchema);

      state.graph = newGraph;
    },
  },
});

const convertToReactFlowNode = (inputSchemaNode?: SchemaNode, outputSchemaNode?: SchemaNode): ReactFlowNode[] => {
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

    inputSchemaNode.children.forEach((childNode, index) => {
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

    outputSchemaNode.children.forEach((childNode, index) => {
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

// Action creators are generated for each case reducer function
export const { updateReactFlowForSchema } = reactFlowSlice.actions;

export default reactFlowSlice.reducer;
