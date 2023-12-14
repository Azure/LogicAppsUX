import { useNodeDisplayName } from '../../../../core';
import { Body1Strong } from '@fluentui/react-components';

export interface ConnectorActionHeaderProps {
  nodeId: string;
  iconUri: string;
}

export const ConnectionActionHeader = ({ nodeId, iconUri }: ConnectorActionHeaderProps) => {
  const nodeName = useNodeDisplayName(nodeId);

  return (
    <div className="msla-flex-header">
      <img className="msla-action-icon" src={iconUri} alt={nodeName} />
      <Body1Strong className="msla-flex-header-title">{nodeName}</Body1Strong>
    </div>
  );
};
