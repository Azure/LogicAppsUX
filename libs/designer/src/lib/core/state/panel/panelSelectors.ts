import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useSelectedNodeId = () => {
  return useSelector((state: RootState) => state.panel.selectedNode);
};

export const useIsNodeSelected = (nodeId: string) => {
  return useSelector((state: RootState) => state.panel.selectedNode === nodeId);
};

export const useRegisteredPanelTabs = () => useSelector((state: RootState) => state.panel.registeredTabs);

export const usePanelTabByName = (tabName: string) => useSelector((state: RootState) => state.panel.registeredTabs[tabName]);

export const useVisiblePanelTabs = () => {
  return useSelector((state: RootState) => {
    const visibleTabs = Object.values(state.panel.registeredTabs).filter((tab) => tab.visible !== false);
    return visibleTabs.sort((a, b) => a.order - b.order);
  });
};

export const useSelectedPanelTabName = () => useSelector((state: RootState) => state.panel.selectedTabName);
