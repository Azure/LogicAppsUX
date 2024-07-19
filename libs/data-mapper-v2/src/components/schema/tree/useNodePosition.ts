import { useState, useLayoutEffect, useContext } from 'react';
import type { XYPosition } from 'reactflow';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';

type NodePositionProps = {
  key: string;
  openKeys: Set<string>;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodePosition?: XYPosition;
  treePosition?: XYPosition;
  onScreen?: boolean;
};

const useNodePosition = (props: NodePositionProps) => {
  const {
    schemaMap,
    openKeys,
    key,
    isLeftDirection,
    onScreen,
    treePosition: { y: treeY } = { x: undefined, y: undefined },
    nodePosition: { y: nodeY } = { x: undefined, y: undefined },
  } = props;
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

    // Don't look for the node position if tree, node or canvas isn't on the screen yet
    if (treeY === undefined || nodeY === undefined || onScreen === undefined || canvasY === undefined || canvasWidth === undefined) {
      return;
    }

    const collapsed = isNodeCollapsed(schemaMap[key]?.parentKey);
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;

    if (!onScreen || !schemaMap[key] || collapsed || nodeY < treeY) {
      x = -1;
      y = -1;
    } else if (nodeY >= 0 && canvasY >= 0 && canvasWidth >= 0) {
      x = isLeftDirection ? 0 : canvasWidth;
      y = nodeY - canvasY + 10;
    }

    console.log(' Key: ', key, ' ; X: ', x, '  ;Y: ', y);

    if (x !== undefined && y !== undefined) {
      setPosition({ x, y });
    } else {
      setPosition(undefined);
    }
  }, [onScreen, schemaMap, openKeys, setPosition, canvasY, canvasWidth, nodeY, isLeftDirection, key, treeY]);

  return { position };
};

export default useNodePosition;
