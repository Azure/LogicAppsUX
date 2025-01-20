import React from 'react';
import { useResizeObserver } from '@react-hookz/web';
import { useReactFlow } from '@xyflow/react';
import { useLayout } from '../core/graphlayout';
import { DEFAULT_NODE_SIZE } from '../core/utils/graph';
import { clamp } from '@microsoft/logic-apps-shared';

interface Size {
  width: number;
  height: number;
  zoom?: number;
}

interface CanvasSizeMonitorProps {
  canvasRef: React.RefObject<Element>;
}

export const CanvasSizeMonitor = (props: CanvasSizeMonitorProps) => {
  const { canvasRef } = props;

  const { getViewport, setViewport } = useReactFlow();
  const [_nodes, _edges, flowSize] = useLayout();
  const [prevSize, setPrevSize] = React.useState(canvasRef.current?.getBoundingClientRect() ?? { width: 0, height: 0 });

  const getTranslateExtent = React.useCallback(
    ({
      width,
      height,
      zoom = 1,
    }: Size): {
      x: { min: number; max: number };
      y: { min: number; max: number };
    } => {
      const padding = 64 * zoom;
      const [flowWidth, flowHeight] = flowSize;

      return {
        x: {
          min: -flowWidth * zoom + DEFAULT_NODE_SIZE.width * zoom + padding,
          max: width - DEFAULT_NODE_SIZE.width * zoom - padding,
        },
        y: {
          min: -flowHeight * zoom + DEFAULT_NODE_SIZE.height * zoom + padding,
          max: height - DEFAULT_NODE_SIZE.height * zoom - padding,
        },
      };
    },
    [flowSize]
  );

  const updateCanvas = React.useCallback(
    ({ width, height }: Size) => {
      const v = getViewport();
      const xDiff = width - prevSize.width;
      const yDiff = height - prevSize.height;
      v.x += xDiff / 2;
      v.y += yDiff / 2;

      const translateExtent = getTranslateExtent({ width, height, zoom: v.zoom });

      v.x = clamp(v.x, translateExtent.x.min, translateExtent.x.max);
      v.y = clamp(v.y, translateExtent.y.min, translateExtent.y.max);

      setViewport(v);
      setPrevSize({ width, height });
    },
    [getViewport, prevSize, setViewport, getTranslateExtent]
  );

  useResizeObserver(canvasRef, (el) => updateCanvas(el.contentRect));

  return null;
};
