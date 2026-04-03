import type { NodeContextMenuObject, EdgeContextMenuObject } from './designerViewInterfaces';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type React from 'react';

interface DesignerViewContextType {
  showMinimap: boolean | undefined;
  clampPan: boolean | undefined;
  showDeleteModalNodeId: string | undefined;
  nodeContextMenuData: NodeContextMenuObject | undefined;
  edgeContextMenuData: EdgeContextMenuObject | undefined;
  toggleMinimap: () => void;
  toggleClampPan: () => void;
  setShowDeleteModalNodeId: (id: string | undefined) => void;
  setNodeContextMenuData: (data: NodeContextMenuObject) => void;
  setEdgeContextMenuData: (data: EdgeContextMenuObject) => void;
  resetDesignerView: () => void;
}

const initialValues = {
  showMinimap: false,
  clampPan: true,
  showDeleteModalNodeId: undefined as string | undefined,
  nodeContextMenuData: undefined as NodeContextMenuObject | undefined,
  edgeContextMenuData: undefined as EdgeContextMenuObject | undefined,
};

const DesignerViewContext = createContext<DesignerViewContextType | undefined>(undefined);

export const DesignerViewProvider = ({ children }: { children: React.ReactNode }) => {
  const [showMinimap, setShowMinimapState] = useState(initialValues.showMinimap);
  const [clampPan, setClampPanState] = useState(initialValues.clampPan);
  const [showDeleteModalNodeId, setShowDeleteModalNodeIdState] = useState(initialValues.showDeleteModalNodeId);
  const [nodeContextMenuData, setNodeContextMenuDataState] = useState(initialValues.nodeContextMenuData);
  const [edgeContextMenuData, setEdgeContextMenuDataState] = useState(initialValues.edgeContextMenuData);

  const toggleMinimap = useCallback(() => setShowMinimapState((prev) => !prev), []);
  const toggleClampPan = useCallback(() => setClampPanState((prev) => !prev), []);
  const setShowDeleteModalNodeId = useCallback((id: string | undefined) => setShowDeleteModalNodeIdState(id), []);
  const setNodeContextMenuData = useCallback((data: NodeContextMenuObject) => setNodeContextMenuDataState(data), []);
  const setEdgeContextMenuData = useCallback((data: EdgeContextMenuObject) => setEdgeContextMenuDataState(data), []);
  const resetDesignerView = useCallback(() => {
    setShowMinimapState(initialValues.showMinimap);
    setClampPanState(initialValues.clampPan);
    setShowDeleteModalNodeIdState(initialValues.showDeleteModalNodeId);
    setNodeContextMenuDataState(initialValues.nodeContextMenuData);
    setEdgeContextMenuDataState(initialValues.edgeContextMenuData);
  }, []);

  const value = useMemo(
    () => ({
      showMinimap,
      clampPan,
      showDeleteModalNodeId,
      nodeContextMenuData,
      edgeContextMenuData,
      toggleMinimap,
      toggleClampPan,
      setShowDeleteModalNodeId,
      setNodeContextMenuData,
      setEdgeContextMenuData,
      resetDesignerView,
    }),
    [
      showMinimap,
      clampPan,
      showDeleteModalNodeId,
      nodeContextMenuData,
      edgeContextMenuData,
      toggleMinimap,
      toggleClampPan,
      setShowDeleteModalNodeId,
      setNodeContextMenuData,
      setEdgeContextMenuData,
      resetDesignerView,
    ]
  );

  return <DesignerViewContext.Provider value={value}>{children}</DesignerViewContext.Provider>;
};

export const useDesignerView = () => {
  const context = useContext(DesignerViewContext);
  if (!context) {
    throw new Error('useDesignerView must be used within a DesignerViewProvider');
  }
  return context;
};

// Selector-equivalent hooks (backward compatible)
export const useShowMinimap = () => useDesignerView().showMinimap;
export const useClampPan = () => useDesignerView().clampPan;
export const useShowDeleteModalNodeId = () => useDesignerView().showDeleteModalNodeId;
export const useNodeContextMenuData = () => useDesignerView().nodeContextMenuData;
export const useEdgeContextMenuData = () => useDesignerView().edgeContextMenuData;

// Action-equivalent hooks
export const useToggleMinimap = () => useDesignerView().toggleMinimap;
export const useToggleClampPan = () => useDesignerView().toggleClampPan;
export const useSetShowDeleteModalNodeId = () => useDesignerView().setShowDeleteModalNodeId;
export const useSetNodeContextMenuData = () => useDesignerView().setNodeContextMenuData;
export const useSetEdgeContextMenuData = () => useDesignerView().setEdgeContextMenuData;
export const useResetDesignerView = () => useDesignerView().resetDesignerView;
