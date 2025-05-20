/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useThrottledEffect,
  useWindowDimensions,
  useOutsideClick,
  useConsoleLog,
  useNodeSize,
  useNodeIndex,
  useEdgeIndex,
  useNodeLeafIndex,
} from '../hooks';
import { useNodesData } from '@xyflow/react';
import { useEdgesData } from '../useEdgesData';

// Mock dependencies
vi.mock('@xyflow/react', () => ({
  useNodesData: vi.fn(),
}));

vi.mock('../useEdgesData', () => ({
  useEdgesData: vi.fn(),
}));

describe('lib/utils/src/lib/helpers/hooks', () => {
  describe('useThrottledEffect', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call the effect function when throttle delay has passed', () => {
      const effect = vi.fn();
      const delay = 100;
      const deps = [1, 2];

      renderHook(() => useThrottledEffect(effect, deps, delay));

      // Should not be called immediately
      expect(effect).not.toHaveBeenCalled();

      // Advance timer past delay
      act(() => {
        vi.advanceTimersByTime(delay + 10);
      });

      // Should be called after delay
      expect(effect).toHaveBeenCalledTimes(1);
    });
  });

  describe('useWindowDimensions', () => {
    beforeEach(() => {
      // Set initial window dimensions for testing
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
    });

    it('should return the current window dimensions', () => {
      const { result } = renderHook(() => useWindowDimensions());

      expect(result.current).toEqual({
        width: 1024,
        height: 768,
      });
    });

    it('should update dimensions when window is resized', () => {
      const { result } = renderHook(() => useWindowDimensions());

      // Change window dimensions
      act(() => {
        window.innerWidth = 800;
        window.innerHeight = 600;

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
      });

      // Check if dimensions are updated
      expect(result.current).toEqual({
        width: 800,
        height: 600,
      });
    });
  });

  describe('useOutsideClick', () => {
    it('should call callback when clicked outside all refs', () => {
      const callback = vi.fn();
      const mockRef1 = { current: document.createElement('div') };
      const mockRef2 = { current: document.createElement('div') };

      document.body.appendChild(mockRef1.current);
      document.body.appendChild(mockRef2.current);

      renderHook(() => useOutsideClick([mockRef1, mockRef2], callback));

      // Create an element outside of the refs
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      // Simulate click on outside element
      act(() => {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: outsideElement });
        document.dispatchEvent(clickEvent);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Clean up
      document.body.removeChild(mockRef1.current);
      document.body.removeChild(mockRef2.current);
      document.body.removeChild(outsideElement);
    });

    it('should not call callback when clicked inside a ref', () => {
      const callback = vi.fn();
      const mockRef1 = { current: document.createElement('div') };
      const mockRef2 = { current: document.createElement('div') };

      document.body.appendChild(mockRef1.current);
      document.body.appendChild(mockRef2.current);

      renderHook(() => useOutsideClick([mockRef1, mockRef2], callback));

      // Simulate click on inside element
      act(() => {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: mockRef1.current });
        document.dispatchEvent(clickEvent);
      });

      expect(callback).not.toHaveBeenCalled();

      // Clean up
      document.body.removeChild(mockRef1.current);
      document.body.removeChild(mockRef2.current);
    });

    it('should handle ref with null current property', () => {
      const callback = vi.fn();
      const mockRef1 = { current: null };
      const mockRef2 = { current: document.createElement('div') };

      document.body.appendChild(mockRef2.current);

      renderHook(() => useOutsideClick([mockRef1, mockRef2], callback));

      // Simulate click on outside element
      act(() => {
        const clickEvent = new MouseEvent('click', { bubbles: true });
        Object.defineProperty(clickEvent, 'target', { value: document.body });
        document.dispatchEvent(clickEvent);
      });

      expect(callback).toHaveBeenCalledTimes(1);

      // Clean up
      document.body.removeChild(mockRef2.current);
    });
  });

  describe('useConsoleLog', () => {
    it('should call console.log with the provided value', () => {
      const originalConsoleLog = console.log;
      console.log = vi.fn();

      const testValue = { test: 'data' };
      renderHook(() => useConsoleLog(testValue));

      expect(console.log).toHaveBeenCalledWith('%c UseConsole>', 'color: #3386FF; font-weight: bold;', testValue);

      // Restore console.log
      console.log = originalConsoleLog;
    });

    it('should update the log when the value changes', () => {
      const originalConsoleLog = console.log;
      console.log = vi.fn();

      const initialValue = 'initial';
      const { rerender } = renderHook(({ value }) => useConsoleLog(value), {
        initialProps: { value: initialValue },
      });

      expect(console.log).toHaveBeenCalledWith('%c UseConsole>', 'color: #3386FF; font-weight: bold;', initialValue);

      // Update the value
      const newValue = 'updated';
      rerender({ value: newValue });

      expect(console.log).toHaveBeenCalledWith('%c UseConsole>', 'color: #3386FF; font-weight: bold;', newValue);

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('useNodeSize', () => {
    it('should return node size from useNodesData', () => {
      const mockSize = { width: 100, height: 50 };
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return a node with size data
      (useNodesData as vi.Mock).mockReturnValue({
        data: {
          size: mockSize,
        },
      });

      const { result } = renderHook(() => useNodeSize(mockNodeId));

      expect(result.current).toEqual(mockSize);
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should return default size when node data is not available', () => {
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return null
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeSize(mockNodeId));

      expect(result.current).toEqual({ width: 0, height: 0 });
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should handle undefined nodeId', () => {
      // Mock useNodesData
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeSize(undefined));

      expect(result.current).toEqual({ width: 0, height: 0 });
      expect(useNodesData).toHaveBeenCalledWith('');
    });
  });

  describe('useNodeIndex', () => {
    it('should return node index from useNodesData', () => {
      const mockNodeIndex = 42;
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return a node with nodeIndex data
      (useNodesData as vi.Mock).mockReturnValue({
        data: {
          nodeIndex: mockNodeIndex,
        },
      });

      const { result } = renderHook(() => useNodeIndex(mockNodeId));

      expect(result.current).toEqual(mockNodeIndex);
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should return default index when node data is not available', () => {
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return null
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeIndex(mockNodeId));

      expect(result.current).toEqual(0);
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should handle undefined nodeId', () => {
      // Mock useNodesData
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeIndex(undefined));

      expect(result.current).toEqual(0);
      expect(useNodesData).toHaveBeenCalledWith('');
    });
  });

  describe('useEdgeIndex', () => {
    it('should return edge index from useEdgesData', () => {
      const mockEdgeIndex = 42;
      const mockEdgeId = 'test-edge-id';

      // Mock useEdgesData to return an edge with edgeIndex data
      (useEdgesData as vi.Mock).mockReturnValue({
        data: {
          edgeIndex: mockEdgeIndex,
        },
      });

      const { result } = renderHook(() => useEdgeIndex(mockEdgeId));

      expect(result.current).toEqual(mockEdgeIndex);
      expect(useEdgesData).toHaveBeenCalledWith(mockEdgeId);
    });

    it('should return default index when edge data is not available', () => {
      const mockEdgeId = 'test-edge-id';

      // Mock useEdgesData to return null
      (useEdgesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useEdgeIndex(mockEdgeId));

      expect(result.current).toEqual(0);
      expect(useEdgesData).toHaveBeenCalledWith(mockEdgeId);
    });

    it('should handle undefined edgeId', () => {
      // Mock useEdgesData
      (useEdgesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useEdgeIndex(undefined));

      expect(result.current).toEqual(0);
      expect(useEdgesData).toHaveBeenCalledWith('');
    });
  });

  describe('useNodeLeafIndex', () => {
    it('should return node leaf index from useNodesData', () => {
      const mockNodeLeafIndex = 42;
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return a node with nodeLeafIndex data
      (useNodesData as vi.Mock).mockReturnValue({
        data: {
          nodeLeafIndex: mockNodeLeafIndex,
        },
      });

      const { result } = renderHook(() => useNodeLeafIndex(mockNodeId));

      expect(result.current).toEqual(mockNodeLeafIndex);
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should return default index when node data is not available', () => {
      const mockNodeId = 'test-node-id';

      // Mock useNodesData to return null
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeLeafIndex(mockNodeId));

      expect(result.current).toEqual(0);
      expect(useNodesData).toHaveBeenCalledWith(mockNodeId);
    });

    it('should handle undefined nodeId', () => {
      // Mock useNodesData
      (useNodesData as vi.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useNodeLeafIndex(undefined));

      expect(result.current).toEqual(0);
      expect(useNodesData).toHaveBeenCalledWith('');
    });
  });
});
