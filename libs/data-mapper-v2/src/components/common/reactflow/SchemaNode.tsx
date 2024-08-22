import { Handle, Position, useEdges, useUpdateNodeInternals, type NodeProps, type Node } from '@xyflow/react';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { useSelectedNode, useHoverNode } from '../../../core/state/selectors/selectors';
import { useDispatch } from 'react-redux';
import { setSelectedItem } from '../../../core/state/DataMapSlice';
import { ArrowClockwiseFilled } from '@fluentui/react-icons';

const SchemaNode = (props: NodeProps<Node<StringIndexed<SchemaNodeReactFlowDataProps>, 'schema'>>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const { data, id } = props;
  const { isLeftDirection: isSourceNode } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const styles = useStyles();

  const isConnected = useMemo(() => edges.some((edge) => edge.source === id || edge.target === id), [edges, id]);
  const isLoop = useMemo(() => edges.some((edge) => (edge.source === id || edge.target === id) && edge.data?.isRepeating), [edges, id]);
  const isSelected = useSelectedNode(id);
  const isHover = useHoverNode(id);

  const styleForState = useMemo(() => {
    let updatedStyle = mergeClasses(
      styles.handleWrapper,
      isSourceNode ? styles.sourceSchemaHandleWrapper : styles.targetSchemaHandleWrapper,
      isConnected ? styles.connectedHandle : ''
    );

    // Update styling for loop
    if (isLoop && isSourceNode) {
      updatedStyle = mergeClasses(updatedStyle, styles.loopSourceHandle);
    }

    if (isSelected || isHover) {
      updatedStyle = mergeClasses(updatedStyle, styles.selectedHoverHandle);
      if (isConnected) {
        updatedStyle = mergeClasses(updatedStyle, styles.connectedSelectedHoverHandle);
      }
    }

    return updatedStyle;
  }, [
    styles.handleWrapper,
    styles.sourceSchemaHandleWrapper,
    styles.targetSchemaHandleWrapper,
    styles.connectedHandle,
    styles.loopSourceHandle,
    styles.selectedHoverHandle,
    styles.connectedSelectedHoverHandle,
    isSourceNode,
    isConnected,
    isLoop,
    isSelected,
    isHover,
  ]);

  const setActiveNode = () => {
    dispatch(setSelectedItem(id));
  };

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag nopan', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isSourceNode ? 'source' : 'target'}
        position={isSourceNode ? Position.Left : Position.Right}
        className={styleForState}
        onMouseDown={setActiveNode}
        isConnectableEnd={!isSourceNode && !isConnected}
        isConnectableStart={isSourceNode}
      >
        {isLoop && isSourceNode && <ArrowClockwiseFilled className={styles.loopIcon} />}
      </Handle>
    </div>
  );
};

export default SchemaNode;
