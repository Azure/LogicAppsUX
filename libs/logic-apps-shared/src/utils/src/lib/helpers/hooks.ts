import { useNodesData } from '@xyflow/react';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEdgesData } from './useEdgesData';

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

function getWindowDimensions() {
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

export const useNodeIndex = (nodeId?: string) => {
  return (useNodesData(nodeId ?? '')?.data?.['nodeIndex'] as number) ?? 0;
};

export const useEdgeIndex = (edgeId?: string) => {
  return (useEdgesData(edgeId ?? '')?.data?.['edgeIndex'] as number) ?? 0;
};

export const useNodeLeafIndex = (nodeId?: string) => {
  return (useNodesData(nodeId ?? '')?.data?.['nodeLeafIndex'] as number) ?? 0;
};
