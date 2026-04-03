import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  DesignerViewProvider,
  useShowMinimap,
  useClampPan,
  useShowDeleteModalNodeId,
  useNodeContextMenuData,
  useEdgeContextMenuData,
  useDesignerView,
} from '../designerView/DesignerViewContext';
import type { NodeContextMenuObject, EdgeContextMenuObject } from '../designerView/designerViewInterfaces';

describe('DesignerViewContext', () => {
  it('should have correct initial values', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    expect(result.current.showMinimap).toBe(false);
    expect(result.current.clampPan).toBe(true);
    expect(result.current.showDeleteModalNodeId).toBeUndefined();
    expect(result.current.nodeContextMenuData).toBeUndefined();
    expect(result.current.edgeContextMenuData).toBeUndefined();
  });

  it('should toggle minimap', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    act(() => result.current.toggleMinimap());
    expect(result.current.showMinimap).toBe(true);
    act(() => result.current.toggleMinimap());
    expect(result.current.showMinimap).toBe(false);
  });

  it('should toggle clamp pan', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    expect(result.current.clampPan).toBe(true);
    act(() => result.current.toggleClampPan());
    expect(result.current.clampPan).toBe(false);
    act(() => result.current.toggleClampPan());
    expect(result.current.clampPan).toBe(true);
  });

  it('should set show delete modal node id', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    act(() => result.current.setShowDeleteModalNodeId('test-node-id'));
    expect(result.current.showDeleteModalNodeId).toBe('test-node-id');
    act(() => result.current.setShowDeleteModalNodeId(undefined));
    expect(result.current.showDeleteModalNodeId).toBeUndefined();
  });

  it('should set node context menu data', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    const data: NodeContextMenuObject = { nodeId: 'test-node', location: { x: 100, y: 200 } };
    act(() => result.current.setNodeContextMenuData(data));
    expect(result.current.nodeContextMenuData).toEqual(data);
  });

  it('should set edge context menu data', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    const data: EdgeContextMenuObject = { edgeId: 'test-edge', location: { x: 150, y: 250 } };
    act(() => result.current.setEdgeContextMenuData(data));
    expect(result.current.edgeContextMenuData).toEqual(data);
  });

  it('should reset designer view to initial state', () => {
    const { result } = renderHook(() => useDesignerView(), { wrapper: DesignerViewProvider });
    act(() => {
      result.current.toggleMinimap();
      result.current.toggleClampPan();
      result.current.setShowDeleteModalNodeId('test-node');
      result.current.setNodeContextMenuData({ nodeId: 'test', location: { x: 0, y: 0 } });
      result.current.setEdgeContextMenuData({ edgeId: 'test', location: { x: 0, y: 0 } });
    });

    act(() => result.current.resetDesignerView());
    expect(result.current.showMinimap).toBe(false);
    expect(result.current.clampPan).toBe(true);
    expect(result.current.showDeleteModalNodeId).toBeUndefined();
    expect(result.current.nodeContextMenuData).toBeUndefined();
    expect(result.current.edgeContextMenuData).toBeUndefined();
  });

  it('individual hooks read from context', () => {
    const { result: minimap } = renderHook(() => useShowMinimap(), { wrapper: DesignerViewProvider });
    const { result: clamp } = renderHook(() => useClampPan(), { wrapper: DesignerViewProvider });
    const { result: deleteModal } = renderHook(() => useShowDeleteModalNodeId(), { wrapper: DesignerViewProvider });
    const { result: nodeMenu } = renderHook(() => useNodeContextMenuData(), { wrapper: DesignerViewProvider });
    const { result: edgeMenu } = renderHook(() => useEdgeContextMenuData(), { wrapper: DesignerViewProvider });

    expect(minimap.current).toBe(false);
    expect(clamp.current).toBe(true);
    expect(deleteModal.current).toBeUndefined();
    expect(nodeMenu.current).toBeUndefined();
    expect(edgeMenu.current).toBeUndefined();
  });
});
