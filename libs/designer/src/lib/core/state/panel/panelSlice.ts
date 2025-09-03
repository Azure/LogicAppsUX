import { PanelLocation } from '@microsoft/designer-ui';
import type { LogicAppsV2, OperationManifest } from '@microsoft/logic-apps-shared';
import { cleanConnectorId, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type {
  ActionPanelFavoriteItem,
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
  expandedConnectorIds: [],
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
  favoriteOperations: [],
});

const getInitialErrorContentState = (): ErrorPanelContentState => ({
  selectedTabId: 'ERRORS',
  panelMode: 'Error',
});

const getInitialNodeSearchContentState = (): NodeSearchPanelContentState => ({
  panelMode: 'NodeSearch',
});

const getInitialOperationContentState = (): OperationPanelContentState => ({
  panelMode: 'Operation',
  selectedNodeId: undefined,
  selectedNodeActiveTabId: undefined,
  alternateSelectedNode: {
    nodeId: undefined,
    activeTabId: undefined,
  },
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

      state.connectionContent = {
        ...getInitialConnectionContentState(),
        expandedConnectorIds: state.connectionContent.expandedConnectorIds,
      };
      state.currentPanelMode = 'Operation';
      state.discoveryContent = {
        ...getInitialDiscoveryContentState(),
        favoriteOperations: state.discoveryContent.favoriteOperations,
      };
      state.errorContent = getInitialErrorContentState();
      state.nodeSearchContent = getInitialNodeSearchContentState();
      state.previousPanelMode = undefined;
      state.workflowParametersContent = getInitialWorkflowParametersContentState();

      if (clearPinnedState) {
        state.isCollapsed = true;
        state.operationContent = getInitialOperationContentState();
      } else {
        state.isCollapsed = !(
          state.operationContent.alternateSelectedNode?.nodeId && state.operationContent.alternateSelectedNode.persistence === 'pinned'
        );
        state.operationContent = {
          ...getInitialOperationContentState(),
          alternateSelectedNode: state.operationContent.alternateSelectedNode,
        };
      }
      if (state.operationContent.alternateSelectedNode?.persistence === 'selected') {
        state.operationContent.alternateSelectedNode = {};
      }
    },
    updatePanelLocation: (state, action: PayloadAction<PanelLocation | undefined>) => {
      if (action.payload && action.payload !== state.location) {
        state.location = action.payload;
      }
    },
    setAlternateSelectedNode: (
      state,
      action: PayloadAction<{ nodeId: string; updatePanelOpenState?: boolean; panelPersistence?: 'selected' | 'pinned' }>
    ) => {
      const { nodeId, updatePanelOpenState } = action.payload;
      const hasSelectedNode = !!state.operationContent.selectedNodeId;

      if (nodeId && !hasSelectedNode) {
        state.connectionContent.selectedNodeIds = [nodeId];
        state.discoveryContent.selectedNodeIds = [nodeId];
        state.operationContent.selectedNodeId = nodeId;
      }

      state.operationContent.alternateSelectedNode = {
        nodeId: nodeId,
        activeTabId: undefined,
        persistence: action.payload.panelPersistence ?? 'pinned',
      };

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
      if (state.operationContent.alternateSelectedNode?.persistence === 'selected') {
        state.operationContent.alternateSelectedNode.nodeId = '';
      }
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      const selectedNodes = [action.payload];

      state.isCollapsed = false;
      state.currentPanelMode = 'Operation';
      state.connectionContent.selectedNodeIds = selectedNodes;
      state.operationContent.selectedNodeId = selectedNodes[0];
      state.operationContent.selectedNodeActiveTabId = undefined;
      if (state.operationContent.alternateSelectedNode?.persistence === 'selected') {
        state.operationContent.alternateSelectedNode.nodeId = '';
      }

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
        isAgentTool?: boolean;
        nodeId: string;
        relationshipIds: RelationshipIds;
      }>
    ) => {
      const { addingTrigger, focusReturnElementId, isParallelBranch, nodeId, relationshipIds, isAgentTool } = action.payload;

      state.currentPanelMode = 'Discovery';
      state.focusReturnElementId = focusReturnElementId;
      state.isCollapsed = false;
      state.discoveryContent.isAddingTrigger = !!addingTrigger;
      state.discoveryContent.isParallelBranch = isParallelBranch ?? false;
      state.discoveryContent.relationshipIds = relationshipIds;
      state.discoveryContent.selectedNodeIds = [nodeId];
      state.discoveryContent.isAddingAgentTool = isAgentTool;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    addAgentToolMetadata: (
      state,
      action: PayloadAction<{
        newAdditiveSubgraphId: string;
        subGraphManifest: OperationManifest;
      }>
    ) => {
      const { newAdditiveSubgraphId, subGraphManifest } = action.payload;
      state.discoveryContent.agentToolMetadata = { newAdditiveSubgraphId, subGraphManifest };
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
    setFavoriteOperations: (state, action: PayloadAction<ActionPanelFavoriteItem[]>) => {
      state.discoveryContent.favoriteOperations = action.payload;
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

      if (state.operationContent.alternateSelectedNode?.persistence === 'selected') {
        state.operationContent.alternateSelectedNode.nodeId = '';
      }
    },
    setPinnedPanelActiveTab: (state, action: PayloadAction<string | undefined>) => {
      if (state.operationContent.alternateSelectedNode) {
        state.operationContent.alternateSelectedNode.activeTabId = action.payload;
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area,
        message: action.type,
        args: [action.payload],
      });
    },
    setSelectedPanelActiveTab: (state, action: PayloadAction<string | undefined>) => {
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
    setConnectionPanelExpandedConnectorIds: (state, action: PayloadAction<string[]>) => {
      state.connectionContent.expandedConnectorIds = action.payload;
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
    initRunInPanel: (state, action: PayloadAction<LogicAppsV2.RunInstanceDefinition | null>) => {
      const actionIds = Object.keys(action.payload?.properties?.actions ?? {});
      actionIds.push(action.payload?.properties?.trigger.name ?? '');
      if (actionIds.length === 0) {
        return; // This is sometimes run too early when we don't have any actions yet
      }
      if (
        state.operationContent.alternateSelectedNode?.nodeId &&
        !actionIds.includes(state.operationContent.alternateSelectedNode.nodeId ?? '')
      ) {
        state.operationContent.alternateSelectedNode.nodeId = undefined;
      }
      if (state.operationContent.selectedNodeId && !actionIds.includes(state.operationContent.selectedNodeId ?? '')) {
        state.operationContent.selectedNodeId = undefined;
      }
      if (state.operationContent.alternateSelectedNode?.nodeId == null && state.operationContent.selectedNodeId == null) {
        state.operationContent = getInitialOperationContentState();
        state.isCollapsed = true;
      }
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
  setFavoriteOperations,
  setPinnedPanelActiveTab,
  setSelectedPanelActiveTab,
  setIsCreatingConnection,
  setConnectionPanelExpandedConnectorIds,
  setIsPanelLoading,
  setAlternateSelectedNode,
  setSelectedNodeId,
  updatePanelLocation,
  initRunInPanel,
  addAgentToolMetadata,
} = panelSlice.actions;

export default panelSlice.reducer;
