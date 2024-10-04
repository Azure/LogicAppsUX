import { PanelLocation } from '@microsoft/designer-ui';
import { cleanConnectorId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type {
  ConnectionPanelContentState,
  DiscoveryPanelContentState,
  ErrorPanelContentState,
  NodeSearchPanelContentState,
  OperationPanelContentState,
  PanelMode,
  PanelState,
  RelationshipIds,
  WorkflowParametersPanelContentState,
} from './panelTypes';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';

const getInitialConnectionContentState = (): ConnectionPanelContentState => ({
  isCreatingConnection: false,
  panelMode: 'Connection',
  selectedNodeIds: [],
});

const getInitialDiscoveryContentState = (): DiscoveryPanelContentState => ({
  isAddingTrigger: false,
  isParallelBranch: false,
  panelMode: 'Discovery',
  relationshipIds: {
    graphId: 'root',
  },
  selectedNodeIds: [],
  selectedOperationGroupId: '',
  selectedOperationId: '',
});

const getInitialErrorContentState = (): ErrorPanelContentState => ({
  panelMode: 'Error',
});

const getInitialNodeSearchContentState = (): NodeSearchPanelContentState => ({
  panelMode: 'NodeSearch',
});

const getInitialOperationContentState = (): OperationPanelContentState => ({
  panelMode: 'Operation',
  pinnedNodeId: undefined,
  pinnedNodeActiveTabId: undefined,
  selectedNodeId: undefined,
  selectedNodeActiveTabId: undefined,
});

const getInitialWorkflowParametersContentState = (): WorkflowParametersPanelContentState => ({
  panelMode: 'WorkflowParameters',
});

export const initialState: PanelState = {
  connectionContent: getInitialConnectionContentState(),
  currentPanelMode: 'Operation',
  discoveryContent: getInitialDiscoveryContentState(),
  errorContent: getInitialErrorContentState(),
  isCollapsed: true,
  isLoading: false,
  location: PanelLocation.Right,
  nodeSearchContent: getInitialNodeSearchContentState(),
  operationContent: getInitialOperationContentState(),
  previousPanelMode: undefined,
  workflowParametersContent: getInitialWorkflowParametersContentState(),
};

const area = 'Designer:Panel Slice';

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    expandPanel: (state) => {
      state.isCollapsed = false;
    },
    collapsePanel: (state) => {
      state.isCollapsed = true;
      state.discoveryContent.selectedOperationGroupId = '';
      state.discoveryContent.isAddingTrigger = false;
    },
    clearPanel: (state, action: PayloadAction<{ clearPinnedState?: boolean } | undefined>) => {
      const { clearPinnedState } = action.payload ?? {};

      state.connectionContent = getInitialConnectionContentState();
      state.currentPanelMode = 'Operation';
      state.discoveryContent = getInitialDiscoveryContentState();
      state.errorContent = getInitialErrorContentState();
      state.nodeSearchContent = getInitialNodeSearchContentState();
      state.previousPanelMode = undefined;
      state.workflowParametersContent = getInitialWorkflowParametersContentState();

      if (clearPinnedState) {
        state.isCollapsed = true;
        state.operationContent = getInitialOperationContentState();
      } else {
        state.isCollapsed = !state.operationContent.pinnedNodeId;
        state.operationContent = {
          ...getInitialOperationContentState(),
          pinnedNodeId: state.operationContent.pinnedNodeId,
          pinnedNodeActiveTabId: state.operationContent.pinnedNodeActiveTabId,
        };
      }
    },
    updatePanelLocation: (state, action: PayloadAction<PanelLocation | undefined>) => {
      if (action.payload && action.payload !== state.location) {
        state.location = action.payload;
      }
    },
    setPinnedNode: (state, action: PayloadAction<{ nodeId: string; updatePanelOpenState?: boolean }>) => {
      const { nodeId, updatePanelOpenState } = action.payload;
      const hasSelectedNode = !!state.operationContent.selectedNodeId;

      if (nodeId && !hasSelectedNode) {
        state.connectionContent.selectedNodeIds = [nodeId];
        state.discoveryContent.selectedNodeIds = [nodeId];
        state.operationContent.selectedNodeId = nodeId;
      }

      state.operationContent.pinnedNodeId = nodeId;
      state.operationContent.pinnedNodeActiveTabId = undefined;

      if (updatePanelOpenState) {
        if (nodeId) {
          state.isCollapsed = false;
          state.currentPanelMode = 'Operation';
        } else {
          state.isCollapsed = !hasSelectedNode;
        }
      }
    },
    setSelectedNodeId: (state, action: PayloadAction<string>) => {
      const selectedNodes = [action.payload];

      state.connectionContent.selectedNodeIds = selectedNodes;
      state.discoveryContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
    },
    setSelectedNodeIds: (state, action: PayloadAction<string[]>) => {
      const selectedNodes = action.payload;

      state.connectionContent.selectedNodeIds = selectedNodes;
      state.discoveryContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      const selectedNodes = [action.payload];

      state.isCollapsed = false;
      state.currentPanelMode = 'Operation';
      state.connectionContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
      state.operationContent.selectedNodeActiveTabId = undefined;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    expandDiscoveryPanel: (
      state,
      action: PayloadAction<{
        addingTrigger?: boolean;
        focusReturnElementId?: string;
        isParallelBranch?: boolean;
        nodeId: string;
        relationshipIds: RelationshipIds;
      }>
    ) => {
      const { addingTrigger, focusReturnElementId, isParallelBranch, nodeId, relationshipIds } = action.payload;

      state.currentPanelMode = 'Discovery';
      state.focusReturnElementId = focusReturnElementId;
      state.isCollapsed = false;
      state.discoveryContent.isAddingTrigger = !!addingTrigger;
      state.discoveryContent.isParallelBranch = isParallelBranch ?? false;
      state.discoveryContent.relationshipIds = relationshipIds;
      state.discoveryContent.selectedNodeIds = [nodeId];

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationGroupId: (state, action: PayloadAction<string>) => {
      state.discoveryContent.selectedOperationGroupId = cleanConnectorId(action.payload);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationId: (state, action: PayloadAction<string>) => {
      state.discoveryContent.selectedOperationId = action.payload;
    },
    openPanel: (
      state,
      action: PayloadAction<{
        focusReturnElementId?: string;
        nodeId?: string;
        nodeIds?: string[];
        panelMode: PanelMode;
        referencePanelMode?: PanelMode;
      }>
    ) => {
      const { focusReturnElementId, nodeId, nodeIds, panelMode, referencePanelMode } = action.payload;
      const selectedNodes = nodeIds ? nodeIds : nodeId ? [nodeId] : [];

      state.currentPanelMode = panelMode;
      state.isCollapsed = false;
      state.focusReturnElementId = focusReturnElementId;
      state.previousPanelMode = referencePanelMode;
      state.connectionContent.selectedNodeIds = selectedNodes;
      state.discoveryContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
    },
    setPinnedPanelActiveTab: (state, action: PayloadAction<string | undefined>) => {
      state.operationContent.pinnedNodeActiveTabId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    setSelectedPanelActiveTab: (state, action: PayloadAction<string | undefined>) => {
      state.errorContent.selectedTabId = action.payload;
      state.operationContent.selectedNodeActiveTabId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    setIsPanelLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsCreatingConnection: (state, action: PayloadAction<boolean>) => {
      state.connectionContent.isCreatingConnection = action.payload;
    },
    selectErrorsPanelTab: (state, action: PayloadAction<string>) => {
      state.errorContent.selectedTabId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.panel);
  },
});

export const {
  changePanelNode,
  clearPanel,
  collapsePanel,
  expandDiscoveryPanel,
  expandPanel,
  openPanel,
  selectErrorsPanelTab,
  selectOperationGroupId,
  selectOperationId,
  setPinnedPanelActiveTab,
  setSelectedPanelActiveTab,
  setIsCreatingConnection,
  setIsPanelLoading,
  setPinnedNode,
  setSelectedNodeId,
  setSelectedNodeIds,
  updatePanelLocation,
} = panelSlice.actions;

export default panelSlice.reducer;
