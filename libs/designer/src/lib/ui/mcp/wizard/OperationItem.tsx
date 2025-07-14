import { Text, Button } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { useOperationItemStyles } from './styles';
import { useIntl } from 'react-intl';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { useMemo } from 'react';

interface OperationItemProps {
  operationId: string;
  connectorId: string;
  operationName: string;
  connectorIcon: string;
  onEdit: (operationId: string) => void;
  onDelete: (operationId: string) => void;
}

export const OperationItem = ({ operationId, connectorId, operationName, connectorIcon, onEdit, onDelete }: OperationItemProps) => {
  const { data: connector } = useConnector(connectorId);
  const styles = useOperationItemStyles();
  const intl = useIntl();

  const connectorName = useMemo(() => connector?.properties?.displayName ?? connectorId, [connector?.properties?.displayName, connectorId]);

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
          src={connectorIcon ?? DefaultIcon}
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
