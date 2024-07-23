import { useState, useLayoutEffect, useContext } from 'react';
import type { XYPosition } from '@xyflow/react';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';

type NodePositionProps = {
  key: string;
  openKeys: Set<string>;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodePositionX?: number;
  nodePositionY?: number;
  treePositionX?: number;
  treePositionY?: number;
  onScreen?: boolean;
};

const useNodePosition = (props: NodePositionProps) => {
  const { schemaMap, openKeys, key, isLeftDirection, onScreen, treePositionY, nodePositionY } = props;
  const [position, setPosition] = useState<XYPosition>();

  const {
    canvasBounds: { y: canvasY, width: canvasWidth } = {
      y: undefined,
      width: undefined,
    },
  } = useContext(DataMapperWrappedContext);

  useLayoutEffect(() => {
    const isNodeCollapsed = (parentKey?: string) => {
      if (!parentKey) {
        return false;
      }

      if (!openKeys.has(parentKey)) {
        return true;
      }

      return isNodeCollapsed(schemaMap[parentKey]?.parentKey);
    };

    if (isLeftDirection) {
      console.log(
        'Key :: ',
        key,
        ' ;TreeY :: ',
        treePositionY,
        ' ;NodeY :: ',
        nodePositionY,
        ' ;OnScreen :: ',
        onScreen,
        ' ;CanvasY :: ',
        canvasY,
        ' ;CanvasWidth :: ',
        canvasWidth
      );
    }
    // Don't look for the node position if tree, node or canvas isn't on the screen yet
    if (
      treePositionY === undefined ||
      nodePositionY === undefined ||
      onScreen === undefined ||
      canvasY === undefined ||
      canvasWidth === undefined
    ) {
      return;
    }

    const collapsed = isNodeCollapsed(schemaMap[key]?.parentKey);
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;

    if (!onScreen || !schemaMap[key] || collapsed || nodePositionY < treePositionY) {
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
  }, [onScreen, schemaMap, openKeys, setPosition, canvasY, canvasWidth, nodePositionY, isLeftDirection, key, treePositionY]);

  return { position };
};

export default useNodePosition;
