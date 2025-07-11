import { Text, Button } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useOperationItemStyles } from './styles';
import { useIntl } from 'react-intl';

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
  const intl = useIntl();

  const editButtonLabel = intl.formatMessage({
    id: '7EHrJW',
    defaultMessage: 'Edit operation',
    description: 'Label for the edit operation button',
  });
  const deleteButtonLabel = intl.formatMessage({
    id: 'b1odUC',
    defaultMessage: 'Delete operation',
    description: 'Label for the delete operation button',
  });

  return (
    <div className={styles.operationItem}>
      <div className={styles.operationIcon}>
        <img
          src={connectorIcon}
          alt={`${connectorName} icon`}
          style={{
            width: '24px',
            height: '24px',
            objectFit: 'contain',
          }}
        />
      </div>

      <div className={styles.operationInfo}>
        <Text size={400} weight="medium">
          {operationName}
        </Text>
        <Text size={200} className={styles.operationSubtext}>
          {connectorName}
        </Text>
      </div>

      <div className={styles.itemActions}>
        <Button
          appearance="subtle"
          size="small"
          icon={<Edit24Regular />}
          onClick={() => onEdit(operationId)}
          aria-label={editButtonLabel}
        />
        <Button
          appearance="subtle"
          size="small"
          icon={<Delete24Regular />}
          onClick={() => onDelete(operationId)}
          aria-label={deleteButtonLabel}
        />
      </div>
    </div>
  );
};
