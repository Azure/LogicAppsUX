import { resetWorkflowState } from '../global';
import type { PanelMode, PanelState, RelationshipIds } from './panelInterfaces';
import type {
  ConnectionPanelContentState,
  DiscoveryPanelContentState,
  ErrorPanelContentState,
  NodeSearchPanelContentState,
  OperationPanelContentState,
  WorkflowParametersPanelContentState,
} from './panelV2Types';
import { PanelLocation } from '@microsoft/designer-ui';
import { cleanConnectorId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

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
  selectedNodeId: undefined,
  selectedTabId: undefined,
});

const getInitialWorkflowParametersContentState = (): WorkflowParametersPanelContentState => ({
  panelMode: 'WorkflowParameters',
});

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
  panelV2: {
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
  },
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

      /* START V2 LOGIC */
      state.panelV2.connectionContent = getInitialConnectionContentState();
      state.panelV2.currentPanelMode = 'Operation';
      state.panelV2.discoveryContent = getInitialDiscoveryContentState();
      state.panelV2.errorContent = getInitialErrorContentState();
      state.panelV2.isCollapsed = true;
      state.panelV2.nodeSearchContent = getInitialNodeSearchContentState();
      state.panelV2.operationContent = getInitialOperationContentState();
      state.panelV2.previousPanelMode = undefined;
      state.panelV2.workflowParametersContent = getInitialWorkflowParametersContentState();
      /* END V2 LOGIC */
    },
    updatePanelLocation: (state, action: PayloadAction<PanelLocation | undefined>) => {
      if (action.payload && action.payload !== state.panelLocation) {
        state.panelLocation = action.payload;

        /* START V2 LOGIC */
        state.panelV2.location = state.panelLocation;
        /* END V2 LOGIC */
      }
    },
    setPinnedNodeId: (state, action: PayloadAction<string>) => {
      state.panelV2.operationContent.pinnedNodeId = action.payload;
    },
    setSelectedNodeId: (state, action: PayloadAction<string>) => {
      state.selectedNodes = [action.payload];

      /* START V2 LOGIC */
      state.panelV2.connectionContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.discoveryContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.operationContent.selectedNodeId = state.selectedNodes[0];
      /* END V2 LOGIC */
    },
    setSelectedNodeIds: (state, action: PayloadAction<string[]>) => {
      state.selectedNodes = action.payload;

      /* START V2 LOGIC */
      state.panelV2.connectionContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.discoveryContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.operationContent.selectedNodeId = state.selectedNodes[0];
      /* END V2 LOGIC */
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) {
        return;
      }
      clearPanel();
      if (state.collapsed) {
        state.collapsed = false;
      }
      state.selectedNodes = [action.payload];
      state.currentPanelMode = 'Operation';
      state.selectedTabId = undefined;

      /* START V2 LOGIC */
      state.panelV2.isCollapsed = false;
      state.panelV2.currentPanelMode = 'Operation';
      state.panelV2.connectionContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.operationContent.selectedNodeId = state.selectedNodes[0];
      state.panelV2.operationContent.selectedTabId = undefined;
      /* END V2 LOGIC */

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

      /* START V2 LOGIC */
      state.panelV2.currentPanelMode = 'Discovery';
      state.panelV2.focusReturnElementId = action.payload.focusReturnElementId;
      state.panelV2.isCollapsed = false;
      state.panelV2.discoveryContent.isAddingTrigger = !!action.payload?.addingTrigger;
      state.panelV2.discoveryContent.isParallelBranch = action.payload?.isParallelBranch ?? false;
      state.panelV2.discoveryContent.relationshipIds = action.payload.relationshipIds;
      state.panelV2.discoveryContent.selectedNodeIds = [action.payload.nodeId];
      /* END V2 LOGIC */

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationGroupId: (state, action: PayloadAction<string>) => {
      state.selectedOperationGroupId = cleanConnectorId(action.payload);

      /* START V2 LOGIC */
      state.panelV2.discoveryContent.selectedOperationGroupId = state.selectedOperationGroupId;
      /* END V2 LOGIC */

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    selectOperationId: (state, action: PayloadAction<string>) => {
      state.selectedOperationId = action.payload;

      /* START V2 LOGIC */
      state.panelV2.discoveryContent.selectedOperationId = state.selectedOperationId;
      /* END V2 LOGIC */
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

      /* START V2 LOGIC */
      state.panelV2.currentPanelMode = state.currentPanelMode;
      state.panelV2.isCollapsed = state.collapsed;
      state.panelV2.focusReturnElementId = state.focusReturnElementId;
      state.panelV2.previousPanelMode = state.referencePanelMode;
      state.panelV2.connectionContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.discoveryContent.selectedNodeIds = state.selectedNodes;
      state.panelV2.operationContent.selectedNodeId = state.selectedNodes[0];
      /* END V2 LOGIC */
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;

      /* START V2 LOGIC */
      state.panelV2.errorContent.selectedTabId = state.selectedTabId;
      state.panelV2.operationContent.selectedTabId = state.selectedTabId;
      /* END V2 LOGIC */

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Panel Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    setIsPanelLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;

      /* START V2 LOGIC */
      state.panelV2.isLoading = state.isLoading;
      /* END V2 LOGIC */
    },
    setIsCreatingConnection: (state, action: PayloadAction<boolean>) => {
      state.creatingConnection = action.payload;

      /* START V2 LOGIC */
      state.panelV2.connectionContent.isCreatingConnection = state.creatingConnection;
      /* END V2 LOGIC */
    },
    selectErrorsPanelTab: (state, action: PayloadAction<string>) => {
      state.selectedErrorsPanelTabId = action.payload;

      /* START V2 LOGIC */
      state.panelV2.errorContent.selectedTabId = state.selectedErrorsPanelTabId;
      /* END V2 LOGIC */

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
  setPinnedNodeId,
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
