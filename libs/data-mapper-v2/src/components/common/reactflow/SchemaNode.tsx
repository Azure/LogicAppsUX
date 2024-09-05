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

  const isConnected = useMemo(
    () => edges.some((edge) => !edge.data?.isDueToCollapse && (edge.source === id || edge.target === id)),
    [edges, id]
  );
  const isLoop = useMemo(() => edges.some((edge) => (edge.source === id || edge.target === id) && edge.data?.isRepeating), [edges, id]);
  const isSelected = useSelectedNode(id);
  const isHover = useHoverNode(id);

  const setActiveNode = () => {
    dispatch(setSelectedItem(id));
  };

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag nopan', styles.nodeWrapper)} ref={divRef}>
      <Handle
        data-selectableid={id}
        key={`${id}-handle`}
        id={`${id}-handle`}
        type={isSourceNode ? 'source' : 'target'}
        position={isSourceNode ? Position.Left : Position.Right}
        className={mergeClasses(
          styles.handleWrapper,
          isSourceNode ? '' : styles.rightHandle,
          isConnected ? styles.connectedHandle : '',
          isLoop && isSourceNode ? styles.loopSourceHandle : '',
          isSelected || isHover ? styles.selectedHoverHandle : '',
          (isSelected || isHover) && isConnected ? styles.connectedSelectedHoverHandle : ''
        )}
        onMouseDown={setActiveNode}
        isConnectableEnd={!isConnected}
      >
        {isLoop && isSourceNode && <ArrowClockwiseFilled className={styles.loopIcon} />}
      </Handle>
    </div>
  );
};

export default SchemaNode;
