import { useState, useEffect, useContext } from 'react';
import type { XYPosition } from 'reactflow';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';

type NodePositionProps = {
  key: string;
  openKeys: Set<string>;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodeBounds?: DOMRect;
};

function isTreeNodeHidden(schemaMap: Record<string, SchemaNodeExtended>, openKeys: Set<string>, key?: string) {
  if (!key) {
    return false;
  }

  if (!openKeys.has(key)) {
    return true;
  }

  return isTreeNodeHidden(schemaMap, openKeys, schemaMap[key]?.parentKey);
}

const useNodePosition = (props: NodePositionProps) => {
  const { schemaMap, openKeys, key, isLeftDirection, nodeBounds } = props;
  const [position, setPosition] = useState<XYPosition>({ x: -1, y: -1 });

  const { canvasBounds } = useContext(DataMapperWrappedContext);

  useEffect(() => {
    if (isTreeNodeHidden(schemaMap, openKeys, schemaMap[key]?.parentKey)) {
      setPosition({ x: -1, y: -1 });
    } else if (canvasBounds && nodeBounds) {
      const x = isLeftDirection ? 0 : canvasBounds.width;
      const y = nodeBounds.y - canvasBounds.y + 10;
      setPosition({ x, y });
    }
  }, [openKeys, schemaMap, canvasBounds, nodeBounds, position, isLeftDirection, key]);

  return position;
};

export default useNodePosition;
