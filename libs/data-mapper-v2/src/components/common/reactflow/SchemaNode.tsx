import { Handle, Position, useUpdateNodeInternals, type NodeProps } from 'reactflow';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect } from 'react';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { data, id } = props;
  const { isLeftDirection, isConnected } = data;
  const styles = useStyles();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={Position.Left}
        className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
        style={{ left: '-7px' }}
      />
    </div>
  );
};

export default SchemaNode;
