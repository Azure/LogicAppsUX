import { useState, useLayoutEffect, useContext } from 'react';
import type { XYPosition } from '@xyflow/react';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';

type NodePositionProps = {
  key: string;
  openKeys: Set<string>;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodeX?: number;
  nodeY?: number;
};

function isTreeNodeHidden(schemaMap: Record<string, SchemaNodeExtended>, openKeys: Set<string>, key?: string): boolean {
  if (!key) {
    return false;
  }

  if (!openKeys.has(key)) {
    return true;
  }

  return isTreeNodeHidden(schemaMap, openKeys, schemaMap[key]?.parentKey);
}

const useNodePosition = (props: NodePositionProps) => {
  const { schemaMap, openKeys, key, isLeftDirection, nodeY = -1 } = props;
  const [position, setPosition] = useState<XYPosition>();

  const {
    canvasBounds: { y: canvasY = -1, width: canvasWidth = -1 } = {},
  } = useContext(DataMapperWrappedContext);

  useLayoutEffect(() => {
    if (isTreeNodeHidden(schemaMap, openKeys, schemaMap[key]?.parentKey)) {
      setPosition({ x: -1, y: -1 });
    } else if (canvasY >= 0 && nodeY >= 0 && canvasWidth >= 0) {
      const x = isLeftDirection ? 0 : canvasWidth;
      const y = nodeY - canvasY + 10;
      setPosition({ x, y });
    }
  }, [openKeys, schemaMap, canvasY, canvasWidth, nodeY, isLeftDirection, key]);

  return { position };
};

export default useNodePosition;
