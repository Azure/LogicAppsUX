import { PanelLocation } from '@microsoft/designer-ui';
import { cleanConnectorId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { resetWorkflowState } from '../global';
import {
  changePanelNode as panelV1ChangePanelNode,
  clearPanel as panelV1ClearPanel,
  collapsePanel as panelV1CollapsePanel,
  expandDiscoveryPanel as panelV1ExpandDiscoveryPanel,
  expandPanel as panelV1ExpandPanel,
  openPanel as panelV1OpenPanel,
  selectErrorsPanelTab as panelV1SelectErrorsPanelTab,
  selectOperationGroupId as panelV1SelectOperationGroupId,
  selectOperationId as panelV1SelectOperationId,
  selectPanelTab as panelV1SelectPanelTab,
  setIsCreatingConnection as panelV1SetIsCreatingConnection,
  setIsPanelLoading as panelV1SetIsPanelLoading,
  setSelectedNodeId as panelV1SetSelectedNodeId,
  setSelectedNodeIds as panelV1SetSelectedNodeIds,
  updatePanelLocation as panelV1UpdatePanelLocation,
} from '../panel/panelSlice';
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

const area = 'Designer:PanelV2 Slice';

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
    clearPanel: (state) => {
      state.connectionContent = getInitialConnectionContentState();
      state.currentPanelMode = 'Operation';
      state.discoveryContent = getInitialDiscoveryContentState();
      state.errorContent = getInitialErrorContentState();
      state.isCollapsed = true;
      state.nodeSearchContent = getInitialNodeSearchContentState();
      state.operationContent = getInitialOperationContentState();
      state.previousPanelMode = undefined;
      state.workflowParametersContent = getInitialWorkflowParametersContentState();
    },
    updatePanelLocation: (state, action: PayloadAction<PanelLocation | undefined>) => {
      if (action.payload && action.payload !== state.location) {
        state.location = action.payload;
      }
    },
    setPinnedNodeId: (state, action: PayloadAction<string>) => {
      state.operationContent.pinnedNodeId = action.payload;
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

      clearPanel();

      state.isCollapsed = false;
      state.currentPanelMode = 'Operation';
      state.connectionContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
      state.operationContent.selectedTabId = undefined;

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

      clearPanel();

      state.currentPanelMode = panelMode;
      state.isCollapsed = false;
      state.focusReturnElementId = focusReturnElementId;
      state.previousPanelMode = referencePanelMode;
      state.connectionContent.selectedNodeIds = selectedNodes;
      state.discoveryContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.errorContent.selectedTabId = action.payload;
      state.operationContent.selectedTabId = action.payload;

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

    // The below matchers are used to ensure that dispatches made to v1 panel are consumed by v2 panel as well.
    // Once v1 panel is deprecated & deleted, these can be safely removed.
    builder.addMatcher(isAnyOf(panelV1ExpandPanel), (state) => panelSlice.caseReducers.expandPanel(state));
    builder.addMatcher(isAnyOf(panelV1CollapsePanel), (state) => panelSlice.caseReducers.collapsePanel(state));
    builder.addMatcher(isAnyOf(panelV1ClearPanel), (state) => panelSlice.caseReducers.clearPanel(state));
    builder.addMatcher(isAnyOf(panelV1UpdatePanelLocation), (state, action) => panelSlice.caseReducers.updatePanelLocation(state, action));
    builder.addMatcher(isAnyOf(panelV1SetSelectedNodeId), (state, action) => panelSlice.caseReducers.setSelectedNodeId(state, action));
    builder.addMatcher(isAnyOf(panelV1SetSelectedNodeIds), (state, action) => panelSlice.caseReducers.setSelectedNodeIds(state, action));
    builder.addMatcher(isAnyOf(panelV1ChangePanelNode), (state, action) => panelSlice.caseReducers.changePanelNode(state, action));
    builder.addMatcher(isAnyOf(panelV1ExpandDiscoveryPanel), (state, action) =>
      panelSlice.caseReducers.expandDiscoveryPanel(state, action)
    );
    builder.addMatcher(isAnyOf(panelV1SelectOperationGroupId), (state, action) =>
      panelSlice.caseReducers.selectOperationGroupId(state, action)
    );
    builder.addMatcher(isAnyOf(panelV1SelectOperationId), (state, action) => panelSlice.caseReducers.selectOperationId(state, action));
    builder.addMatcher(isAnyOf(panelV1OpenPanel), (state, action) => panelSlice.caseReducers.openPanel(state, action));
    builder.addMatcher(isAnyOf(panelV1SelectPanelTab), (state, action) => panelSlice.caseReducers.selectPanelTab(state, action));
    builder.addMatcher(isAnyOf(panelV1SetIsPanelLoading), (state, action) => panelSlice.caseReducers.setIsPanelLoading(state, action));
    builder.addMatcher(isAnyOf(panelV1SetIsCreatingConnection), (state, action) =>
      panelSlice.caseReducers.setIsCreatingConnection(state, action)
    );
    builder.addMatcher(isAnyOf(panelV1SelectErrorsPanelTab), (state, action) =>
      panelSlice.caseReducers.selectErrorsPanelTab(state, action)
    );
    // End v1 panel matchers.
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
  selectPanelTab,
  setIsCreatingConnection,
  setIsPanelLoading,
  setPinnedNodeId,
  setSelectedNodeId,
  setSelectedNodeIds,
  updatePanelLocation,
} = panelSlice.actions;

export default panelSlice.reducer;
