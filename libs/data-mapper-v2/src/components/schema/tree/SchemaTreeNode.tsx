import { type SchemaNodeExtended, type SchemaExtended, SchemaNodeProperty, equals } from '@microsoft/logic-apps-shared';
// import type { NodeRendererProps } from 'react-arborist';
import { useTreeNodeStyles, useStyles, useHandleStyles } from './styles';
import { Caption2, mergeClasses } from '@fluentui/react-components';
import { ChevronRightRegular, ChevronDownRegular, ArrowRepeatAllFilled } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import useSchema from '../useSchema';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { setHoverState, setSelectedItem, updateHandlePosition } from '../../../core/state/DataMapSlice';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { Handle, useEdges } from '@xyflow/react';

type SchemaTreeNodeProps = {
  id: string;
  schema: SchemaExtended;
  flattenedSchemaMap: Record<string, SchemaNodeExtended>;
  containerTop?: number;
  containerBottom?: number;
} & any;

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
  const handleRef = useRef<HTMLDivElement | null>(null);
  const styles = useTreeNodeStyles();
  const handleStyles = useHandleStyles();
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
  const { handlePosition, loadedMapMetadata } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const isHover = useMemo(
    () => hover?.type === 'node' && hover?.isSourceSchema === isSourceSchema && equals(hover?.id, key),
    [hover?.id, hover?.isSourceSchema, hover?.type, isSourceSchema, key]
  );

  const isRepeatingConnection = useMemo(
    () =>
      edges.some((edge) => (edge.data?.sourceHandleId === handle.id || edge.data?.targetHandleId === handle.id) && edge.data?.isRepeating),
    [edges, handle.id]
  );

  const isRepeatingNode = useMemo(() => data.nodeProperties.includes(SchemaNodeProperty.Repeating), [data]);

  const isConnected = useMemo(
    () =>
      edges.some(
        (edge) => (edge.data?.sourceHandleId === handle.id || edge.data?.targetHandleId === handle.id) && !edge.data?.isIntermediate
      ),
    [edges, handle.id]
  );

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
    (_e?: any) => {
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

  const handleComponent = useMemo(
    () => (
      <Handle
        ref={handleRef}
        data-selectableid={handle.id}
        id={handle.id}
        key={handle.id}
        className={mergeClasses(
          handleStyles.wrapper,
          handle.className,
          isRepeatingNode ? handleStyles.repeating : '',
          isConnected ? handleStyles.connected : '',
          isSelected || isHover ? handleStyles.selected : '',
          (isSelected || isHover) && isConnected ? handleStyles.connectedAndSelected : ''
        )}
        position={handle.position}
        type={handle.type}
        isConnectable={true}
      >
        {isRepeatingNode && (
          <ArrowRepeatAllFilled
            className={mergeClasses(
              handleStyles.repeatingIcon,
              isRepeatingConnection
                ? handleStyles.repeatingConnectionIcon
                : isSelected || isHover
                  ? handleStyles.repeatingAndActiveNodeIcon
                  : ''
            )}
          />
        )}
      </Handle>
    ),
    [
      handle.id,
      handle.className,
      handle.position,
      handle.type,
      handleStyles.wrapper,
      handleStyles.repeating,
      handleStyles.connected,
      handleStyles.selected,
      handleStyles.connectedAndSelected,
      handleStyles.repeatingIcon,
      handleStyles.repeatingConnectionIcon,
      handleStyles.repeatingAndActiveNodeIcon,
      isRepeatingNode,
      isRepeatingConnection,
      isConnected,
      isSelected,
      isHover,
    ]
  );

  useEffect(() => {
    if (
      handleRef?.current &&
      containerTop !== undefined &&
      containerBottom !== undefined &&
      loadedMapMetadata?.canvasRect &&
      loadedMapMetadata.canvasRect.width > 0 &&
      loadedMapMetadata.canvasRect.height > 0 &&
      !isHover
    ) {
      const newX = handleRef.current.getBoundingClientRect().x - loadedMapMetadata.canvasRect.x;
      const newY = handleRef.current.getBoundingClientRect().y - loadedMapMetadata.canvasRect.y;
      const currentHandlePosition = handlePosition[nodeId];
      const newHidden =
        containerTop > handleRef.current.getBoundingClientRect().bottom || handleRef.current.getBoundingClientRect().top > containerBottom;

      if (
        currentHandlePosition?.position.x !== newX ||
        currentHandlePosition?.position.y !== newY ||
        newHidden !== currentHandlePosition?.hidden
      ) {
        dispatch(
          updateHandlePosition({
            key: nodeId,
            position: {
              x: newX,
              y: newY,
            },
            hidden: newHidden,
          })
        );
      }
    }
  }, [
    dispatch,
    nodeId,
    handleRef,
    handlePosition,
    containerTop,
    containerBottom,
    loadedMapMetadata?.canvasRect,
    loadedMapMetadata?.canvasRect?.height,
    loadedMapMetadata?.canvasRect?.width,
    isHover,
  ]);

  return (
    <div className={mergeClasses(styles.root, isSourceSchema ? '' : styles.targetSchemaRoot)} ref={dragHandle}>
      {isSourceSchema ? null : handleComponent}
      <div
        className={mergeClasses(
          styles.container,
          isSourceSchema ? styles.sourceSchemaContainer : styles.targetSchemaContainer,
          isSelected || isHover ? styles.active : ''
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
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
      {isSourceSchema ? handleComponent : null}
    </div>
  );
};

export default SchemaTreeNode;
