import { Handle, Position, useEdges, useUpdateNodeInternals, type NodeProps, type Node } from '@xyflow/react';
import type { SchemaNodeReactFlowDataProps } from '../../../models/ReactFlow';
import { mergeClasses } from '@fluentui/react-components';
import { useStyles } from './styles';
import { useRef, useEffect, useMemo } from 'react';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { useActiveNode } from '../../../core/state/selectors/selectors';

const SchemaNode = (props: NodeProps<Node<StringIndexed<SchemaNodeReactFlowDataProps>, 'schema'>>) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const { data, id } = props;
  const { isLeftDirection } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const edges = useEdges();
  const styles = useStyles();

  const isConnected = useMemo(() => edges.some((edge) => edge.source === id || edge.target === id), [edges, id]);
  const isActive = useActiveNode(id);

  const styleForState = useMemo(() => {
    const directionalStyle = mergeClasses(
      styles.handleWrapper,
      isLeftDirection ? styles.sourceSchemaHandleWrapper : styles.targetSchemaHandleWrapper
    );
    if (isActive !== undefined) {
      return mergeClasses(directionalStyle, styles.activeHandle);
    }
    if (isConnected) {
      return mergeClasses(directionalStyle, styles.handleConnected);
    }
    return directionalStyle;
  }, [isActive, isConnected, styles, isLeftDirection]);

  const handleStyle = styleForState;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag', styles.nodeWrapper)} ref={divRef}>
      <Handle
        type={isLeftDirection ? 'source' : 'target'}
        position={isLeftDirection ? Position.Left : Position.Right}
        className={handleStyle}
        isConnectable={true}
      />
    </div>
  );
};

export default SchemaNode;
