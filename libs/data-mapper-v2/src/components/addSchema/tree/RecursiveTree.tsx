import { Tree, TreeItem, TreeItemLayout, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useStyles } from './styles';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';
import { DataMapperWrappedContext } from '../../../core';
import { updateReactFlowNode } from '../../../core/state/DataMapSlice';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  refreshTree: boolean;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, refreshTree } = props;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const nodeId = useMemo(() => `reactflow_${isLeftDirection ? 'source' : 'target'}_${root.key}`, [root.key, isLeftDirection]);

  const { canvasBounds } = useContext(DataMapperWrappedContext);

  const addNodeToFlow = useCallback(
    (nodeRect: DOMRect, canvasRect: DOMRect) => {
      dispatch(
        updateReactFlowNode({
          node: {
            id: nodeId,
            selectable: true,
            data: {
              ...root,
              isLeftDirection: isLeftDirection,
              connectionX: isLeftDirection ? nodeRect.right + 10 : nodeRect.left - 10,
              id: nodeId,
            },
            type: 'schemaNode',
            position: {
              x: isLeftDirection ? 0 : canvasRect.width,
              y: nodeRect.y - canvasRect.y + 10,
            },
          },
        })
      );
    },
    [isLeftDirection, nodeId, root, dispatch]
  );

  const removeNodeFromFlow = useCallback(() => {
    dispatch(
      updateReactFlowNode({
        node: {
          id: nodeId,
          selectable: true,
          hidden: true,
          data: root,
          position: { x: 0, y: 0 },
        },
        removeNode: true,
      })
    );
  }, [nodeId, root, dispatch]);

  useEffect(() => {
    if (nodeRef?.current && canvasBounds) {
      addNodeToFlow(nodeRef.current.getBoundingClientRect(), canvasBounds);
    }

    return () => {
      removeNodeFromFlow();
    };
  }, [refreshTree, removeNodeFromFlow, nodeRef, addNodeToFlow, canvasBounds]);

  if (root.children.length === 0) {
    return (
      <TreeItem itemType="leaf" id={root.key} value={root.key} ref={nodeRef}>
        <TreeItemLayout className={isLeftDirection ? '' : styles.rightTreeItemLayout}>{root.name}</TreeItemLayout>
      </TreeItem>
    );
  }

  return (
    <TreeItem itemType="branch" id={root.key} value={root.key} ref={nodeRef}>
      <TreeItemLayout className={mergeClasses(styles.rootNode, isLeftDirection ? '' : styles.rightTreeItemLayout)}>
        {root.name}
      </TreeItemLayout>
      <Tree aria-label="sub-tree">
        {root.children.map((child: SchemaNodeExtended, index: number) => (
          <span key={`tree-${child.key}-${index}`}>
            <RecursiveTree root={child} isLeftDirection={isLeftDirection} refreshTree={refreshTree} />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};

export default RecursiveTree;
