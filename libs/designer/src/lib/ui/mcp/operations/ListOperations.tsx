import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { openOperationPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useCallback, useMemo } from 'react';
import {
  Spinner,
  Text,
  TableCell,
  TableRow,
  Table,
  TableHeader,
  TableHeaderCell,
  Button,
  TableBody,
  Link,
} from '@fluentui/react-components';
import { Delete24Regular, Edit24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useConnectorItemStyles } from '../wizard/styles';
import { deinitializeNodes, deinitializeOperationInfo } from '../../../core/state/operation/operationMetadataSlice';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';

const tableCellStyles = {};

const buttonGapStyles = {
  marginRight: '8px',
};

export const ListOperations = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, isInitializingOperations, operationMetadata } = useSelector((state: RootState) => ({
    operationInfos: state.operation.operationInfo,
    isInitializingOperations: state.operation.loadStatus.isInitializingOperations,
    operationMetadata: state.operation.operationMetadata,
  }));

  const styles = useConnectorItemStyles();

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
    noOperations: intl.formatMessage({
      defaultMessage: 'No operations configured yet',
      id: '04idsj',
      description: 'Message when no operations are configured',
    }),
    addOperationsFirst: intl.formatMessage({
      defaultMessage: 'Add connectors and operations to see them here',
      id: 'iWZd2h',
      description: 'Message prompting to add operations',
    }),
    loadingOperationsText: intl.formatMessage({
      defaultMessage: 'Loading operations...',
      id: 'VFaFVs',
      description: 'Loading message for operations',
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
      dispatch(
        openOperationPanelView({
          selectedOperationId: operationId,
        })
      );
    },
    [dispatch]
  );

  const handleDeleteOperation = useCallback(
    (operationId: string) => {
      dispatch(deinitializeOperationInfo({ id: operationId }));
      dispatch(deinitializeNodes([operationId]));
    },
    [dispatch]
  );

  const items = useMemo(() => {
    return Object.values(operationInfos)
      .filter((info) => Boolean(info?.operationId))
      .map((info) => ({
        operationId: info.operationId,
        operationName: info.operationId, //TODO: use a more descriptive name if available
        connectorIconUri: operationMetadata[info.operationId]?.iconUri,
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

  if (isInitializingOperations) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <Spinner size="medium" label={INTL_TEXT.loadingOperationsText} />
      </div>
    );
  }

  return (
    <div>
      <Table
        aria-label={INTL_TEXT.tableAriaLabel}
        size="small"
        style={{
          width: '100%',
          margin: '0 auto',
          border: 'none',
        }}
      >
        <TableHeader>
          <TableRow style={{ border: 'none' }}>
            {columns.map((column) => (
              <TableHeaderCell key={column.columnKey} style={tableCellStyles}>
                <Text weight="semibold">{column.label}</Text>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody style={tableCellStyles}>
          {items.map((item) => (
            <TableRow key={item.operationId} style={tableCellStyles}>
              <TableCell className={styles.connectorCellDefault} style={tableCellStyles}>
                <img
                  src={item.connectorIconUri ?? DefaultIcon}
                  alt={`${item.connectorId} icon`}
                  style={{
                    width: '24px',
                    height: '24px',
                    objectFit: 'contain',
                    ...buttonGapStyles,
                  }}
                />
                <Link as="button" onClick={() => handleEditOperation(item.operationId)}>
                  {item.operationName}
                </Link>
              </TableCell>
              <TableCell className={styles.iconsCell} style={tableCellStyles}>
                <Button
                  style={buttonGapStyles}
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
    </div>
  );
};
