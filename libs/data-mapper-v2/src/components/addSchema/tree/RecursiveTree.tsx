import {
  Tree,
  TreeItem,
  TreeItemLayout,
  type TreeItemOpenChangeData,
  mergeClasses,
} from "@fluentui/react-components";
import type { SchemaNodeExtended } from "@microsoft/logic-apps-shared";
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useStyles } from "./styles";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../core/state/Store";
import { DataMapperWrappedContext } from "../../../core";
import { updateReactFlowNode } from "../../../core/state/DataMapSlice";

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  openKeys: Set<string>;
  setOpenKeys: (openKeys: Set<string>) => void;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, openKeys, setOpenKeys, flattenedScehmaMap } =
    props;
  const { key } = root;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();
  const nodeId = useMemo(
    () => `reactflow_${isLeftDirection ? "source" : "target"}_${key}`,
    [key, isLeftDirection]
  );

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
              connectionX: isLeftDirection
                ? nodeRect.right + 10
                : nodeRect.left - 10,
              id: nodeId,
            },
            type: "schemaNode",
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

  // NOTE: If any of the parent is collapsed in the tree structure, then the node should be hidden
  const isNodeHidden = useCallback(
    (key?: string) => {
      if (!key) {
        return false;
      }

      if (!openKeys.has(key)) {
        return true;
      }

      return isNodeHidden(flattenedScehmaMap[key]?.parentKey);
    },
    [openKeys, flattenedScehmaMap]
  );

  useLayoutEffect(() => {
    if (
      flattenedScehmaMap[key] &&
      isNodeHidden(flattenedScehmaMap[key].parentKey)
    ) {
      removeNodeFromFlow();
    } else if (nodeRef?.current && canvasBounds) {
      // console.log(key, " :::: ", nodeRef.current.getBoundingClientRect());
      addNodeToFlow(nodeRef.current.getBoundingClientRect(), canvasBounds);
    } else {
      removeNodeFromFlow();
    }

    return () => {
      // console.log("Remove:: ", key, " :::: ");
      removeNodeFromFlow();
    };
  }, [
    openKeys,
    removeNodeFromFlow,
    nodeRef,
    addNodeToFlow,
    canvasBounds,
    isNodeHidden,
    flattenedScehmaMap,
    key,
  ]);

  if (root.children.length === 0) {
    return (
      <TreeItem itemType="leaf" id={key} value={key} ref={nodeRef}>
        <TreeItemLayout
          className={isLeftDirection ? "" : styles.rightTreeItemLayout}
        >
          {root.name}
        </TreeItemLayout>
      </TreeItem>
    );
  }

  return (
    <TreeItem
      itemType="branch"
      id={key}
      value={key}
      ref={nodeRef}
      open={openKeys.has(key)}
      onOpenChange={onOpenChange}
    >
      <TreeItemLayout
        className={mergeClasses(
          styles.rootNode,
          isLeftDirection ? "" : styles.rightTreeItemLayout
        )}
      >
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
            />
          </span>
        ))}
      </Tree>
    </TreeItem>
  );
};

export default RecursiveTree;
