import type { NodeOperation } from '../operation/operationMetadataSlice';

type CopiedNode = {
  nodeId: string;
  operationInfo: NodeOperation;
};

export interface ClipboardState {
  copiedNode: CopiedNode | null;
}
