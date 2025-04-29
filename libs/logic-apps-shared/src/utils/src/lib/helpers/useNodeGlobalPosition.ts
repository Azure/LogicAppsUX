import { useInternalNode } from '@xyflow/react';

export function useNodeGlobalPosition(nodeId: string) {
  return useInternalNode(nodeId)?.internals?.positionAbsolute ?? { x: 0, y: 0 };
}
