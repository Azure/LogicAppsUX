import {
  Caption2,
  Tree,
  TreeItem,
  TreeItemLayout,
  type TreeItemOpenChangeData,
  type TreeItemOpenChangeEvent,
  mergeClasses,
} from '@fluentui/react-components';
import { equals, type SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHandleStyles, useStyles } from './styles';
import { Handle, useEdges, useUpdateNodeInternals } from '@xyflow/react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { setHoverState, setSelectedItem, toggleNodeExpandCollapse } from '../../../core/state/DataMapSlice';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import useSchema from '../useSchema';

type RecursiveTreeProps = {
  root: SchemaNodeExtended;
  id: string;
  flattenedScehmaMap: Record<string, SchemaNodeExtended>;
  treePositionX?: number;
  treePositionY?: number;
};

const RecursiveTree = (props: RecursiveTreeProps) => {
  const { root, id, flattenedScehmaMap, treePositionX, treePositionY } = props;
  const { key } = root;
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const styles = useStyles();
  const handleStyles = useHandleStyles();
  const dispatch = useDispatch<AppDispatch>();
  const updateNodeInternals = useUpdateNodeInternals();
  const { openKeys, nodeId, isSourceSchema, panelNodeId, handle } = useSchema({
    id,
    currentNodeKey: key,
  });

  const hoverState = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);
  const activeNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[nodeId]);

  const edges = useEdges();
  const isConnected = useMemo(
    () => edges.some((edge) => (edge.sourceHandle === handle.id || edge.targetHandle === handle.id) && !edge.data?.isIntermediate),
    [edges, handle.id]
  );

  const onClick = useCallback(() => {
    dispatch(setSelectedItem(nodeId));
  }, [nodeId, dispatch]);

  const onMouseOver = useCallback(() => {
    dispatch(
      setHoverState({
        id: key,
        isSourceSchema: isSourceSchema,
        type: 'node',
      })
    );
  }, [dispatch, isSourceSchema, key]);

  const onMouseLeave = useCallback(() => {
    dispatch(setHoverState());
  }, [dispatch]);

  const onOpenChange = useCallback(
    (_e: TreeItemOpenChangeEvent, data: TreeItemOpenChangeData) => {
      const key = data.value as string;
      const isExpaned = data.open;
      dispatch(
        toggleNodeExpandCollapse({
          isSourceSchema: isSourceSchema,
          keys: [key],
          isExpanded: isExpaned,
        })
      );
      updateNodeInternals(panelNodeId);

      onClick();
    },
    [dispatch, isSourceSchema, updateNodeInternals, panelNodeId, onClick]
  );

  const aside = useMemo(() => {
    if (activeNode || (hoverState?.type === 'node' && hoverState?.isSourceSchema === isSourceSchema && equals(hoverState?.id, root.key))) {
      return <TypeAnnotation schemaNode={root} />;
    }

    return <span />;
  }, [activeNode, hoverState, isSourceSchema, root]);

  const handleComponent = useMemo(
    () => (
      <Handle
        id={handle.id}
        key={handle.id}
        className={mergeClasses(handleStyles.wrapper, handle.className, isConnected ? handleStyles.connected : '')}
        position={handle.position}
        type={handle.type}
        isConnectable={true}
      />
    ),
    [handle.className, handle.id, handle.position, handle.type, isConnected, handleStyles.connected, handleStyles.wrapper]
  );

  useEffect(() => {
    updateNodeInternals(panelNodeId);
  }, [panelNodeId, updateNodeInternals]);
  if (root.children.length === 0) {
    return (
      <TreeItem itemType="leaf" id={key} value={key} ref={nodeRef}>
        <TreeItemLayout
          data-selectableid={key}
          onClick={onClick}
          onMouseEnter={onMouseOver}
          onMouseLeave={onMouseLeave}
          className={mergeClasses(styles.leafNode, isSourceSchema ? '' : styles.rightTreeItemLayout, activeNode ? styles.nodeSelected : '')}
          aside={aside}
        >
          <div>
            <div className={root.nodeProperties.find((prop) => prop.toLocaleLowerCase() === 'optional') ? '' : styles.required}>
              {root.name}
            </div>
            {handleComponent}
          </div>
        </TreeItemLayout>
      </TreeItem>
    );
  }

  return (
    <TreeItem itemType="branch" id={key} value={key} ref={nodeRef} open={openKeys[key]} onOpenChange={onOpenChange}>
      <TreeItemLayout
        data-selectableid={key}
        onClick={onClick}
        onMouseEnter={onMouseOver}
        onMouseLeave={onMouseLeave}
        aside={aside}
        className={mergeClasses(styles.rootNode, isSourceSchema ? '' : styles.rightTreeItemLayout, activeNode ? styles.nodeSelected : '')}
      >
        <div>
          <div className={root.nodeProperties.find((prop) => prop.toLocaleLowerCase() === 'optional') ? '' : styles.required}>
            {root.name}
          </div>
          {handleComponent}
        </div>
      </TreeItemLayout>
      <Tree aria-label="sub-tree">
        {root.children
          .filter((child: SchemaNodeExtended) => !!flattenedScehmaMap[child.key])
          .map((child: SchemaNodeExtended, index: number) => (
            <span key={`tree-${child.key}-${index}`}>
              <RecursiveTree
                root={child}
                id={id}
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
