import { Text, TreeItem, TreeItemLayout, type TreeItemOpenChangeEvent, type TreeItemOpenChangeData } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useEffect, useRef, useCallback, useContext } from 'react';
import useIsInViewport from './UseInViewport.hook';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';
import { updateReactFlowNode } from '../../../core/state/DataMapSlice';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/dataMapSchema';
import { DataMapperDesignerContext } from '../../../ui/DataMapperDesigner';

export type SchemaNodeReactFlowDataProps = SchemaNodeExtended & {
  isLeftDirection: boolean;
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
  const { text, isLeftDirection, id, data } = props;
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);
  const isInViewPort = useIsInViewport(ref);
  const dispatch = useDispatch<AppDispatch>();
  const dataMapperContext = useContext(DataMapperDesignerContext);

  const addNodeToFlow = useCallback(() => {
    if (ref?.current && dataMapperContext.canvasRef?.current) {
      const rect = ref.current.getBoundingClientRect();
      const canvasRect = dataMapperContext.canvasRef.current.getBoundingClientRect();
      dispatch(
        updateReactFlowNode({
          node: {
            id: `${id}-${isLeftDirection ? 'source' : 'target'}`,
            data: { ...data, isLeftDirection: isLeftDirection },
            type: 'schemaNode',
            position: {
              x: isLeftDirection ? -10 : canvasRect.right - canvasRect.left - 10,
              y: rect.y - canvasRect.y,
            },
          },
          isSourceNode: isLeftDirection,
        })
      );
    }
  }, [isLeftDirection, ref, id, data, dispatch, dataMapperContext.canvasRef]);

  const removeNodeFromFlow = useCallback(() => {
    dispatch(
      updateReactFlowNode({
        node: {
          id: `${id}-${isLeftDirection ? 'source' : 'target'}`,
          data: data,
          position: { x: 0, y: 0 },
        },
        isSourceNode: isLeftDirection,
        removeNode: true,
      })
    );
  }, [isLeftDirection, id, data, dispatch]);

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
    if (!ref?.current || !isInViewPort) {
      removeNodeFromFlow();
    } else {
      addNodeToFlow();
    }
  }, [ref, isInViewPort, addNodeToFlow, removeNodeFromFlow]);
  return (
    <TreeItem
      itemType="leaf"
      key={id}
      onOpenChange={(event: TreeItemOpenChangeEvent, data: TreeItemOpenChangeData) => {
        onOpenChange(event, data);
      }}
    >
      <TreeItemLayout className={isLeftDirection ? '' : styles.rightTreeItemLayout} ref={ref}>
        <Text>{text}</Text>
      </TreeItemLayout>
    </TreeItem>
  );
};
