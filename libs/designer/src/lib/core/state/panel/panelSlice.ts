import constants from '../../../common/constants';
import type { RelationshipIds, PanelState } from './panelInterfaces';
import type { PanelTab } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: PanelState = {
  collapsed: true,
  selectedNode: '',
  relationshipIds: {
    graphId: 'root',
  },
  isParallelBranch: false,
  registeredTabs: {},
  selectedTabName: undefined,
  selectedOperationGroupId: '',
  selectedOperationId: '',
  addingTrigger: false,
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
      state.currentState = undefined;
      state.selectedNode = '';
      state.selectedOperationGroupId = '';
      state.addingTrigger = false;
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) return;
      if (state.collapsed) state.collapsed = false;
      state.selectedNode = action.payload;
      state.currentState = undefined;
      state.selectedOperationGroupId = '';
      state.addingTrigger = false;
    },
    expandDiscoveryPanel: (
      state,
      action: PayloadAction<{ relationshipIds: RelationshipIds; nodeId: string; isParallelBranch?: boolean; addingTrigger?: boolean }>
    ) => {
      state.collapsed = false;
      state.currentState = 'Discovery';
      state.relationshipIds = action.payload.relationshipIds;
      state.selectedNode = action.payload.nodeId;
      state.isParallelBranch = action.payload?.isParallelBranch ?? false;
      state.addingTrigger = !!action.payload?.addingTrigger;
    },
    selectOperationGroupId: (state, action: PayloadAction<string>) => {
      state.selectedOperationGroupId = action.payload;
    },
    selectOperationId: (state, action: PayloadAction<string>) => {
      state.selectedOperationId = action.payload;
    },
    switchToOperationPanel: (state, action: PayloadAction<string>) => {
      state.selectedNode = action.payload;
      state.currentState = undefined;
      state.selectedOperationGroupId = '';
      state.selectedOperationId = action.payload;
      state.addingTrigger = false;
    },
    switchToWorkflowParameters: (state) => {
      state.collapsed = false;
      state.currentState = 'WorkflowParameters';
      state.selectedNode = '';
      state.selectedOperationGroupId = '';
      state.selectedOperationId = '';
      state.addingTrigger = false;
    },
    switchToNodeSearchPanel: (state) => {
      state.collapsed = false;
      state.currentState = 'NodeSearch';
      state.selectedNode = '';
      state.selectedOperationGroupId = '';
      state.selectedOperationId = '';
      state.addingTrigger = false;
    },
    switchToErrorsPanel: (state) => {
      state.collapsed = false;
      state.currentState = 'Error';
      state.selectedNode = '';
      state.selectedOperationGroupId = '';
      state.selectedOperationId = '';
      state.addingTrigger = false;
    },
    registerPanelTabs: (state, action: PayloadAction<Array<PanelTab>>) => {
      action.payload.forEach((tab) => {
        state.registeredTabs[tab.name.toLowerCase()] = tab;
      });
    },
    setTabError: (state, action: PayloadAction<{ tabName: string; hasErrors: boolean; nodeId: string }>) => {
      const tabName = action.payload.tabName.toLowerCase();
      const { nodeId, hasErrors } = action.payload;
      if (tabName) {
        state.registeredTabs[tabName] = {
          ...state.registeredTabs[tabName],
          tabErrors: {
            ...state.registeredTabs[tabName].tabErrors,
            [nodeId]: hasErrors,
          },
        };
      }
    },
    unregisterPanelTab: (state, action: PayloadAction<string>) => {
      delete state.registeredTabs[action.payload];
    },
    setTabVisibility: (state, action: PayloadAction<{ tabName: string; visible?: boolean }>) => {
      const tabName = action.payload.tabName.toLowerCase();
      if (tabName) {
        state.registeredTabs[tabName] = {
          ...state.registeredTabs[tabName],
          visible: !!action.payload.visible,
        };
      }
    },
    showDefaultTabs: (
      state,
      action: PayloadAction<
        { isScopeNode?: boolean; isMonitoringView?: boolean; hasSchema?: boolean; showRunHistory?: boolean } | undefined
      >
    ) => {
      const isMonitoringView = action.payload?.isMonitoringView;
      const isScopeNode = action.payload?.isScopeNode;
      const hasSchema = action.payload?.hasSchema;
      const defaultTabs = [
        constants.PANEL_TAB_NAMES.ABOUT,
        constants.PANEL_TAB_NAMES.CODE_VIEW,
        constants.PANEL_TAB_NAMES.SETTINGS,
        constants.PANEL_TAB_NAMES.SCRATCH,
      ];

      isMonitoringView
        ? defaultTabs.unshift(constants.PANEL_TAB_NAMES.MONITORING)
        : defaultTabs.unshift(constants.PANEL_TAB_NAMES.PARAMETERS);

      if (isMonitoringView && action.payload?.showRunHistory) {
        defaultTabs.unshift(constants.PANEL_TAB_NAMES.RETRY_HISTORY);
      }
      if (hasSchema && !isMonitoringView) {
        defaultTabs.unshift(constants.PANEL_TAB_NAMES.TESTING);
      }
      if (isScopeNode && !isMonitoringView) {
        defaultTabs.shift();
      }

      Object.values(state.registeredTabs as Record<string, PanelTab>).forEach((tab) => {
        if (state.registeredTabs[tab.name.toLowerCase()]) {
          state.registeredTabs[tab.name.toLowerCase()] = { ...tab, visible: defaultTabs.includes(tab.name) };
        }
      });
    },
    isolateTab: (state, action: PayloadAction<string>) => {
      Object.values(state.registeredTabs as Record<string, PanelTab>).forEach((tab) => {
        state.registeredTabs[tab.name.toLowerCase()] = { ...tab, visible: tab.name === action.payload };
      });
      state.selectedTabName = action.payload;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabName = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  expandPanel,
  collapsePanel,
  clearPanel,
  changePanelNode,
  expandDiscoveryPanel,
  selectOperationGroupId,
  selectOperationId,
  switchToOperationPanel,
  registerPanelTabs,
  unregisterPanelTab,
  showDefaultTabs,
  setTabVisibility,
  isolateTab,
  selectPanelTab,
  setTabError,
  switchToWorkflowParameters,
  switchToNodeSearchPanel,
  switchToErrorsPanel,
} = panelSlice.actions;

export default panelSlice.reducer;
