import { TreeItemLayout, mergeClasses } from '@fluentui/react-components';
import { useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import useIsInViewport from './UseInViewport.hook';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { DataMapperWrappedContext } from '../../../core';
import { useStyles } from './styles';
import { updateReactFlowNode } from '../../../core/state/DataMapSlice';

export type SchemaNodeReactFlowDataProps = SchemaNodeExtended & {
  isLeftDirection: boolean;
  connectionX: number;
  id: string;
  isConnected?: boolean;
};

export type TreeNodeProps = {
  isLeaf?: boolean;
  isLeftDirection: boolean;
  text: string;
  id: string;
  isHovered: boolean;
  isAdded: boolean;
  node: SchemaNodeExtended;
};

export const TreeNode = (props: TreeNodeProps) => {
  const { isLeftDirection, id, node, text, isLeaf } = props;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const isInViewPort = useIsInViewport(nodeRef);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const { canvasBounds } = useContext(DataMapperWrappedContext);

  const nodeId = useMemo(() => `reactflow_${isLeftDirection ? 'source' : 'target'}_${id}`, [id, isLeftDirection]);

  const addNodeToFlow = useCallback(
    (currentRef: HTMLDivElement, canvasRect: DOMRect) => {
      const currentNodeRect = currentRef.getBoundingClientRect();

      dispatch(
        updateReactFlowNode({
          node: {
            id: nodeId,
            selectable: true,
            data: {
              ...node,
              isLeftDirection: isLeftDirection,
              connectionX: isLeftDirection ? currentNodeRect.right + 10 : currentNodeRect.left - 10,
              id: nodeId,
            },
            type: 'schemaNode',
            position: {
              x: isLeftDirection ? 0 : canvasRect.width,
              y: currentNodeRect.y - canvasRect.y + 10,
            },
          },
        })
      );
    },
    [isLeftDirection, nodeId, node, dispatch]
  );

  const removeNodeFromFlow = useCallback(() => {
    dispatch(
      updateReactFlowNode({
        node: {
          id: nodeId,
          selectable: true,
          hidden: true,
          data: node,
          position: { x: 0, y: 0 },
        },
        removeNode: true,
      })
    );
  }, [nodeId, node, dispatch]);

  const updateNodePosition = useCallback(() => {
    if (nodeRef?.current && isInViewPort && canvasBounds) {
      addNodeToFlow(nodeRef.current, canvasBounds);
    } else {
      removeNodeFromFlow();
    }
  }, [nodeRef, isInViewPort, canvasBounds, addNodeToFlow, removeNodeFromFlow]);

  const nodeObserver = useMemo(
    () =>
      new MutationObserver(() => {
        updateNodePosition();
      }),
    [updateNodePosition]
  );

  const nodeResizerObserver = useMemo(() => new ResizeObserver(() => updateNodePosition()), [updateNodePosition]);

  useEffect(() => {
    if (nodeRef?.current) {
      updateNodePosition();
      nodeObserver.observe(nodeRef.current, {
        attributes: true,
        childList: true,
        subtree: true,
      });

      nodeResizerObserver.observe(nodeRef.current);
    }

    return () => {
      removeNodeFromFlow();
      nodeObserver.disconnect();
    };
  }, [nodeRef, removeNodeFromFlow, nodeObserver, nodeResizerObserver, updateNodePosition]);
  return (
    <TreeItemLayout
      className={mergeClasses(isLeaf ? '' : styles.rootNode, isLeftDirection ? '' : styles.rightTreeItemLayout)}
      ref={nodeRef}
    >
      {text}
    </TreeItemLayout>
  );
};
