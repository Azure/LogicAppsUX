import { TreeItem, type TreeItemOpenChangeEvent, type TreeItemOpenChangeData, TreeItemLayout } from '@fluentui/react-components';
import { useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import useIsInViewport from './UseInViewport.hook';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dataMapSchema';
import { DataMapperDesignerContext } from '../../../ui/DataMapperDesigner';
import { useStyles } from './styles';
import { updateReactFlowNode } from '../../../core/state/DataMapSlice';

export type SchemaNodeReactFlowDataProps = SchemaNodeExtended & {
  isLeftDirection: boolean;
  connectionX: number;
  id: string;
  isConnected?: boolean;
};

export type TreeNodeProps = {
  isLeftDirection: boolean;
  text: string;
  id: string;
  isHovered: boolean;
  isAdded: boolean;
  data: SchemaNodeExtended;
};

export const TreeNode = (props: TreeNodeProps) => {
  const { isLeftDirection, id, data } = props;
  const divRef = useRef<HTMLDivElement | null>(null);
  const isInViewPort = useIsInViewport(divRef);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const dataMapperContext = useContext(DataMapperDesignerContext);

  const nodeId = useMemo(() => `reactflow_${isLeftDirection ? 'source' : 'target'}_${id}`, [id, isLeftDirection]);

  const addNodeToFlow = useCallback(() => {
    if (divRef?.current && dataMapperContext.canvasRef?.current) {
      const divRect = divRef.current.getBoundingClientRect();
      const canvasRect = dataMapperContext.canvasRef.current.getBoundingClientRect();
      dispatch(
        updateReactFlowNode({
          node: {
            id: nodeId,
            selectable: true,
            data: {
              ...data,
              isLeftDirection: isLeftDirection,
              connectionX: isLeftDirection ? canvasRect.left : canvasRect.right,
              id: nodeId,
            },
            type: 'schemaNode',
            position: {
              x: divRect.x - canvasRect.left,
              y: divRect.y - canvasRect.y - 10,
            },
          },
        })
      );
    }
  }, [isLeftDirection, divRef, nodeId, data, dispatch, dataMapperContext.canvasRef]);

  const removeNodeFromFlow = useCallback(() => {
    dispatch(
      updateReactFlowNode({
        node: {
          id: nodeId,
          selectable: true,
          hidden: true,
          data: data,
          position: { x: 0, y: 0 },
        },
        removeNode: true,
      })
    );
  }, [nodeId, data, dispatch]);

  const onOpenChange = useCallback(
    (_event: TreeItemOpenChangeEvent, data: TreeItemOpenChangeData) => {
      if (data.open && isInViewPort) {
        addNodeToFlow();
        return;
      }

      if (!data.open) {
        removeNodeFromFlow();
      }
    },
    [isInViewPort, addNodeToFlow, removeNodeFromFlow]
  );

  useEffect(() => {
    if (!divRef?.current || !dataMapperContext.canvasRef?.current || !isInViewPort) {
      removeNodeFromFlow();
    } else {
      addNodeToFlow();
    }
  }, [divRef, isInViewPort, addNodeToFlow, removeNodeFromFlow, dataMapperContext.canvasRef]);
  return (
    <TreeItem
      itemType="leaf"
      key={id}
      onOpenChange={(event: TreeItemOpenChangeEvent, data: TreeItemOpenChangeData) => {
        onOpenChange(event, data);
      }}
    >
      <TreeItemLayout className={isLeftDirection ? '' : styles.rightTreeItemLayout}>
        <div ref={divRef} />
      </TreeItemLayout>
    </TreeItem>
  );
};
