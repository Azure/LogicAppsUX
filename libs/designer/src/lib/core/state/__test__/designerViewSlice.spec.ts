import { describe, expect, it } from 'vitest';
import reducer, { initialState } from '../designerView/designerViewSlice';
import {
  toggleMinimap,
  toggleClampPan,
  setShowDeleteModalNodeId,
  setNodeContextMenuData,
  setEdgeContextMenuData,
  resetDesignerView,
} from '../designerView/designerViewSlice';
import type { NodeContextMenuObject, EdgeContextMenuObject } from '../designerView/designerViewInterfaces';
import { resetWorkflowState } from '../global';

describe('designerView slice reducers', () => {
  it('should toggle minimap', () => {
    const state = reducer(initialState, toggleMinimap());
    expect(state.showMinimap).toBe(true);

    const state2 = reducer(state, toggleMinimap());
    expect(state2.showMinimap).toBe(false);
  });

  it('should toggle clamp pan', () => {
    const state = reducer(initialState, toggleClampPan());
    expect(state.clampPan).toBe(false);

    const state2 = reducer(state, toggleClampPan());
    expect(state2.clampPan).toBe(true);
  });

  it('should set show delete modal node id', () => {
    const nodeId = 'test-node-id';
    const state = reducer(initialState, setShowDeleteModalNodeId(nodeId));
    expect(state.showDeleteModalNodeId).toBe(nodeId);

    const state2 = reducer(state, setShowDeleteModalNodeId(undefined));
    expect(state2.showDeleteModalNodeId).toBeUndefined();
  });

  it('should set node context menu data', () => {
    const nodeContextMenuData: NodeContextMenuObject = {
      nodeId: 'test-node',
      location: { x: 100, y: 200 },
    };
    const state = reducer(initialState, setNodeContextMenuData(nodeContextMenuData));
    expect(state.nodeContextMenuData).toEqual(nodeContextMenuData);
  });

  it('should set edge context menu data', () => {
    const edgeContextMenuData: EdgeContextMenuObject = {
      edgeId: 'test-edge',
      location: { x: 150, y: 250 },
    };
    const state = reducer(initialState, setEdgeContextMenuData(edgeContextMenuData));
    expect(state.edgeContextMenuData).toEqual(edgeContextMenuData);
  });

  it('should reset designer view', () => {
    const modifiedState = {
      showMinimap: true,
      clampPan: false,
      showDeleteModalNodeId: 'test-node',
      nodeContextMenuData: { nodeId: 'test', location: { x: 0, y: 0 } },
      edgeContextMenuData: { edgeId: 'test', location: { x: 0, y: 0 } },
    };

    const state = reducer(modifiedState, resetDesignerView());
    expect(state).toEqual(initialState);
  });

  it('should reset to initial state on resetWorkflowState', () => {
    const modifiedState = {
      showMinimap: true,
      clampPan: false,
      showDeleteModalNodeId: 'test-node',
      nodeContextMenuData: { nodeId: 'test', location: { x: 0, y: 0 } },
      edgeContextMenuData: { edgeId: 'test', location: { x: 0, y: 0 } },
    };

    const state = reducer(modifiedState, resetWorkflowState());
    expect(state).toEqual(initialState);
  });
});
