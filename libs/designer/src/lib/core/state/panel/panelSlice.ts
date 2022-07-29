import constants from '../../../common/constants';
import type { IdsForDiscovery, PanelState } from './panelInterfaces';
import type { PanelTab } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: PanelState = {
  collapsed: true,
  selectedNode: '',
  discoveryIds: {
    graphId: 'root',
  },
  isDiscovery: false,
  registeredTabs: {},
  selectedTabName: undefined,
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
    },
    clearPanel: (state) => {
      state.collapsed = true;
      state.selectedNode = '';
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) return;
      state.selectedNode = action.payload;
      state.isDiscovery = false;
    },
    expandDiscoveryPanel: (state, action: PayloadAction<{ discoveryIds: IdsForDiscovery; nodeId: string }>) => {
      state.collapsed = false;
      state.isDiscovery = true;
      state.discoveryIds = action.payload.discoveryIds;
      state.selectedNode = action.payload.nodeId;
    },
    switchToOperationPanel: (state, action: PayloadAction<string>) => {
      state.selectedNode = action.payload;
      state.isDiscovery = false;
    },

    registerPanelTabs: (state, action: PayloadAction<Array<PanelTab>>) => {
      action.payload.forEach((tab) => {
        state.registeredTabs[tab.name.toLowerCase()] = tab;
      });
    },
    unregisterPanelTab: (state, action: PayloadAction<string>) => {
      delete state.registeredTabs[action.payload];
    },
    setTabVisibility: (state, action: PayloadAction<{ tabName: string; visible?: boolean }>) => {
      if (state.registeredTabs[action.payload.tabName.toLowerCase()]) {
        state.registeredTabs[action.payload.tabName.toLowerCase()] = {
          ...state.registeredTabs[action.payload.tabName.toLowerCase()],
          visible: !!action.payload.visible,
        };
      }
    },
    showDefaultTabs: (state) => {
      const defaultTabs = [
        constants.PANEL_TAB_NAMES.PARAMETERS,
        constants.PANEL_TAB_NAMES.ABOUT,
        constants.PANEL_TAB_NAMES.CODE_VIEW,
        constants.PANEL_TAB_NAMES.SETTINGS,
        constants.PANEL_TAB_NAMES.SCRATCH,
      ];
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
  switchToOperationPanel,
  registerPanelTabs,
  unregisterPanelTab,
  showDefaultTabs,
  setTabVisibility,
  isolateTab,
  selectPanelTab,
} = panelSlice.actions;

export default panelSlice.reducer;
