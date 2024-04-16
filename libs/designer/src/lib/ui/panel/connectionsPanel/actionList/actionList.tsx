import { ConnectionActionHeader } from './connectionActionHeader';
import { Text } from '@fluentui/react-components';
import { Warning24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface ActionListProps {
  nodeIds: string[];
  iconUri: string;
}

export const ActionList = ({ nodeIds, iconUri }: ActionListProps) => {
  const intl = useIntl();
  const multipleActionsWarning = intl.formatMessage({
    defaultMessage: 'Multiple actions will be modified by this change.',
    id: 'nSUXtP',
    description: "Warning displayed when editing multiple action's connectionst once.",
  });

  return (
    <div>
      {nodeIds.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Warning24Regular />
          <Text>{multipleActionsWarning}</Text>
        </div>
      )}
      <div style={{ display: 'grid', gap: '4px' }}>
        {nodeIds.map((nodeId) => (
          <ConnectionActionHeader key={nodeId} iconUri={iconUri} nodeId={nodeId} />
        ))}
      </div>
    </div>
  );
};
