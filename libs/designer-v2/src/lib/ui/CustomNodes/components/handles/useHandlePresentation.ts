import { useNodeId, useNodesData } from '@xyflow/react';
import { useSharedNodeUi } from '../../../../core/state/designerOptions/designerOptionsSelectors';

/** Ports must follow the accepted node geometry while an asynchronous mode change is pending. */
export const useHandlePresentation = () => {
  const enabled = useSharedNodeUi();
  const nodeId = useNodeId();
  const node = useNodesData(nodeId ?? '');
  const presentation = node?.data?.presentation as { shared?: boolean } | undefined;
  return presentation?.shared ?? enabled;
};
