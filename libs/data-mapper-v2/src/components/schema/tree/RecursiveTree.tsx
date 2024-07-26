import { Tree, TreeItem, TreeItemLayout, type TreeItemOpenChangeData, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useStyles } from './styles';
import useNodePosition from './useNodePosition';
import { getReactFlowNodeId } from '../../../utils/Schema.Utils';
import useOnScreen from './useOnScreen';
import type { Node } from '@xyflow/react';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  visibleKeys: Set<string>;
  setOpenKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setVisibleKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  setUpdatedNode: (node: Node) => void;
  treePositionX?: number;
  treePositionY?: number;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const {
    root,
    isLeftDirection,
    openKeys,
    setOpenKeys,
    flattenedScehmaMap,
    treePositionX,
    treePositionY,
    setUpdatedNode,
    visibleKeys,
    setVisibleKeys,
  } = props;
  const { key } = root;
  const nodeVisble = useMemo(() => !!flattenedScehmaMap[key], [flattenedScehmaMap, key]);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();
  const onScreen = useOnScreen(nodeRef);

  const {
    position: { x, y } = { x: undefined, y: undefined },
  } = useNodePosition({
    key: key,
    onScreen: onScreen,
    schemaMap: flattenedScehmaMap,
    isLeftDirection: isLeftDirection,
    openKeys: openKeys,
    nodePositionX: nodeRef?.current?.getBoundingClientRect().x,
    nodePositionY: nodeRef?.current?.getBoundingClientRect().y,
    treePositionX,
    treePositionY,
  });

  const nodeId = useMemo(() => getReactFlowNodeId(key, isLeftDirection), [key, isLeftDirection]);

  const getAllVisibleOrHiddenNodes = useCallback(
    (key: string, openKeys: Set<string>, findVisibleNodes = true) => {
      const node = flattenedScehmaMap[key];
      const allNodes: string[] = [key];
      // findVisibleNodes denotes whether the root node (current Component) is expaned or collapsed
      // Node children are only traversed if the current key is expanded or,
      // we are trying to find the hidden nodes to delete them
      if ((findVisibleNodes && openKeys.has(key)) || !findVisibleNodes) {
        for (const child of node?.children ?? []) {
          allNodes.push(...getAllVisibleOrHiddenNodes(child.key, openKeys, findVisibleNodes));
        }
      }
      return allNodes;
    },
    [flattenedScehmaMap]
  );

  const onOpenChange = useCallback(
    (_e: any, data: TreeItemOpenChangeData) => {
      const key = data.value as string;
      const updatedOpenKeys = new Set(openKeys);
      const updatedVisibleKeys = new Set(visibleKeys);
      const visible = data.open;

      if (visible) {
        updatedOpenKeys.add(key);
      } else {
        updatedOpenKeys.delete(key);
      }
      setOpenKeys(updatedOpenKeys);

      const updatedVisibleNodesWithCollapseExpandToggle = getAllVisibleOrHiddenNodes(key, updatedOpenKeys, visible);
      for (const node of updatedVisibleNodesWithCollapseExpandToggle) {
        if (visible) {
          updatedVisibleKeys.add(node);
        } else if (node !== key) {
          // In case of collapse, the current node should not be removed since that will still be visible
          updatedVisibleKeys.delete(node);
        }
      }
      setVisibleKeys(updatedVisibleKeys);

      // if (allChildren.length > 0 && !data.open) {
      //   allChildren.push(data.value as string);
      //   applyNodeChanges(
      //     allChildren.map((child) => ({
      //       type: "remove",
      //       id: getReactFlowNodeId(child, isLeftDirection),
      //     })),
      //     nodes
      //   );

      //   const newNodes = isLeftDirection
      //     ? { ...sourceNodesMap }
      //     : { ...targetNodesMap };

      //   for (const child of allChildren) {
      //     delete newNodes[getReactFlowNodeId(child, isLeftDirection)];
      //   }

      //   dispatch(
      //     updateReactFlowNodes({ nodes: newNodes, isSource: isLeftDirection })
      //   );
      // }
    },
    [setOpenKeys, setVisibleKeys, getAllVisibleOrHiddenNodes, openKeys, visibleKeys]
  );

  useLayoutEffect(() => {
    if (x !== undefined && y !== undefined && visibleKeys.has(root.key)) {
      setUpdatedNode({
        id: nodeId,
        selectable: true,
        data: {
          ...root,
          isLeftDirection: isLeftDirection,
        },
        type: 'schemaNode',
        position: { x, y },
      });
    }
  }, [isLeftDirection, x, y, root, setUpdatedNode, nodeId, visibleKeys]);

  if (!nodeVisble) {
    return null;
  }

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
              treePositionX={treePositionX}
              treePositionY={treePositionY}
              setUpdatedNode={setUpdatedNode}
              visibleKeys={visibleKeys}
              setVisibleKeys={setVisibleKeys}
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};
export default RecursiveTree;
