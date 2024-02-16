import { openPanel, setFocusNode, useNodeDisplayName } from '../../../core';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { NodeErrorCard } from '@microsoft/logic-apps-shared';
import type { MessageLevel, NodeMessage } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

interface NodeErrorsProps {
  nodeId: string;
  level: MessageLevel;
  messagesBySubtitle?: Record<string, NodeMessage[]>;
}

export const NodeErrors = (props: NodeErrorsProps) => {
  const { nodeId, level, messagesBySubtitle } = props;

  const dispatch = useDispatch();

  const nodeDisplayName = useNodeDisplayName(nodeId);
  const { brandColor, iconUri } = useOperationVisuals(nodeId);

  const onClick = useCallback(() => {
    dispatch(setFocusNode(nodeId));
    dispatch(openPanel({ nodeId, panelMode: 'Operation' }));
  }, [dispatch, nodeId]);

  return (
    <NodeErrorCard
      id={nodeId}
      level={level}
      title={nodeDisplayName}
      brandColor={brandColor}
      iconUri={iconUri}
      messagesBySubtitle={messagesBySubtitle}
      onClick={onClick}
    />
  );
};
