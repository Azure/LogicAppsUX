import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import {
  Text,
  TableCell,
  TableRow,
  Table,
  TableHeader,
  TableHeaderCell,
  TableSelectionCell,
  TableCellLayout,
  useTableFeatures,
  type TableColumnDefinition,
  useTableSelection,
  createTableColumn,
  Button,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { EmptySearch } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { CommandBar, type ICommandBarItemProps } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { useFunctionalState } from '@react-hookz/web';
import { Add12Filled } from '@fluentui/react-icons';
import { deleteWorkflowData } from '../../../core/actions/bjsworkflow/configuretemplate';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { equals } from '@microsoft/logic-apps-shared';
import { ConfigureWorkflowsPanel } from '../panels/configureWorkflowsPanel/configureWorkflowsPanel';

export const DisplayWorkflows = ({ onSave }: { onSave: (isMultiWorkflow: boolean) => void }) => {
  const intl = useIntl();
  const { workflows, currentPanelView } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    currentPanelView: state.panel.currentPanelView,
  }));
  const dispatch = useDispatch<AppDispatch>();
  const workflowsExist = Object.keys(workflows).length > 0;
  const isMultiWorkflow = Object.keys(workflows).length > 1;

  const workflowNamesWithErrors = useMemo(() => {
    return Object.values(workflows)
      .filter((workflow) => Object.values(workflow.errors?.manifest ?? {}).some((error) => error))
      .map((workflow) => workflow.workflowName);
  }, [workflows]);

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<string[]>([]);

  const intlText = useMemo(
    () => ({
      ADD: intl.formatMessage({
        defaultMessage: 'Add',
        id: '+0Kbqd',
        description: 'command bar button text for opening panel for adding workflows',
      }),
      ADD_WORKFLOWS: intl.formatMessage({
        defaultMessage: 'Add workflows',
        id: 'Ve6uLm',
        description: 'Button text for opening panel for adding workflows',
      }),
      EDIT: intl.formatMessage({
        defaultMessage: 'Manage workflows',
        id: 'FK8YcR',
        description: 'Button text for opening panel for editing workflows',
      }),
      ADD_WORKFLOWS_FOR_TEMPLATE: intl.formatMessage({
        defaultMessage: 'Add workflows to this template',
        id: 'jSyH3j',
        description: 'Button text for opening panel for adding workflows',
      }),
      DELETE: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'Ld62T8',
        description: 'Button text for deleting selected workflows',
      }),
    }),
    [intl]
  );

  const customResourceStrings = useResourceStrings();
  const { stateTypes, resourceStrings } = useTemplatesStrings();

  const handleAddWorkflows = useCallback(() => {
    dispatch(openPanelView({ panelView: TemplatePanelView.ConfigureWorkflows }));
  }, [dispatch]);

  const commandBarItems: ICommandBarItemProps[] = useMemo(() => {
    const addEditItem = workflowsExist
      ? {
          key: 'edit',
          text: intlText.EDIT,
          iconProps: { iconName: 'Settings' },
          onClick: handleAddWorkflows,
        }
      : {
          key: 'add',
          text: intlText.ADD,
          iconProps: { iconName: 'Add' },
          onClick: handleAddWorkflows,
        };
    return [
      addEditItem,
      {
        key: 'delete',
        text: intlText.DELETE,
        iconProps: { iconName: 'Trash' },
        onClick: () => {
          dispatch(deleteWorkflowData({ ids: selectedWorkflowsList() }));
        },
      },
    ];
  }, [intlText, workflowsExist, handleAddWorkflows, dispatch, selectedWorkflowsList]);

  type WorkflowsTableItem = {
    id: string;
    name: string;
    displayName: string;
    state: string;
    trigger: string;
    // date: string; //TODO: removed until back-end updates us
  };

  const columns: TableColumnDefinition<WorkflowsTableItem>[] = [
    createTableColumn<WorkflowsTableItem>({
      columnId: 'name',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'displayName',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'state',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'trigger',
    }),
    //TODO: removed until back-end updates us
    // createTableColumn<WorkflowsTableItem>({
    //   columnId: 'date',
    // }),
  ];

  const items =
    Object.values(workflows)?.map((workflowData) => ({
      id: workflowData.id,
      name: workflowData?.workflowName ?? customResourceStrings.Placeholder,
      displayName: workflowData?.manifest?.title ?? customResourceStrings.Placeholder,
      state:
        workflowData?.manifest?.kinds
          ?.map((kind) =>
            equals(kind, WorkflowKind.STATEFUL) ? stateTypes.STATEFUL : equals(kind, WorkflowKind.STATELESS) ? stateTypes.STATELESS : ''
          )
          ?.join(', ') ?? customResourceStrings.Placeholder,
      trigger: workflowData?.triggerType,
      // date: '-', //TODO: removed until back-end updates us
    })) ?? [];

  const {
    getRows,
    selection: { allRowsSelected, someRowsSelected, toggleAllRows, toggleRow, isRowSelected },
  } = useTableFeatures(
    {
      columns,
      items,
    },
    [
      useTableSelection({
        selectionMode: 'multiselect',
        selectedItems: new Set(selectedWorkflowsList()),
        onSelectionChange: (_, data) => {
          setSelectedWorkflowsList(Array.from(data.selectedItems, String));
        },
      }),
    ]
  );

  const rows = getRows((row) => {
    const selected = isRowSelected(row.item.id);
    return {
      ...row,
      onClick: (e: React.MouseEvent) => toggleRow(e, row.item.id),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleRow(e, row.item.id);
        }
      },
      selected,
      appearance: selected ? ('brand' as const) : ('none' as const),
    };
  });

  const toggleAllKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        toggleAllRows(e);
        e.preventDefault();
      }
    },
    [toggleAllRows]
  );

  return (
    <div className="msla-templates-wizard-tab-content">
      {currentPanelView === TemplatePanelView.ConfigureWorkflows && <ConfigureWorkflowsPanel onSave={onSave} />}

      <CommandBar
        items={commandBarItems}
        styles={{
          root: {
            borderBottom: `1px solid ${'#333333'}`,
            position: 'relative',
            padding: '4px 8px',
          },
        }}
      />

      {workflowNamesWithErrors.length ? (
        <MessageBar intent="error" className="msla-templates-error-message-bar">
          <MessageBarBody>
            <MessageBarTitle>{customResourceStrings.MissingRequiredFields}</MessageBarTitle>
            <Text>{workflowNamesWithErrors.join(', ')}</Text>
          </MessageBarBody>
        </MessageBar>
      ) : null}

      {Object.keys(workflows).length > 0 ? (
        <Table aria-label={customResourceStrings.WorkflowsListTableLabel} style={{ minWidth: '550px' }}>
          <TableHeader>
            <TableRow>
              <TableSelectionCell
                checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                onClick={toggleAllRows}
                onKeyDown={toggleAllKeydown}
                checkboxIndicator={{ 'aria-label': customResourceStrings.SelectAllWorkflowsLabel }}
              />
              <TableHeaderCell>{resourceStrings.WORKFLOW_NAME}</TableHeaderCell>
              {isMultiWorkflow && <TableHeaderCell>{customResourceStrings.WorkflowDisplayName}</TableHeaderCell>}
              <TableHeaderCell>{customResourceStrings.State}</TableHeaderCell>
              <TableHeaderCell>{customResourceStrings.Trigger}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
            <TableRow key={item.id} onClick={onClick} onKeyDown={onKeyDown} aria-selected={selected} appearance={appearance}>
              <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': customResourceStrings.WorkflowCheckboxRowLabel }} />
              <TableCell>
                <TableCellLayout>{item.id}</TableCellLayout>
              </TableCell>
              {isMultiWorkflow && (
                <TableCell>
                  <TableCellLayout>{item.displayName}</TableCellLayout>
                </TableCell>
              )}
              <TableCell>
                <TableCellLayout>{item.state}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.trigger}</TableCellLayout>
              </TableCell>
              {/* //TODO: removed until back-end updates us
              <TableCell>
                <TableCellLayout>{item.date}</TableCellLayout>
              </TableCell> */}
            </TableRow>
          ))}
        </Table>
      ) : (
        <div className="msla-templates-empty-list">
          <EmptySearch />
          <Text size={500} weight="semibold" align="start" className="msla-template-empty-list-title">
            {intlText.ADD_WORKFLOWS_FOR_TEMPLATE}
          </Text>
          <Button appearance="primary" icon={<Add12Filled />} onClick={handleAddWorkflows}>
            {intlText.ADD_WORKFLOWS}
          </Button>
        </div>
      )}
    </div>
  );
};
