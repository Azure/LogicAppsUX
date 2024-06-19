import { Handle, Position, useUpdateNodeInternals, type NodeProps } from 'reactflow';
import type { SchemaNodeReactFlowDataProps } from '../../addSchema/tree/TreeNode';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect } from 'react';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { data } = props;
  const { isLeftDirection, id, isConnected } = data;
  const styles = useStyles();

  useEffect(() => {
    updateNodeInternals(id);

    return () => {
      updateNodeInternals(id);
    };
  });
  return (
    <div className={mergeClasses('nodrag', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={Position.Left}
        className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
        isConnectableStart={isLeftDirection}
        isConnectableEnd={!isLeftDirection}
        style={{ left: '-7px' }}
      />
    </div>
  );
};

export default SchemaNode;
