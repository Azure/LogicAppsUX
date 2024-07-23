import { useState, useLayoutEffect, useContext } from 'react';
import type { XYPosition } from '@xyflow/react';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';

type NodePositionProps = {
  key: string;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodePositionX?: number;
  nodePositionY?: number;
  treePositionX?: number;
  treePositionY?: number;
  onScreen?: boolean;
};

const useNodePosition = (props: NodePositionProps) => {
  const { schemaMap, key, isLeftDirection, onScreen, treePositionY, nodePositionY } = props;
  const [position, setPosition] = useState<XYPosition>();

  const {
    canvasBounds: { y: canvasY, width: canvasWidth } = {
      y: undefined,
      width: undefined,
    },
  } = useContext(DataMapperWrappedContext);

  useLayoutEffect(() => {
    // Don't look for the node position if tree, node or canvas isn't on the screen yet
    if (
      treePositionY === undefined ||
      nodePositionY === undefined ||
      canvasY === undefined ||
      canvasWidth === undefined ||
      onScreen === undefined
    ) {
      return;
    }

    let x: number | undefined = undefined;
    let y: number | undefined = undefined;

    if (!schemaMap[key] || nodePositionY < treePositionY) {
      x = -1;
      y = -1;
    } else if (nodePositionY >= 0 && canvasY >= 0 && canvasWidth >= 0) {
      x = isLeftDirection ? 0 : canvasWidth;
      y = nodePositionY - canvasY + 10;
    }

    if (x !== undefined && y !== undefined) {
      setPosition({ x, y });
    } else {
      setPosition(undefined);
    }
  }, [onScreen, schemaMap, setPosition, canvasY, canvasWidth, nodePositionY, isLeftDirection, key, treePositionY]);

  return { position };
};

export default useNodePosition;
