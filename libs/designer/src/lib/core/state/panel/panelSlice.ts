import type { PanelState } from './panelInterfaces';
import type { PanelTab } from '@microsoft/designer-ui';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState: PanelState = {
  collapsed: true,
  selectedNode: '',
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
    expandDiscoveryPanel: (state, action: PayloadAction<{ childId?: string; parentId?: string; nodeId: string }>) => {
      state.collapsed = false;
      state.isDiscovery = true;
      state.parentId = action.payload.parentId;
      state.childId = action.payload.childId;
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
    showAllTabs: (state, action: PayloadAction<{ exclude: string[] }>) => {
      Object.values(state.registeredTabs as Record<string, PanelTab>).forEach((tab) => {
        if (!action.payload.exclude.includes(tab.name)) {
          state.registeredTabs[tab.name.toLowerCase()] = { ...tab, visible: true };
        }
      });
    },
    hideAllTabs: (state, action: PayloadAction<{ exclude: string[] }>) => {
      Object.values(state.registeredTabs as Record<string, PanelTab>).forEach((tab) => {
        if (!action.payload.exclude.includes(tab.name)) {
          state.registeredTabs[tab.name.toLowerCase()] = { ...tab, visible: false };
        }
      });
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
  showAllTabs,
  hideAllTabs,
  selectPanelTab,
} = panelSlice.actions;

export default panelSlice.reducer;
