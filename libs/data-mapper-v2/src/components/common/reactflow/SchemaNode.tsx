import { Handle, Position, useEdges, useUpdateNodeInternals, type NodeProps } from 'reactflow';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const { data, id } = props;
  const { isLeftDirection } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const styles = useStyles();
  // danielle update this to move away from edges
  const isConnected = useMemo(() => edges.some((edge) => edge.source === id || edge.target === id), [edges, id]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={Position.Left}
        className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
        isConnectable={true}
      />
    </div>
  );
};

export default SchemaNode;
