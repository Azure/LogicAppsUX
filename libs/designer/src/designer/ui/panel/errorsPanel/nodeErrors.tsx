import { setFocusNode, useNodeDisplayName } from '../../../core';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { switchToOperationPanel } from '../../../core/state/panel/panelSlice';
import { NodeErrorCard } from '@microsoft/logic-apps-designer';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

interface ErrorCardProps {
  nodeId: string;
  errors?: Record<string, string[]>;
}

export const NodeErrors = (props: ErrorCardProps) => {
  const { nodeId, errors } = props;

  const dispatch = useDispatch();

  const nodeDisplayName = useNodeDisplayName(nodeId);
  const { brandColor, iconUri } = useOperationVisuals(nodeId);

  const onClick = useCallback(() => {
    dispatch(setFocusNode(nodeId));
    dispatch(switchToOperationPanel(nodeId));
  }, [dispatch, nodeId]);

  return <NodeErrorCard id={nodeId} title={nodeDisplayName} brandColor={brandColor} iconUri={iconUri} errors={errors} onClick={onClick} />;
};
