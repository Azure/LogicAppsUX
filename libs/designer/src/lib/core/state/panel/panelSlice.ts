import { resetWorkflowState } from '../global';
import type { RelationshipIds, PanelState, PanelMode } from './panelInterfaces';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { PanelLocation } from '@microsoft/designer-ui';
import { cleanConnectorId } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: PanelState = {
  collapsed: true,
  selectedNodes: [],
  relationshipIds: {
    graphId: 'root',
  },
  panelLocation: PanelLocation.Right,
  isParallelBranch: false,
  selectedTabId: undefined,
  selectedOperationGroupId: '',
  selectedOperationId: '',
  addingTrigger: false,
  creatingConnection: false,
  currentPanelMode: undefined,
  referencePanelMode: undefined,
  selectedErrorsPanelTabId: undefined,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    expandPanel: (state) => {
      state.collapsed = false;
    },
    collapsePanel: (state) => {
      state.collapsed = true;
      state.selectedOperationGroupId = '';
      state.addingTrigger = false;
    },
    clearPanel: (state) => {
      state.collapsed = true;
      state.currentPanelMode = undefined;
      state.referencePanelMode = undefined;
      state.selectedNodes = [];
      state.selectedOperationGroupId = '';
      state.addingTrigger = false;
      state.creatingConnection = false;
      state.selectedTabId = undefined;
      state.selectedErrorsPanelTabId = undefined;
    },
    updatePanelLocation: (state, action: PayloadAction<PanelLocation | undefined>) => {
      if (action.payload && action.payload !== state.panelLocation) {
        state.panelLocation = action.payload;
      }
    },
    setSelectedNodeId: (state, action: PayloadAction<string>) => {
      state.selectedNodes = [action.payload];
    },
    setSelectedNodeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedNodes = action.payload;
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) return;
      clearPanel();
      if (state.collapsed) state.collapsed = false;
      state.selectedNodes = [action.payload];
      state.currentPanelMode = 'Operation';
      state.selectedTabId = undefined;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    expandDiscoveryPanel: (
      state,
      action: PayloadAction<{
        relationshipIds: RelationshipIds;
        nodeId: string;
        isParallelBranch?: boolean;
        focusReturnElementId?: string;
        addingTrigger?: boolean;
      }>
    ) => {
      state.collapsed = false;
      state.currentPanelMode = 'Discovery';
      state.relationshipIds = action.payload.relationshipIds;
      state.selectedNodes = [action.payload.nodeId];
      state.isParallelBranch = action.payload?.isParallelBranch ?? false;
      state.addingTrigger = !!action.payload?.addingTrigger;
      state.focusReturnElementId = action.payload.focusReturnElementId;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationGroupId: (state, action: PayloadAction<string>) => {
      state.selectedOperationGroupId = cleanConnectorId(action.payload);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationId: (state, action: PayloadAction<string>) => {
      state.selectedOperationId = action.payload;
    },
    openPanel: (
      state,
      action: PayloadAction<{
        nodeId?: string;
        nodeIds?: string[];
        panelMode: PanelMode;
        referencePanelMode?: PanelMode;
        focusReturnElementId?: string;
      }>
    ) => {
      const { nodeId, nodeIds, panelMode, referencePanelMode } = action?.payload ?? {};
      clearPanel();
      state.collapsed = false;
      state.currentPanelMode = panelMode;
      state.referencePanelMode = referencePanelMode;
      state.selectedNodes = nodeIds ? nodeIds : nodeId ? [nodeId] : [];
      state.focusReturnElementId = action?.payload.focusReturnElementId;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    setIsPanelLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsCreatingConnection: (state, action: PayloadAction<boolean>) => {
      state.creatingConnection = action.payload;
    },
    selectErrorsPanelTab: (state, action: PayloadAction<string>) => {
      state.selectedErrorsPanelTabId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

// Action creators are generated for each case reducer function
export const {
  expandPanel,
  collapsePanel,
  clearPanel,
  updatePanelLocation,
  setSelectedNodeId,
  setSelectedNodeIds,
  changePanelNode,
  expandDiscoveryPanel,
  selectOperationGroupId,
  selectOperationId,
  openPanel,
  selectPanelTab,
  setIsPanelLoading,
  setIsCreatingConnection,
  selectErrorsPanelTab,
} = panelSlice.actions;

export default panelSlice.reducer;
