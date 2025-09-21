import type { NodeOrigin, Box, Rect } from '@xyflow/react';
import { useNodesData, useInternalNode, useNodes } from '@xyflow/react';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEdgesData } from './useEdgesData';
import type { Size } from '../models/graphics';
import type { InternalNodeBase, NodeBase } from '@xyflow/system';
import { boxToRect, getBoundsOfBoxes, getNodePositionWithOrigin, isInternalNodeBase } from '@xyflow/system';

export const useThrottledEffect = (effect: () => void, deps: any[], delay: number) => {
  const timestamp = useRef(Date.now());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const callback = useCallback(effect, deps); // Our trace was making this loop infinitely if we depend on the effect

  useEffect(() => {
    const timeoutFunc = () => {
      if (Date.now() - timestamp.current >= delay) {
        callback();
        timestamp.current = Date.now();
      }
    };
    const handler = setTimeout(timeoutFunc, delay - (Date.now() - timestamp.current));
    return () => clearTimeout(handler);
  }, [callback, delay]);
};

function getWindowDimensions(): Size {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

export const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
};

export const useOutsideClick = (refs: MutableRefObject<any>[], callback: () => void) => {
  const handleClick = (e: MouseEvent) => {
    let sendCallback = true;
    for (const ref of refs) {
      if (ref.current && ref.current.contains(e.target)) {
        sendCallback = false;
      }
    }
    if (sendCallback) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  });
};

export const useConsoleLog = (value: any) =>
  useEffect(() => console.log('%c UseConsole>', 'color: #3386FF; font-weight: bold;', value), [value]);

export const useNodeSize = (nodeId?: string) => {
  return (useNodesData(nodeId ?? '')?.data?.['size'] as { width: number; height: number }) ?? { width: 0, height: 0 };
};

export const useNodeIndex = (nodeId?: string) => {
  return (useNodesData(nodeId ?? '')?.data?.['nodeIndex'] as number) ?? 0;
};

export const useEdgeIndex = (edgeId?: string) => {
  return (useEdgesData(edgeId ?? '')?.data?.['edgeIndex'] as number) ?? 0;
};

export const useNodeLeafIndex = (nodeId?: string) => {
  return (useNodesData(nodeId ?? '')?.data?.['nodeLeafIndex'] as number) ?? 0;
};

export function useNodeGlobalPosition(nodeId: string = '') {
  return useInternalNode(nodeId)?.internals?.positionAbsolute ?? { x: 0, y: 0 };
}

export function useGraphNodeBounds(nodeId: string = ''): Rect {
  const nodes = useNodes();
  const nodeData = useNodesData(nodeId);
  const childIds: string[] = useMemo(() => (nodeData?.data as any)?.childIds ?? [], [nodeData?.data]);
  const childNodes = useMemo(() => nodes.filter((n) => childIds.includes(n.id)), [nodes, childIds]);
  
  return useMemo(() => {
    if (childNodes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
  
    const box = childNodes.reduce(
      (currBox, node) => getBoundsOfBoxes(currBox, node ? nodeToBox(node) : { x: 0, y: 0, x2: 0, y2: 0 }),
      { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity }
    );
  
    return boxToRect(box);
  }, [childNodes]);
}

export const nodeToBox = (node: InternalNodeBase | NodeBase, nodeOrigin: NodeOrigin = [0, 0]): Box => {
  const { x, y } = isInternalNodeBase(node)
    ? node.internals.positionAbsolute
    : getNodePositionWithOrigin(node, nodeOrigin);

  return {
    x,
    y,
    x2: x + ((node.data?.['width'] as number) ?? node.measured?.width ?? node.width ?? node.initialWidth ?? 0),
    y2: y + ((node.data?.['height'] as number) ?? node.measured?.height ?? node.height ?? node.initialHeight ?? 0),
  };
};
