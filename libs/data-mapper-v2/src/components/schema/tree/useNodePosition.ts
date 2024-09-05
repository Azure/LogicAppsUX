import { useState, useEffect } from 'react';
import type { XYPosition } from '@xyflow/react';
import { emptyCanvasRect, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { updateTemporaryNodeDirection } from '../../../core/state/DataMapSlice';

type NodePositionProps = {
  key: string;
  nodeId: string;
  schemaMap: Record<string, SchemaNodeExtended>;
  isLeftDirection: boolean;
  nodePositionX?: number;
  nodePositionY?: number;
  treePositionX?: number;
  treePositionY?: number;
  onScreen?: boolean;
};

const useNodePosition = (props: NodePositionProps) => {
  const { schemaMap, key, isLeftDirection, onScreen, treePositionY, nodePositionY, nodeId } = props;
  const [position, setPosition] = useState<XYPosition>();
  const dispatch = useDispatch<AppDispatch>();
  const currentCanvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect
  );

  const { y: canvasY, width: canvasWidth, height: canvasHeight } = currentCanvasRect;

  useEffect(() => {
    if (
      treePositionY === undefined ||
      nodePositionY === undefined ||
      canvasY === undefined ||
      canvasY === -1 ||
      canvasWidth === 0 ||
      canvasHeight === 0 ||
      canvasHeight === undefined ||
      canvasWidth === undefined ||
      onScreen === undefined
    ) {
      return;
    }

    let x: number | undefined = undefined;
    let y: number | undefined = undefined;

    if (!schemaMap[key] || !onScreen || nodePositionY < treePositionY) {
      x = -1;
      y = -1;
    } else if (nodePositionY >= 0 && canvasY >= 0 && canvasWidth >= 0) {
      x = isLeftDirection ? 0 : canvasWidth;
      y = nodePositionY - canvasY + 10;
    }

    if (x !== undefined && y !== undefined) {
      setPosition({ x, y });
      dispatch(
        updateTemporaryNodeDirection({
          id: nodeId,
          direction: nodePositionY < treePositionY ? 'top' : nodePositionY > canvasHeight ? 'bottom' : undefined,
        })
      );
    } else {
      setPosition(undefined);
    }
  }, [
    onScreen,
    schemaMap,
    setPosition,
    canvasY,
    canvasWidth,
    canvasHeight,
    nodePositionY,
    isLeftDirection,
    key,
    treePositionY,
    nodeId,
    dispatch,
  ]);

  return { position };
};

export default useNodePosition;
