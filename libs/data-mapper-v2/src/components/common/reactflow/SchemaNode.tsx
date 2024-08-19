import { Handle, Position, useEdges, useUpdateNodeInternals, type NodeProps, type Node } from '@xyflow/react';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { useActiveNode } from '../../../core/state/selectors/selectors';
import { useDispatch } from 'react-redux';
import { setSelectedItem } from '../../../core/state/DataMapSlice';
import { ArrowClockwiseFilled } from '@fluentui/react-icons';

const SchemaNode = (props: NodeProps<Node<StringIndexed<SchemaNodeReactFlowDataProps>, 'schema'>>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch();
  const { data, id } = props;
  const { isLeftDirection } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const styles = useStyles();

  const isConnected = useMemo(() => edges.some((edge) => edge.source === id || edge.target === id), [edges, id]);
  const isLoop = useMemo(() => edges.some((edge) => (edge.source === id || edge.target === id) && edge.data?.isRepeating), [edges, id]);
  const isActive = useActiveNode(id);

  const styleForState = useMemo(() => {
    const directionalStyle = mergeClasses(
      styles.handleWrapper,
      isLeftDirection ? styles.sourceSchemaHandleWrapper : styles.targetSchemaHandleWrapper
    );
    if (isActive !== undefined) {
      return mergeClasses(directionalStyle, styles.activeHandle);
    }
    if (isLoop && !isLeftDirection) {
      return mergeClasses(directionalStyle, styles.loopTargetHandle);
    }
    if (isLoop && isLeftDirection) {
      return mergeClasses(directionalStyle, styles.loopSourceHandle);
    }
    if (isConnected) {
      return mergeClasses(directionalStyle, styles.handleConnected);
    }
    return directionalStyle;
  }, [isActive, isConnected, styles, isLeftDirection, isLoop]);

  const setActiveNode = () => {
    dispatch(setSelectedItem(id));
  };

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag nopan', styles.nodeWrapper)} ref={divRef}>
      <Handle
        style={{ zIndex: 1000 }}
        type={isLeftDirection ? 'source' : 'target'}
        position={isLeftDirection ? Position.Left : Position.Right}
        className={styleForState}
        onMouseDown={setActiveNode}
      >
        {isLoop && isLeftDirection && <ArrowClockwiseFilled className={styles.loopIcon} />}
      </Handle>
    </div>
  );
};

export default SchemaNode;
