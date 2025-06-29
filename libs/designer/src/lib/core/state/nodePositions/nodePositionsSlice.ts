import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodePositionsState {
  manualPositions: Record<string, NodePosition>;
  isManualMode: boolean;
}

const initialState: NodePositionsState = {
  manualPositions: {},
  isManualMode: false,
};

export const nodePositionsSlice = createSlice({
  name: 'nodePositions',
  initialState,
  reducers: {
    clearManualPositions: (state) => {
      state.manualPositions = {};
      state.isManualMode = false;
    },
    setNodePositionOnDragStop: (state, action: PayloadAction<{ nodeId: string; position: NodePosition }>) => {
      const { nodeId, position } = action.payload;
      state.manualPositions[nodeId] = position;
      // Don't automatically set manual mode on drag
    },
    toggleManualMode: (state) => {
      state.isManualMode = !state.isManualMode;
      // Clear positions when switching back to layout mode
      if (!state.isManualMode) {
        state.manualPositions = {};
      }
    },
  },
});

export const { clearManualPositions, setNodePositionOnDragStop, toggleManualMode } = nodePositionsSlice.actions;

export default nodePositionsSlice.reducer;
