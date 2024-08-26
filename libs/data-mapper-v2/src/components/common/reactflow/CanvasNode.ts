import { useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';

const CanvasNode = (props: NodeProps<Node>) => {
  const { id } = props;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return null;
};

export default CanvasNode;
