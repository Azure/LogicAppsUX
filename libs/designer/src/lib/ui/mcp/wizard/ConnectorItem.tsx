import { Text, Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular, Checkmark24Filled } from '@fluentui/react-icons';
import { useConnectorItemStyles } from './styles';
import { useIntl } from 'react-intl';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';

interface ConnectorItemProps {
  connectorId: string;
  displayName: string;
  connectionName: string;
  status: 'connected' | 'disconnected';
  icon?: string;
  onEdit: (connectorId: string) => void;
  onDelete: (connectorId: string) => void;
}

export const ConnectorItem = ({ connectorId, displayName, connectionName, status, icon, onEdit, onDelete }: ConnectorItemProps) => {
  const styles = useConnectorItemStyles();
  const intl = useIntl();

  const connectionText = intl.formatMessage(
    {
      defaultMessage: 'Connection: {connectionName}',
      id: 'vQahao',
      description: 'Label for the connection status',
    },
    { connectionName }
  );

  const editButtonLabel = intl.formatMessage({
    defaultMessage: 'Edit connector',
    id: 'RTfra/',
    description: 'Label for the edit connector button',
  });

  const deleteButtonLabel = intl.formatMessage({
    defaultMessage: 'Delete connector',
    id: '8e1bKU',
    description: 'Label for the delete connector button',
  });

  return (
    <div className={styles.connectorItem}>
      <div className={styles.connectorIcon}>
        <img
          src={icon ?? DefaultIcon}
          alt={`${displayName} icon`}
          style={{
            width: '24px',
            height: '24px',
            objectFit: 'contain',
          }}
        />
      </div>

      <div className={styles.connectorInfo}>
        <div className={styles.connectorHeader}>
          <Text size={400} weight="semibold">
            {displayName}
          </Text>
          <Badge
            appearance="filled"
            color={status === 'connected' ? 'success' : 'danger'}
            icon={status === 'connected' ? <Checkmark24Filled /> : undefined}
          >
            {status === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        <Text size={300} className={styles.connectorSubtext}>
          {connectionText}
        </Text>
      </div>

      <div>
        <Button
          appearance="subtle"
          size="small"
          icon={<Edit24Regular />}
          onClick={() => onEdit(connectorId)}
          aria-label={editButtonLabel}
        />
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={() => onDelete(connectorId)}
          aria-label={deleteButtonLabel}
        />
      </div>
    </div>
  );
};
