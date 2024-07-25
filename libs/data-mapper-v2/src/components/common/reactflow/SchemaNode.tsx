import { Handle, Position, useEdges, useUpdateNodeInternals, type NodeProps, type Node } from '@xyflow/react';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';
import type { StringIndexed } from '@microsoft/logic-apps-shared';

const SchemaNode = (props: NodeProps<Node<StringIndexed<SchemaNodeReactFlowDataProps>, 'schema'>>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const { data, id } = props;
  const { isLeftDirection } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const styles = useStyles();
  const handleStyle = mergeClasses(
    styles.handleWrapper,
    isLeftDirection ? styles.sourceSchemaHandleWrapper : styles.targetSchemaHandleWrapper
  );
  // danielle update this to move away from edges
  const isConnected = useMemo(() => edges.some((edge) => edge.source === id || edge.target === id), [edges, id]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={isLeftDirection ? Position.Left : Position.Right}
        className={mergeClasses(handleStyle, isConnected ? styles.handleConnected : '')}
        isConnectable={true}
      />
    </div>
  );
};

export default SchemaNode;
