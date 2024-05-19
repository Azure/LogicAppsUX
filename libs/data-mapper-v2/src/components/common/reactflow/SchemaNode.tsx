import { Handle, Position, useUpdateNodeInternals, type NodeProps } from 'reactflow';
import type { SchemaNodeReactFlowDataProps } from 'components/addSchema/tree/TreeNode';
import { Text, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect } from 'react';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { data } = props;
  const { name, isLeftDirection, connectionX, id, isConnected } = data;
  const styles = useStyles();

  useEffect(() => {
    if (divRef.current) {
      updateNodeInternals(id);
    }
  }, [divRef, id, updateNodeInternals]);
  return (
    <div className="nodrag" ref={divRef}>
      <Text>{name}</Text>
      {isLeftDirection ? (
        <Handle
          type="source"
          position={Position.Right}
          className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
          isConnectable={true}
          style={
            divRef.current
              ? {
                  right: `-${connectionX - divRef.current.getBoundingClientRect().right + 10}px`,
                }
              : undefined
          }
        />
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
          isConnectable={true}
          style={
            divRef.current
              ? {
                  left: `-${divRef.current.getBoundingClientRect().left - connectionX + 10}px`,
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default SchemaNode;
