import { type SchemaNodeExtended, type SchemaExtended, SchemaNodeProperty, equals } from '@microsoft/logic-apps-shared';
import type { NodeRendererProps } from 'react-arborist';
import { useTreeNodeStyles, useStyles } from './styles';
import { Caption2, mergeClasses } from '@fluentui/react-components';
import { ChevronRightRegular, ChevronDownRegular } from '@fluentui/react-icons';
import { useCallback, useMemo, useState } from 'react';
import useSchema from '../useSchema';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { setHoverState, setSelectedItem } from '../../../core/state/DataMapSlice';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { useEdges } from '@xyflow/react';
import SchemaTreeNodeHandle from './SchemaTreeNodeHandle';

type SchemaTreeNodeProps = {
  id: string;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
  containerTop?: number;
  containerBottom?: number;
} & NodeRendererProps<SchemaNodeExtended>;

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

const SchemaTreeNode = (props: SchemaTreeNodeProps) => {
  const { style, node, dragHandle, id, containerTop, containerBottom } = props;
  const [rowRefRect, setRowRefRect] = useState<DOMRect>();
  const styles = useTreeNodeStyles();
  const edges = useEdges();
  const dispatch = useDispatch<AppDispatch>();
  const data: SchemaNodeExtended = useMemo(() => node.data, [node]);
  const key = useMemo(() => data.key, [data]);
  const isLeaf = useMemo(() => data.children.length === 0, [data.children]);
  const { openKeys, nodeId, isSourceSchema, handle } = useSchema({
    id,
    currentNodeKey: key,
  });
  const isSelected = useSelector((state: RootState) => !!state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes[nodeId]);
  const hover = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state?.hover);

  const isHover = useMemo(
    () => hover?.type === 'node' && hover?.isSourceSchema === isSourceSchema && equals(hover?.id, key),
    [hover?.id, hover?.isSourceSchema, hover?.type, isSourceSchema, key]
  );

  const isConnected = useMemo(
    () => edges.some((edge) => edge.data?.sourceHandleId === handle.id || edge.data?.targetHandleId === handle.id),
    [edges, handle.id]
  );

  const isRepeatingNode = useMemo(() => data.nodeProperties.includes(SchemaNodeProperty.Repeating), [data]);

  const onClick = useCallback(
    (e?: any) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      dispatch(setSelectedItem(nodeId));
    },
    [nodeId, dispatch]
  );

  const onMouseEnter = useCallback(
    (_e?: any) => {
      if (isHover) {
        return;
      }

      dispatch(
        setHoverState({
          id: key,
          isSourceSchema: isSourceSchema,
          type: 'node',
        })
      );
    },
    [dispatch, isSourceSchema, key, isHover]
  );

  const onMouseLeave = useCallback(
    (e?: any) => {
      if (e?.stopPropagation) {
        e.stopPropagation();
      }
      dispatch(setHoverState());
    },
    [dispatch]
  );

  const onToggle = useCallback(
    (e?: any) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      node.toggle();
    },
    [node]
  );

  return (
    <div
      className={styles.root}
      ref={(ref) => {
        if (ref) {
          const newRect = ref.getBoundingClientRect();
          if (!rowRefRect || rowRefRect.top !== newRect.top || rowRefRect?.bottom !== newRect.bottom) {
            setRowRefRect(ref.getBoundingClientRect());
          }
          if (dragHandle) {
            dragHandle(ref);
          }
        }
      }}
    >
      <SchemaTreeNodeHandle
        visible={isSourceSchema}
        isConnected={isConnected}
        isSelected={isSelected}
        isHover={isHover}
        isRepeatingNode={isRepeatingNode}
        treeContainerTop={containerTop}
        treeContainerBottom={containerBottom}
        rowRect={rowRefRect}
        handleProps={handle}
      />
      <div
        className={mergeClasses(
          styles.container,
          isSourceSchema ? styles.sourceSchemaContainer : styles.targetSchemaContainer,
          isSelected || isHover ? styles.active : ''
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onMouseOut={onMouseLeave}
      >
        <div style={style} className={mergeClasses(styles.wrapper)} onClick={onClick}>
          {isLeaf ? (
            <div />
          ) : openKeys[key] ? (
            <ChevronDownRegular className={styles.chevronIcon} fontSize={16} onClick={onToggle} />
          ) : (
            <ChevronRightRegular className={styles.chevronIcon} fontSize={16} onClick={onToggle} />
          )}
          <span
            className={mergeClasses(
              data.nodeProperties.includes(SchemaNodeProperty.Optional) ? '' : styles.required,
              isLeaf ? styles.leafNode : ''
            )}
          >
            {data.name}
          </span>
          {isSelected || isHover ? <TypeAnnotation schemaNode={data} /> : null}
        </div>
      </div>
      <SchemaTreeNodeHandle
        visible={!isSourceSchema}
        isConnected={isConnected}
        isSelected={isSelected}
        isHover={isHover}
        isRepeatingNode={isRepeatingNode}
        treeContainerTop={containerTop}
        treeContainerBottom={containerBottom}
        rowRect={rowRefRect}
        handleProps={handle}
      />
    </div>
  );
};

export default SchemaTreeNode;
