import { Handle, Position, useUpdateNodeInternals, type NodeProps } from 'reactflow';
import type { SchemaNodeReactFlowDataProps } from 'components/addSchema/tree/TreeNode';
import { Text, mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';

const SchemaNode = (props: NodeProps<SchemaNodeReactFlowDataProps>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const updateNodeInternals = useUpdateNodeInternals();
  const { data } = props;
  const { name, isLeftDirection, connectionX, id, isConnected } = data;
  const styles = useStyles();
  const rect = divRef.current?.getBoundingClientRect();

  const right = useMemo(() => (rect ? connectionX - rect.right + 10 : undefined), [rect, connectionX]);
  const left = useMemo(() => (rect ? rect.left - connectionX + 10 : undefined), [rect, connectionX]);

  useEffect(() => {
    if (right && left && rect) {
      updateNodeInternals(id);
    }
  }, [right, left, rect, id, updateNodeInternals]);
  return (
    <div className="nodrag" ref={divRef}>
      <Text>{name}</Text>
      {isLeftDirection ? (
        <Handle
          type="source"
          position={Position.Right}
          className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
          isConnectable={true}
          style={{ right: right ? `-${right}px` : undefined }}
        />
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className={mergeClasses(styles.handleWrapper, isConnected ? styles.handleConnected : '')}
          isConnectable={true}
          style={{ left: left ? `-${left}px` : undefined }}
        />
      )}
    </div>
  );
};

export default SchemaNode;
