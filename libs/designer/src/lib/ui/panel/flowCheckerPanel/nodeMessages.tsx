import { openPanel, setFocusNode, useNodeDisplayName } from '../../../core';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { NodeMessageCard } from '@microsoft/designer-ui';
import type { MessageLevel, NodeMessage } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

interface MessageCardProps {
  nodeId: string;
  level: MessageLevel;
  messagesBySubtitle?: Record<string, NodeMessage[]>;
}

export const NodeMessages = (props: MessageCardProps) => {
  const { nodeId, level, messagesBySubtitle } = props;

  const dispatch = useDispatch();

  const nodeDisplayName = useNodeDisplayName(nodeId);
  const { brandColor, iconUri } = useOperationVisuals(nodeId);

  const onClick = useCallback(() => {
    dispatch(setFocusNode(nodeId));
    dispatch(openPanel({ nodeId, panelMode: 'Operation' }));
  }, [dispatch, nodeId]);

  return (
    <NodeMessageCard
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
