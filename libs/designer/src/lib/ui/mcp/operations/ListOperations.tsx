import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useCallback, useMemo } from 'react';
import { Text, TableCell, TableRow, Table, TableHeader, TableHeaderCell, Button, TableBody, Link } from '@fluentui/react-components';
import { Delete24Regular, Edit24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useConnectorSectionStyles } from '../wizard/styles';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';
import { selectOperationIdToEdit } from '../../../core/state/mcp/mcpselectionslice';
import { deinitializeOperations } from '../../../core/actions/bjsworkflow/mcp';

export const ListOperations = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, operationMetadata } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    operationMetadata: state.operation.operationMetadata,
  }));

  const styles = useConnectorSectionStyles();

  const INTL_TEXT = {
    tableAriaLabel: intl.formatMessage({
      defaultMessage: 'List of operations',
      id: 'ztfbU8',
      description: 'The aria label for the operations table',
    }),
    operationLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'x5Q5L7',
      description: 'The label for the operations column',
    }),
    editButtonLabel: intl.formatMessage({
      defaultMessage: 'Edit operation',
      id: '7EHrJW',
      description: 'Label for the edit operation button',
    }),
    deleteButtonLabel: intl.formatMessage({
      defaultMessage: 'Delete operation',
      id: 'b1odUC',
      description: 'Label for the delete operation button',
    }),
  };

  const handleEditOperation = useCallback(
    (operationId: string) => {
      dispatch(selectOperationIdToEdit(operationId));
      dispatch(openOperationPanelView());
    },
    [dispatch]
  );

  const handleDeleteOperation = useCallback(
    (operationId: string) => {
      dispatch(deinitializeOperations({ operationIds: [operationId] }));
    },
    [dispatch]
  );

  const items = useMemo(() => {
    return Object.values(operationInfos)
      .filter((info) => Boolean(info?.operationId))
      .map((info) => ({
        operationId: info.operationId,
        operationName: operationMetadata[info.operationId]?.summary || info.operationId,
        iconUri: operationMetadata[info.operationId]?.iconUri,
        connectorId: info.connectorId,
      }));
  }, [operationMetadata, operationInfos]);

  const columns = [
    { columnKey: 'operation', label: INTL_TEXT.operationLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  if (!items.length) {
    return null;
  }

  return (
    <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
      <TableHeader>
        <TableRow style={{ border: 'none' }}>
          {columns.map((column) => (
            <TableHeaderCell key={column.columnKey}>
              <Text weight="semibold">{column.label}</Text>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.operationId}>
            <TableCell className={styles.iconTextCell}>
              <img className={styles.connectorIcon} src={item.iconUri ?? DefaultIcon} alt={`${item.operationId} icon`} />
              <Link as="button" onClick={() => handleEditOperation(item.operationId)}>
                {item.operationName}
              </Link>
            </TableCell>
            <TableCell className={styles.iconsCell}>
              <Button
                className={styles.icon}
                appearance="subtle"
                size="small"
                icon={<Edit24Regular />}
                onClick={() => handleEditOperation(item.operationId)}
                aria-label={INTL_TEXT.editButtonLabel}
              />
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
                onClick={() => handleDeleteOperation(item.operationId)}
                aria-label={INTL_TEXT.deleteButtonLabel}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
