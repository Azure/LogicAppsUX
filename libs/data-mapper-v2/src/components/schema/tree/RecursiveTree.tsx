import { Tree, TreeItem, TreeItemLayout, type TreeItemOpenChangeData, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStyles } from './styles';
import type { Node, XYPosition } from '@xyflow/react';
import useNodePosition from './useNodePosition';
import { getReactFlowNodeId } from '../../../utils/Schema.Utils';
import useOnScreen from './useOnScreen';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  setOpenKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  setUpdatedNode: (node: Node) => void;
  treePosition?: XYPosition;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, openKeys, setOpenKeys, flattenedScehmaMap, setUpdatedNode, treePosition } = props;
  const { key } = root;
  const nodeVisble = useMemo(() => !!flattenedScehmaMap[key], [flattenedScehmaMap, key]);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();
  const onScreen = useOnScreen(nodeRef);
  const [nodePosition, setNodePosition] = useState<XYPosition>();

  const {
    position: { x, y } = { x: undefined, y: undefined },
  } = useNodePosition({
    key: key,
    openKeys: openKeys,
    onScreen: onScreen,
    schemaMap: flattenedScehmaMap,
    isLeftDirection: isLeftDirection,
    nodePosition: nodePosition,
    treePosition,
  });

  const onOpenChange = useCallback(
    (_e: any, data: TreeItemOpenChangeData) => {
      setOpenKeys((prev) => {
        const newOpenKeys = new Set(prev);
        const value = data.value as string;
        if (newOpenKeys.has(value)) {
          newOpenKeys.delete(value);
        } else {
          newOpenKeys.add(value);
        }
        return newOpenKeys;
      });
    },
    [setOpenKeys]
  );

  const handleScroll = useCallback(() => {
    if (nodeRef?.current) {
      setNodePosition({
        x: nodeRef.current.getBoundingClientRect().x,
        y: nodeRef.current.getBoundingClientRect().y,
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeRef, nodeRef?.current, setNodePosition]);

  useLayoutEffect(() => {
    if (nodeRef?.current) {
      nodeRef.current.addEventListener('scroll', handleScroll);
      handleScroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeRef, nodeRef?.current, setNodePosition]);

  useLayoutEffect(() => {
    const nodeId = getReactFlowNodeId(root.key, isLeftDirection);
    if (x !== undefined && y !== undefined) {
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
  }, [isLeftDirection, x, y, root, setUpdatedNode]);

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
              setUpdatedNode={setUpdatedNode}
              treePosition={treePosition}
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};
export default RecursiveTree;
