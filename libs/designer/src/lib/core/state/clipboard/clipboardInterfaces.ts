import type { NodeData, NodeOperation } from '../operation/operationMetadataSlice';

type CopiedNode = {
  nodeId: string;
  operationInfo: NodeOperation;
  nodeData: NodeData;
};

export interface ClipboardState {
  copiedNode: CopiedNode | null;
}
