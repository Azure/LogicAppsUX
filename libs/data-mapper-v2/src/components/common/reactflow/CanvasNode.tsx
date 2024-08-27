import { mergeClasses } from '@fluentui/react-components';
import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { useStyles } from './styles';

type CanvasNodeProps = {};

const CanvasNode = (props: NodeProps<Node<StringIndexed<CanvasNodeProps>, 'canvas'>>) => {
  const { id } = props;
  const styles = useStyles();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return (
    <div className={mergeClasses('nodrag nopan', styles.temporaryCanvasNodeRoot)}>
      <Handle type="target" position={Position.Left} className={styles.temporaryCanvasNodeHandle} />
      <Handle type="source" position={Position.Left} className={styles.temporaryCanvasNodeHandle} />
    </div>
  );
};

export default CanvasNode;
