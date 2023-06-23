import { changePanelNode, setFocusNode, useNodeDisplayName } from '../../../core';
import { useOperationVisuals } from '../../../core/state/operation/operationSelector';
import { showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { NodeErrorCard } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

interface ErrorCardProps {
  nodeId: string;
  inputErrors?: string[];
  settingsErrors?: string[];
  otherErrors?: string[];
}

export const NodeErrors = (props: ErrorCardProps) => {
  const { nodeId, inputErrors, settingsErrors, otherErrors } = props;

  const dispatch = useDispatch();

  const nodeDisplayName = useNodeDisplayName(nodeId);
  const { brandColor, iconUri } = useOperationVisuals(nodeId);

  const onClick = useCallback(() => {
    dispatch(setFocusNode(nodeId));
    dispatch(changePanelNode(nodeId));
    dispatch(showDefaultTabs());
  }, [dispatch, nodeId]);

  return (
    <NodeErrorCard
      id={nodeId}
      title={nodeDisplayName}
      brandColor={brandColor}
      iconUri={iconUri}
      inputErrors={inputErrors}
      settingsErrors={settingsErrors}
      otherErrors={otherErrors}
      onClick={onClick}
    />
  );
};
