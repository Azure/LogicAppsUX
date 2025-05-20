import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act, screen, cleanup, fireEvent } from '@testing-library/react';
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
  // Set up mocks
  const originalConsoleLog = console.log;
  
  beforeEach(() => {
    console.log = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    vi.useRealTimers();
    vi.clearAllMocks();
    cleanup();
  });

  describe('useThrottledEffect', () => {
    it('should call the effect after the specified delay', () => {
      // Arrange
      const effectFn = vi.fn();
      const delay = 1000;
      
      // Act
      const { result } = renderHook(() => useThrottledEffect(effectFn, [], delay));
      
      // Assert that effect is not called immediately
      expect(effectFn).not.toHaveBeenCalled();
      
      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      
      // Assert effect is called after delay
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should not call the effect multiple times within the delay period', () => {
      // Arrange
      const effectFn = vi.fn();
      const delay = 1000;
      
      // Act
      const { result, rerender } = renderHook(() => useThrottledEffect(effectFn, [], delay));
      
      // Rerender multiple times within the delay period
      rerender();
      rerender();
      
      // Fast-forward time but not enough to trigger the effect
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // Assert effect is not called yet
      expect(effectFn).not.toHaveBeenCalled();
      
      // Fast-forward to reach the delay
      act(() => {
        vi.advanceTimersByTime(500);
      });
      
      // Assert effect is called exactly once
      expect(effectFn).toHaveBeenCalledTimes(1);
    });

    it('should update when dependencies change', () => {
      // Arrange
      const effectFn = vi.fn();
      const delay = 1000;
      let dependency = 1;
      
      // Act
      const { result, rerender } = renderHook(() => useThrottledEffect(effectFn, [dependency], delay));
      
      // Fast-forward time to call the effect
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      
      // Update dependency and rerender
      dependency = 2;
      rerender();
      
      // Fast-forward time to call the effect again
      act(() => {
        vi.advanceTimersByTime(delay);
      });
      
      // Assert effect is called twice
      expect(effectFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('useWindowDimensions', () => {
    it('should return the window dimensions', () => {
      // Arrange - jsdom default window size is 1024x768
      
      // Act
      const { result } = renderHook(() => useWindowDimensions());
      
      // Assert
      expect(result.current).toEqual({ width: 1024, height: 768 });
    });

    it('should update when window is resized', () => {
      // Arrange
      const { result } = renderHook(() => useWindowDimensions());
      
      // Act - simulate window resize event
      act(() => {
        // Update window dimensions (jsdom doesn't actually resize)
        Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true });
        
        // Dispatch resize event
        window.dispatchEvent(new Event('resize'));
      });
      
      // Assert
      expect(result.current).toEqual({ width: 500, height: 300 });
    });
  });

  describe('useOutsideClick', () => {
    it('should call callback when clicking outside refs', () => {
      // Arrange
      const callback = vi.fn();
      const ref1 = { current: document.createElement('div') };
      const ref2 = { current: document.createElement('div') };
      
      document.body.appendChild(ref1.current);
      document.body.appendChild(ref2.current);
      
      // Act
      renderHook(() => useOutsideClick([ref1, ref2], callback));
      
      // Simulate click outside refs
      act(() => {
        fireEvent.click(document.body);
      });
      
      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Cleanup
      document.body.removeChild(ref1.current);
      document.body.removeChild(ref2.current);
    });

    it('should not call callback when clicking inside refs', () => {
      // Arrange
      const callback = vi.fn();
      const ref1 = { current: document.createElement('div') };
      
      document.body.appendChild(ref1.current);
      
      // Act
      renderHook(() => useOutsideClick([ref1], callback));
      
      // Simulate click inside ref
      act(() => {
        fireEvent.click(ref1.current);
      });
      
      // Assert
      expect(callback).not.toHaveBeenCalled();
      
      // Cleanup
      document.body.removeChild(ref1.current);
    });

    it('should handle null refs without errors', () => {
      // Arrange
      const callback = vi.fn();
      const ref1 = { current: null };
      
      // Act - should not throw
      renderHook(() => useOutsideClick([ref1], callback));
      
      // Simulate click
      act(() => {
        fireEvent.click(document.body);
      });
      
      // Assert
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useConsoleLog', () => {
    it('should log values to the console', () => {
      // Arrange
      const testValue = { test: 'value' };
      
      // Act
      renderHook(() => useConsoleLog(testValue));
      
      // Assert
      expect(console.log).toHaveBeenCalledWith(
        '%c UseConsole>', 
        'color: #3386FF; font-weight: bold;', 
        testValue
      );
    });

    it('should log when value changes', () => {
      // Arrange
      let value = 'initial';
      
      // Act
      const { rerender } = renderHook(() => useConsoleLog(value));
      
      // Assert initial log
      expect(console.log).toHaveBeenCalledWith(
        '%c UseConsole>', 
        'color: #3386FF; font-weight: bold;', 
        'initial'
      );
      
      // Update value and rerender
      value = 'updated';
      rerender();
      
      // Assert updated log
      expect(console.log).toHaveBeenCalledWith(
        '%c UseConsole>', 
        'color: #3386FF; font-weight: bold;', 
        'updated'
      );
      
      // Verify log was called twice
      expect(console.log).toHaveBeenCalledTimes(2);
    });
  });

  describe('useNodeSize', () => {
    it('should return the node size', () => {
      // Arrange
      const nodeId = 'test-node';
      const expectedSize = { width: 100, height: 50 };
      
      // Mock useNodesData
      (useNodesData as any).mockReturnValue({
        data: {
          size: expectedSize
        }
      });
      
      // Act
      const { result } = renderHook(() => useNodeSize(nodeId));
      
      // Assert
      expect(useNodesData).toHaveBeenCalledWith(nodeId);
      expect(result.current).toEqual(expectedSize);
    });

    it('should return default size when node data is not available', () => {
      // Arrange
      const nodeId = 'non-existent-node';
      
      // Mock useNodesData to return null
      (useNodesData as any).mockReturnValue(null);
      
      // Act
      const { result } = renderHook(() => useNodeSize(nodeId));
      
      // Assert
      expect(result.current).toEqual({ width: 0, height: 0 });
    });

    it('should handle undefined nodeId', () => {
      // Act
      const { result } = renderHook(() => useNodeSize(undefined));
      
      // Assert
      expect(useNodesData).toHaveBeenCalledWith('');
      expect(result.current).toEqual({ width: 0, height: 0 });
    });
  });

  describe('useNodeIndex', () => {
    it('should return the node index', () => {
      // Arrange
      const nodeId = 'test-node';
      const expectedIndex = 42;
      
      // Mock useNodesData
      (useNodesData as any).mockReturnValue({
        data: {
          nodeIndex: expectedIndex
        }
      });
      
      // Act
      const { result } = renderHook(() => useNodeIndex(nodeId));
      
      // Assert
      expect(useNodesData).toHaveBeenCalledWith(nodeId);
      expect(result.current).toEqual(expectedIndex);
    });

    it('should return default index when node data is not available', () => {
      // Arrange
      const nodeId = 'non-existent-node';
      
      // Mock useNodesData to return null
      (useNodesData as any).mockReturnValue(null);
      
      // Act
      const { result } = renderHook(() => useNodeIndex(nodeId));
      
      // Assert
      expect(result.current).toEqual(0);
    });
  });

  describe('useEdgeIndex', () => {
    it('should return the edge index', () => {
      // Arrange
      const edgeId = 'test-edge';
      const expectedIndex = 42;
      
      // Mock useEdgesData
      (useEdgesData as any).mockReturnValue({
        data: {
          edgeIndex: expectedIndex
        }
      });
      
      // Act
      const { result } = renderHook(() => useEdgeIndex(edgeId));
      
      // Assert
      expect(useEdgesData).toHaveBeenCalledWith(edgeId);
      expect(result.current).toEqual(expectedIndex);
    });

    it('should return default index when edge data is not available', () => {
      // Arrange
      const edgeId = 'non-existent-edge';
      
      // Mock useEdgesData to return null
      (useEdgesData as any).mockReturnValue(null);
      
      // Act
      const { result } = renderHook(() => useEdgeIndex(edgeId));
      
      // Assert
      expect(result.current).toEqual(0);
    });
  });

  describe('useNodeLeafIndex', () => {
    it('should return the node leaf index', () => {
      // Arrange
      const nodeId = 'test-node';
      const expectedIndex = 42;
      
      // Mock useNodesData
      (useNodesData as any).mockReturnValue({
        data: {
          nodeLeafIndex: expectedIndex
        }
      });
      
      // Act
      const { result } = renderHook(() => useNodeLeafIndex(nodeId));
      
      // Assert
      expect(useNodesData).toHaveBeenCalledWith(nodeId);
      expect(result.current).toEqual(expectedIndex);
    });

    it('should return default index when node data is not available', () => {
      // Arrange
      const nodeId = 'non-existent-node';
      
      // Mock useNodesData to return null
      (useNodesData as any).mockReturnValue(null);
      
      // Act
      const { result } = renderHook(() => useNodeLeafIndex(nodeId));
      
      // Assert
      expect(result.current).toEqual(0);
    });
  });
});