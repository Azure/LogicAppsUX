import { useNodeDisplayName, openPanel } from '../../../../core';
import { Button } from '@fluentui/react-components';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

export const NodeLinkButton = ({ nodeId, iconUri }: { nodeId: string; iconUri?: string }) => {
  const dispatch = useDispatch();
  const id = useNodeDisplayName(nodeId);

  const nodeClick = useCallback(() => {
    dispatch(openPanel({ nodeId, panelMode: 'Connection', referencePanelMode: 'Connection' }));
  }, [dispatch, nodeId]);

  return (
    <Button
      appearance="subtle"
      icon={<img className="msla-action-icon" src={iconUri} alt="" style={{ position: 'absolute', left: '4px' }} />}
      onClick={nodeClick}
    >
      {id}
    </Button>
  );
};
