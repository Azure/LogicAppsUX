import { Tree, TreeItem, TreeItemLayout, type TreeItemOpenChangeData, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { useStyles } from './styles';
import { DataMapperWrappedContext } from '../../../core';
import type { Node } from 'reactflow';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  setOpenKeys: (openKeys: Set<string>) => void;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  setUpdatedNode: (node: Node) => void;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, openKeys, setOpenKeys, flattenedScehmaMap, setUpdatedNode } = props;
  const { key } = root;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();

  const { canvasBounds } = useContext(DataMapperWrappedContext);

  const currentNode = useMemo(
    () => ({
      id: `reactflow_${isLeftDirection ? 'source' : 'target'}_${key}`,
      selectable: true,
      data: {
        ...root,
        isLeftDirection: isLeftDirection,
        id: `reactflow_${isLeftDirection ? 'source' : 'target'}_${key}`,
      },
      type: 'schemaNode',
      position: {
        x: 0,
        y: 0,
      },
    }),
    [isLeftDirection, key, root]
  );

  const onOpenChange = useCallback(
    (_e: any, data: TreeItemOpenChangeData) => {
      const newOpenKeys = new Set(openKeys);
      const value = data.value as string;
      if (newOpenKeys.has(value)) {
        newOpenKeys.delete(value);
      } else {
        newOpenKeys.add(value);
      }
      setOpenKeys(newOpenKeys);
    },
    [openKeys, setOpenKeys]
  );

  useLayoutEffect(() => {
    let { x, y } = currentNode.position;

    // NOTE: Node should be hidden if a parent at any level is hidden
    function isNodeHidden(key?: string) {
      if (!key) {
        return false;
      }

      if (!openKeys.has(key)) {
        return true;
      }

      return isNodeHidden(flattenedScehmaMap[key]?.parentKey);
    }

    if (isNodeHidden(root.parentKey)) {
      x = 0;
      y = 0;
    } else if (nodeRef?.current && canvasBounds) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      x = currentNode.data.isLeftDirection ? 0 : canvasBounds.width;
      y = nodeRect.y - canvasBounds.y + 10;
    } else {
      x = 0;
      y = 0;
    }

    setUpdatedNode({ ...currentNode, position: { x, y } });
  }, [openKeys, nodeRef, canvasBounds, flattenedScehmaMap, currentNode, setUpdatedNode, root]);

  if (root.children.length === 0) {
    return (
      <TreeItem itemType="leaf" id={key} value={key} ref={nodeRef}>
        <TreeItemLayout className={isLeftDirection ? '' : styles.rightTreeItemLayout}>{root.name}</TreeItemLayout>
      </TreeItem>
    );
  }

  return (
    <TreeItem itemType="branch" id={key} value={key} ref={nodeRef} open={openKeys.has(key)} onOpenChange={onOpenChange}>
      <TreeItemLayout className={mergeClasses(styles.rootNode, isLeftDirection ? '' : styles.rightTreeItemLayout)}>
        {root.name}
      </TreeItemLayout>
      <Tree aria-label="sub-tree">
        {root.children.map((child: SchemaNodeExtended, index: number) => (
          <span key={`tree-${child.key}-${index}`}>
            <RecursiveTree
              root={child}
              isLeftDirection={isLeftDirection}
              openKeys={openKeys}
              setOpenKeys={setOpenKeys}
              flattenedScehmaMap={flattenedScehmaMap}
              setUpdatedNode={setUpdatedNode}
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};

export default RecursiveTree;
