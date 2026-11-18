import { renderHook } from '@testing-library/react';
import { type EdgeProps, Position, useInternalNode } from '@xyflow/react';
import type { Handle } from '@xyflow/system';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useSelector } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeIds } from '../../../../../constants/ReactFlowConstants';
import type { RootState } from '../../../../../core/state/Store';
import useEdgePath from '../useEdgePath';

vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  useInternalNode: vi.fn(),
}));
vi.mock('react-redux', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-redux')>()),
  useSelector: vi.fn(),
}));

const root = { key: '/root', children: [], pathToRoot: [] } as unknown as SchemaNodeExtended;
const child = { key: '/root/child', children: [], pathToRoot: [root] } as unknown as SchemaNodeExtended;
const schemaRoot = { ...root, children: [child] };
const handle = (id: string, width: number, height = width): Handle => ({
  id,
  x: 30,
  y: 40,
  width,
  height,
  position: Position.Right,
  type: 'source',
  nodeId: NodeIds.source,
});

describe('useEdgePath', () => {
  let state: RootState;
  let sourceHandles: Handle[];
  let targetHandles: Handle[];
  let targetX: number;
  let props: EdgeProps;

  beforeEach(() => {
    targetX = 900;
    sourceHandles = [handle('source-/root/child', 16)];
    targetHandles = [handle('target-/root/child', 16)];
    const treeData = { visibleNodes: [root, child], startIndex: 0, endIndex: 1 };
    state = {
      dataMap: {
        present: {
          curDataMapOperation: {
            sourceSchema: { schemaTreeRoot: schemaRoot },
            targetSchema: { schemaTreeRoot: schemaRoot },
            sourceOpenKeys: { '/root': true },
            targetOpenKeys: { '/root': true },
            sourceSchemaTreeData: { ...treeData },
            targetSchemaTreeData: { ...treeData },
          },
        },
      },
    } as unknown as RootState;
    vi.mocked(useSelector).mockImplementation((selector) => selector(state));
    vi.mocked(useInternalNode).mockImplementation(
      (id) =>
        ({
          internals: {
            positionAbsolute: { x: id === NodeIds.source ? 100 : targetX, y: 50 },
            handleBounds: { source: sourceHandles, target: targetHandles },
          },
        }) as ReturnType<typeof useInternalNode>
    );
    props = {
      source: NodeIds.source,
      target: NodeIds.target,
      sourceX: 1,
      sourceY: 2,
      targetX: 3,
      targetY: 4,
      data: { sourceHandleId: 'source-/root/child', targetHandleId: 'target-/root/child' },
    } as EdgeProps;
  });

  it.each([
    [16, 16],
    [18, 18],
    [20, 20],
    [14, 22],
  ])('centers %s by %s handles on both sides', (width, height) => {
    sourceHandles = [handle('source-/root/child', width, height)];
    targetHandles = [handle('target-/root/child', width, height)];
    const { result } = renderHook(() => useEdgePath(props));
    expect(result.current).toEqual({
      sourceX: 130 + width / 2,
      sourceY: 90 + height / 2,
      sourceScenario: 'direct',
      targetX: 930 + width / 2,
      targetY: 90 + height / 2,
      targetScenario: 'direct',
    });
  });

  it('updates after selection, scroll measurement and canvas resize', () => {
    const { result, rerender } = renderHook(() => useEdgePath(props));
    sourceHandles = [{ ...handle('source-/root/child', 20), x: 35, y: 15 }];
    targetHandles = [{ ...handle('target-/root/child', 18), x: 10, y: 25 }];
    targetX = 700;
    rerender();
    expect(result.current).toMatchObject({ sourceX: 145, sourceY: 75, targetX: 719, targetY: 84 });
  });

  it('uses the collapsed ancestor dimensions rather than the hidden child', () => {
    const operation = state.dataMap.present.curDataMapOperation;
    operation.sourceOpenKeys = { '/root': false };
    operation.sourceSchemaTreeData = { visibleNodes: [root], startIndex: 0, endIndex: 0 };
    sourceHandles = [handle('source-/root', 20, 18)];
    const { result } = renderHook(() => useEdgePath(props));
    expect(result.current).toMatchObject({ sourceX: 140, sourceY: 99, sourceScenario: 'collapsed' });
  });

  it.each(['top', 'bottom'])('centers the %s scroll fallback, not the offscreen handle', (direction) => {
    const operation = state.dataMap.present.curDataMapOperation;
    operation.sourceSchemaTreeData = {
      visibleNodes: [root, child],
      startIndex: direction === 'top' ? 1 : 0,
      endIndex: direction === 'top' ? 1 : 0,
    };
    props = { ...props, data: { ...props.data, sourceHandleId: direction === 'top' ? 'source-/root' : 'source-/root/child' } };
    sourceHandles = [handle(`${direction}-left`, 6)];
    const { result } = renderHook(() => useEdgePath(props));
    expect(result.current).toMatchObject({ sourceX: 133, sourceY: 93, sourceScenario: 'scroll' });
  });

  it('hides an endpoint absent from the search result', () => {
    state.dataMap.present.curDataMapOperation.sourceSchemaTreeData = { visibleNodes: [root], startIndex: 0, endIndex: 0 };
    const { result } = renderHook(() => useEdgePath(props));
    expect(result.current.sourceX).toBeUndefined();
    expect(result.current.sourceY).toBeUndefined();
  });

  it('keeps React Flow coordinates for function nodes', () => {
    props = { ...props, source: 'function-1', target: 'function-2' };
    const { result } = renderHook(() => useEdgePath(props));
    expect(result.current).toEqual({ sourceX: 1, sourceY: 2, sourceScenario: 'direct', targetX: 3, targetY: 4, targetScenario: 'direct' });
  });
});
