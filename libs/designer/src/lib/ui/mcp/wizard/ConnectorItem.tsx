import { Text, Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular, Checkmark24Filled } from '@fluentui/react-icons';
import { useConnectorItemStyles } from './styles';

interface ConnectorItemProps {
  connectorId: string;
  displayName: string;
  connectionName: string;
  status: 'connected' | 'disconnected';
  icon: string;
  onEdit: (connectorId: string) => void;
  onDelete: (connectorId: string) => void;
}

export const ConnectorItem = ({ connectorId, displayName, connectionName, status, icon, onEdit, onDelete }: ConnectorItemProps) => {
  const styles = useConnectorItemStyles();

  return (
    <div className={styles.connectorItem}>
      <div className={styles.connectorIcon}>{icon}</div>

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
          Connection: {connectionName}
        </Text>
      </div>

      <div className={styles.itemActions}>
        <Button appearance="subtle" size="small" icon={<Edit24Regular />} onClick={() => onEdit(connectorId)} aria-label="Edit connector" />
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={() => onDelete(connectorId)}
          aria-label="Delete connector"
        />
      </div>
    </div>
  );
};
