import type { StringIndexed } from '@microsoft/logic-apps-shared';
import { useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';

type CanvasNodeProps = {};

const CanvasNode = (props: NodeProps<Node<StringIndexed<CanvasNodeProps>, 'canvas'>>) => {
  const { id } = props;
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, updateNodeInternals]);
  return <span style={{ background: 'transparent', display: 'block', border: 'none' }} />;
};

export default CanvasNode;
