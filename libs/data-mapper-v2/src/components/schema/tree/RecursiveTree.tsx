import { Tree, TreeItem, TreeItemLayout, type TreeItemOpenChangeData, mergeClasses } from '@fluentui/react-components';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useStyles } from './styles';
import useNodePosition from './useNodePosition';
import { getReactFlowNodeId } from '../../../utils/Schema.Utils';
import useOnScreen from './useOnScreen';
import { useNodes, applyNodeChanges, type NodeChange } from '@xyflow/react';
import { updateReactFlowNodes } from '../../../core/state/DataMapSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/Store';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  setOpenKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  treePositionX?: number;
  treePositionY?: number;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, openKeys, setOpenKeys, flattenedScehmaMap, treePositionX, treePositionY } = props;
  const { key } = root;
  const nodeVisble = useMemo(() => !!flattenedScehmaMap[key], [flattenedScehmaMap, key]);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const nodes = useNodes();
  const styles = useStyles();
  const onScreen = useOnScreen(nodeRef);
  const dispatch = useDispatch<AppDispatch>();

  const {
    position: { x, y } = { x: undefined, y: undefined },
  } = useNodePosition({
    key: key,
    openKeys: openKeys,
    onScreen: onScreen,
    schemaMap: flattenedScehmaMap,
    isLeftDirection: isLeftDirection,
    nodePositionX: nodeRef?.current?.getBoundingClientRect().x,
    nodePositionY: nodeRef?.current?.getBoundingClientRect().y,
    treePositionX,
    treePositionY,
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
      /* empty */
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeRef, nodeRef?.current]);

  useLayoutEffect(() => {
    if (nodeRef?.current) {
      nodeRef.current.addEventListener('scroll', handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeRef, nodeRef?.current]);

  useLayoutEffect(() => {
    const id = getReactFlowNodeId(root.key, isLeftDirection);
    if (x !== undefined && y !== undefined) {
      const currentNode = nodes.find((node) => node.id === id);
      const nodeChanges: NodeChange[] = [];

      const updatedNode = currentNode
        ? { ...currentNode, position: { x, y } }
        : {
            id: id,
            selectable: true,
            data: {
              ...root,
              isLeftDirection: isLeftDirection,
            },
            type: 'schemaNode',
            position: { x, y },
          };

      if (currentNode) {
        if (x < 0 || y < 0) {
          nodeChanges.push({ id: id, type: 'remove' });
        } else if (currentNode.position.x !== x || currentNode.position.y !== y) {
          nodeChanges.push({
            id: id,
            type: 'position',
            position: { x, y },
          });
        }
      } else if (x >= 0 && y >= 0) {
        nodeChanges.push({ type: 'add', item: updatedNode });
      }

      if (nodeChanges.length > 0) {
        dispatch(updateReactFlowNodes(applyNodeChanges(nodeChanges, nodes)));
      }
    }
  }, [isLeftDirection, x, y, root, nodes, dispatch]);

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
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};
export default RecursiveTree;
