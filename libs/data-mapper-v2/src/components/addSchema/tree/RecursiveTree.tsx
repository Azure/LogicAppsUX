import { Tree, TreeItem, TreeItemLayout, type TreeItemOpenChangeData, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { useStyles } from './styles';
import type { Node } from 'reactflow';
import useNodePosition from './useNodePosition';
import { getReactFlowNodeId } from '../../../utils/Schema.Utils';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  setOpenKeys: (openKeys: Set<string>) => void;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  setUpdatedNodes: React.Dispatch<React.SetStateAction<Record<string, Node>>>;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, openKeys, setOpenKeys, flattenedScehmaMap, setUpdatedNodes } = props;
  const { key } = root;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();

  const {
    position: { x, y },
  } = useNodePosition({
    key: key,
    openKeys: openKeys,
    schemaMap: flattenedScehmaMap,
    isLeftDirection: isLeftDirection,
    nodeX: nodeRef.current?.getBoundingClientRect().x,
    nodeY: nodeRef.current?.getBoundingClientRect().y,
  });

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
    const nodeId = getReactFlowNodeId(root.key, isLeftDirection);
    const node = {
      id: nodeId,
      selectable: true,
      data: {
        ...root,
        isLeftDirection: isLeftDirection,
      },
      type: 'schemaNode',
      position: { x, y },
    };

    // Remove the current node from the updated nodes if it exists
    setUpdatedNodes((prev) => {
      const updatedNodes = { ...prev };
      if (updatedNodes[nodeId]) {
        delete updatedNodes[nodeId];
        return updatedNodes;
      }
      return prev;
    });

    // Add the current node back to the map
    setUpdatedNodes((prev) => {
      const updatedNodes = { ...prev };
      updatedNodes[nodeId] = node;
      return updatedNodes;
    });
  }, [isLeftDirection, x, y, root, setUpdatedNodes]);

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
              setUpdatedNodes={setUpdatedNodes}
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};

export default RecursiveTree;
