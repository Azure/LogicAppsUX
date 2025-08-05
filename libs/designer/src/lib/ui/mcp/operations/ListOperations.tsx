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
import { OperationProgress } from './operationprogress';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

const toolTableCellStyles = {
  border: 'none',
  paddingBottom: '8px',
};
const toolNameCellStyles = {
  paddingTop: '6px',
  alignItems: 'center',
  display: 'flex',
};
const lastCellStyles = {
  width: '8%',
};
export const ListOperations = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { operationInfos, operationMetadata } = useSelector((state: RootState) => ({
    operationInfos: state.operations.operationInfo,
    operationMetadata: state.operations.operationMetadata,
  }));

  const styles = useConnectorSectionStyles();

  const INTL_TEXT = {
    tableAriaLabel: intl.formatMessage({
      defaultMessage: 'List of operations',
      id: 'ztfbU8',
      description: 'The aria label for the operations table',
    }),
    toolLabel: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'HkIZ7P',
      description: 'The label for the tool column',
    }),
    toolDescriptionLabel: intl.formatMessage({
      defaultMessage: 'Description',
      id: '6qPgjN',
      description: 'The label for the tool description column',
    }),
    parameterStatusLabel: intl.formatMessage({
      defaultMessage: 'Parameters',
      id: '7uQSsD',
      description: 'Label for the parameters status column',
    }),
    editButtonLabel: intl.formatMessage({
      defaultMessage: 'Edit action',
      id: 'nean5u',
      description: 'Label for the edit action button',
    }),
    deleteButtonLabel: intl.formatMessage({
      defaultMessage: 'Delete action',
      id: 'QgMC2Q',
      description: 'Label for the delete action button',
    }),
  };

  const handleEditOperation = useCallback(
    (operationId: string) => {
      dispatch(selectOperationIdToEdit(operationId));
      dispatch(openOperationPanelView());

      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'MCP.ListOperations',
        message: 'Edit selected operations button clicked',
        args: [`operationId:${operationId}`],
      });
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
        description: operationMetadata[info.operationId]?.description || '',
        iconUri: operationMetadata[info.operationId]?.iconUri,
        connectorId: info.connectorId,
      }));
  }, [operationMetadata, operationInfos]);

  const columns = [
    { columnKey: 'tool', label: INTL_TEXT.toolLabel },
    { columnKey: 'description', label: INTL_TEXT.toolDescriptionLabel },
    { columnKey: 'parameters', label: INTL_TEXT.parameterStatusLabel },
    { columnKey: 'actions', label: '' }, // Empty label for actions column
  ];

  if (!items.length) {
    return null;
  }

  return (
    <Table className={styles.tableStyle} aria-label={INTL_TEXT.tableAriaLabel} size="small">
      <TableHeader>
        <TableRow style={toolTableCellStyles}>
          {columns.map((column, i) => (
            <TableHeaderCell key={column.columnKey} style={i === columns.length - 1 ? lastCellStyles : toolTableCellStyles}>
              <Text weight="semibold">{column.label}</Text>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody style={toolTableCellStyles}>
        {items.map((item) => (
          <TableRow key={item.operationId} style={toolTableCellStyles}>
            <TableCell style={toolNameCellStyles}>
              <img className={styles.connectorIcon} src={item.iconUri ?? DefaultIcon} alt={`${item.operationId} icon`} />
              <Link as="button" onClick={() => handleEditOperation(item.operationId)}>
                {item.operationName}
              </Link>
            </TableCell>
            <TableCell>
              <Text size={300} style={{ verticalAlign: 'top' }}>
                {item.description}
              </Text>
            </TableCell>
            <TableCell style={{ alignContent: 'center' }}>
              <OperationProgress operationId={item.operationId} />
            </TableCell>
            <TableCell className={styles.iconsCell} style={toolTableCellStyles}>
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
