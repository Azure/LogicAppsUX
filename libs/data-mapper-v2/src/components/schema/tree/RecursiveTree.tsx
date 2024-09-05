import {
  Caption2,
  Tree,
  TreeItem,
  TreeItemLayout,
  type TreeItemOpenChangeData,
  type TreeItemOpenChangeEvent,
  mergeClasses,
} from '@fluentui/react-components';
import { equals, SchemaType, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useStyles } from './styles';
import useNodePosition from './useNodePosition';
import { getReactFlowNodeId } from '../../../utils/Schema.Utils';
import useOnScreen from './useOnScreen';
import { applyNodeChanges, useNodes, type Node } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { setHoverState, setSelectedItem, toggleNodeExpandCollapse, updateReactFlowNode } from '../../../core/state/DataMapSlice';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addReactFlowPrefix, addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../../../utils/ReactFlow.Util';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  isLeftDirection: boolean;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  treePositionX?: number;
  treePositionY?: number;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, isLeftDirection, flattenedScehmaMap, treePositionX, treePositionY } = props;
  const { key } = root;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();
  const onScreen = useOnScreen(nodeRef);
  const nodes = useNodes();
  const dispatch = useDispatch<AppDispatch>();
  const { sourceOpenKeys, targetOpenKeys } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const hoverState = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);
  const activeNode = useSelector(
    (state: RootState) =>
      state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[
        isLeftDirection ? addSourceReactFlowPrefix(key) : addTargetReactFlowPrefix(key)
      ]
  );

  const nodeId = useMemo(() => getReactFlowNodeId(key, isLeftDirection), [key, isLeftDirection]);

  const {
    position: { x, y } = { x: undefined, y: undefined },
  } = useNodePosition({
    key: key,
    nodeId,
    onScreen: onScreen,
    schemaMap: flattenedScehmaMap,
    isLeftDirection: isLeftDirection,
    nodePositionX: nodeRef?.current?.getBoundingClientRect().x,
    nodePositionY: nodeRef?.current?.getBoundingClientRect().y,
    treePositionX,
    treePositionY,
  });

  const onClick = useCallback(() => {
    dispatch(setSelectedItem(addReactFlowPrefix(key, isLeftDirection ? SchemaType.Source : SchemaType.Target)));
  }, [key, isLeftDirection, dispatch]);

  const onMouseOver = useCallback(() => {
    dispatch(
      setHoverState({
        id: key,
        isSourceSchema: isLeftDirection,
        type: 'node',
      })
    );
  }, [dispatch, isLeftDirection, key]);

  const onMouseLeave = useCallback(() => {
    dispatch(setHoverState());
  }, [dispatch]);

  const onOpenChange = useCallback(
    (_e: TreeItemOpenChangeEvent, data: TreeItemOpenChangeData) => {
      const key = data.value as string;
      const isExpaned = data.open;
      dispatch(
        toggleNodeExpandCollapse({
          isSourceSchema: isLeftDirection,
          keys: [key],
          isExpanded: isExpaned,
        })
      );

      onClick();
    },
    [dispatch, isLeftDirection, onClick]
  );

  const aside = useMemo(() => {
    if (activeNode || (hoverState?.type === 'node' && hoverState?.isSourceSchema === isLeftDirection && equals(hoverState?.id, root.key))) {
      return <TypeAnnotation schemaNode={root} />;
    }

    return <span />;
  }, [activeNode, hoverState, isLeftDirection, root]);

  useEffect(() => {
    return () => {
      dispatch(
        updateReactFlowNode({
          removeNode: true,
          isSource: isLeftDirection,
          id: nodeId,
        })
      );
    };
  }, [isLeftDirection, dispatch, nodeId]);

  useEffect(() => {
    if (x !== undefined && y !== undefined) {
      const updatedNode: Node = {
        id: nodeId,
        selectable: false,
        draggable: false,
        data: {
          ...root,
          isLeftDirection: isLeftDirection,
        },
        type: 'schemaNode',
        position: { x, y },
      };

      const currentNode = nodes.find((node) => node.id === nodeId);

      if (currentNode) {
        if (x < 0 || y < 0) {
          applyNodeChanges([{ type: 'remove', id: nodeId }], nodes);
          dispatch(
            updateReactFlowNode({
              removeNode: true,
              id: nodeId,
              isSource: isLeftDirection,
              node: updatedNode,
            })
          );
        } else if (x >= 0 && y >= 0 && (x !== currentNode.position.x || y !== currentNode.position.y)) {
          applyNodeChanges([{ type: 'position', id: nodeId, position: updatedNode.position }], nodes);
          dispatch(
            updateReactFlowNode({
              isSource: isLeftDirection,
              id: nodeId,
              node: updatedNode,
            })
          );
        }
      } else if (x >= 0 && y >= 0) {
        applyNodeChanges([{ type: 'add', item: updatedNode }], nodes);
        dispatch(
          updateReactFlowNode({
            isSource: isLeftDirection,
            id: nodeId,
            node: updatedNode,
          })
        );
      }
    }
  }, [nodes, isLeftDirection, x, y, root, nodeId, dispatch]);

  if (root.children.length === 0) {
    return (
      <TreeItem itemType="leaf" id={key} value={key} ref={nodeRef}>
        <TreeItemLayout
          data-selectableid={key}
          onClick={onClick}
          onMouseEnter={onMouseOver}
          onMouseLeave={onMouseLeave}
          className={mergeClasses(
            styles.leafNode,
            isLeftDirection ? '' : styles.rightTreeItemLayout,
            activeNode ? styles.nodeSelected : ''
          )}
          aside={aside}
        >
          <div className={root.nodeProperties.find((prop) => prop.toLocaleLowerCase() === 'optional') ? '' : styles.required}>
            {root.name}
          </div>
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
      open={isLeftDirection ? sourceOpenKeys[key] : targetOpenKeys[key]}
      onOpenChange={onOpenChange}
    >
      <TreeItemLayout
        data-selectableid={key}
        onClick={onClick}
        onMouseEnter={onMouseOver}
        onMouseLeave={onMouseLeave}
        aside={aside}
        className={mergeClasses(styles.rootNode, isLeftDirection ? '' : styles.rightTreeItemLayout, activeNode ? styles.nodeSelected : '')}
      >
        <div className={root.nodeProperties.find((prop) => prop.toLocaleLowerCase() === 'optional') ? '' : styles.required}>
          {root.name}
        </div>
      </TreeItemLayout>
      <Tree aria-label="sub-tree">
        {root.children
          .filter((child: SchemaNodeExtended) => !!flattenedScehmaMap[child.key])
          .map((child: SchemaNodeExtended, index: number) => (
            <span key={`tree-${child.key}-${index}`}>
              <RecursiveTree
                root={child}
                isLeftDirection={isLeftDirection}
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

const TypeAnnotation = (props: { schemaNode: SchemaNodeExtended }) => {
  const styles = useStyles();
  const TypeIcon = iconForNormalizedDataType(props.schemaNode.type, 16, true, props.schemaNode.nodeProperties);

  return (
    <div className={styles.typeAnnotation}>
      <TypeIcon filled={true} style={{ paddingRight: '3px' }} />
      <Caption2>{props.schemaNode.type}</Caption2>
    </div>
  );
};
