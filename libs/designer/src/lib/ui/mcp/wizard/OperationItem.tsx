import { Text, Button } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useOperationItemStyles } from './styles';

interface OperationItemProps {
  operationId: string;
  operationName: string;
  connectorIcon: string;
  connectorName: string;
  onEdit: (operationId: string) => void;
  onDelete: (operationId: string) => void;
}

export const OperationItem = ({ operationId, operationName, connectorIcon, connectorName, onEdit, onDelete }: OperationItemProps) => {
  const styles = useOperationItemStyles();

  return (
    <div className={styles.operationItem}>
      <div className={styles.operationIcon}>{connectorIcon}</div>

      <div className={styles.operationInfo}>
        <Text size={400} weight="medium">
          {operationName}
        </Text>
        <Text size={200} className={styles.operationSubtext}>
          {connectorName}
        </Text>
      </div>

      <div className={styles.itemActions}>
        <Button appearance="subtle" size="small" icon={<Edit24Regular />} onClick={() => onEdit(operationId)} aria-label="Edit operation" />
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={() => onDelete(operationId)}
          aria-label="Delete operation"
        />
      </div>
    </div>
  );
};
