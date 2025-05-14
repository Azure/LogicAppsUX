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
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { CommandBar, type ICommandBarItemProps, mergeStyles, PrimaryButton } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { useFunctionalState } from '@react-hookz/web';
import { DocumentOnePage24Regular } from '@fluentui/react-icons';
import { deleteWorkflowData } from '../../../core/actions/bjsworkflow/configuretemplate';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { equals } from '@microsoft/logic-apps-shared';
import { ConfigureWorkflowsPanel } from '../panels/configureWorkflowsPanel/configureWorkflowsPanel';
import { DescriptionWithLink, tableHeaderStyle } from '../common';

export const DisplayWorkflows = ({ onSave }: { onSave: (isMultiWorkflow: boolean) => void }) => {
  const intl = useIntl();
  const { workflows, currentPanelView } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    currentPanelView: state.panel.currentPanelView,
  }));
  const dispatch = useDispatch<AppDispatch>();
  const isMultiWorkflow = Object.keys(workflows).length > 1;

  const workflowNamesWithErrors = useMemo(() => {
    return Object.values(workflows)
      .filter((workflow) => Object.values(workflow.errors?.manifest ?? {}).some((error) => error))
      .map((workflow) => workflow.workflowName);
  }, [workflows]);

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<string[]>([]);

  const intlText = useMemo(
    () => ({
      EDIT: intl.formatMessage({
        defaultMessage: 'Manage workflows',
        id: 'FK8YcR',
        description: 'Button text for opening panel for editing workflows',
      }),
      DELETE: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'Ld62T8',
        description: 'Button text for deleting selected workflows',
      }),
      EMPTY_TITLE: intl.formatMessage({
        defaultMessage: 'Manage workflows for this template',
        id: 'gA8nWC',
        description: 'Empty state title for workflows list',
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
    const addEditItem = {
      key: 'edit',
      text: intlText.EDIT,
      iconProps: { iconName: 'Settings' },
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
  }, [intlText, handleAddWorkflows, dispatch, selectedWorkflowsList]);

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

      <DescriptionWithLink
        text={customResourceStrings.WorkflowsTabDescription}
        linkText={customResourceStrings.LearnMore}
        linkUrl="https://docs.microsoft.com/azure/logic-apps/logic-apps-overview"
        className={mergeStyles({ marginLeft: '-1px' })}
      />

      <CommandBar
        items={commandBarItems}
        styles={{
          root: {
            borderBottom: `1px solid ${'#333333'}`,
            position: 'relative',
            padding: '4px 0',
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
        <Table aria-label={customResourceStrings.WorkflowsListTableLabel} style={{ minWidth: '550px', marginTop: 30, marginLeft: '-5px' }}>
          <TableHeader>
            <TableRow>
              <TableSelectionCell
                checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                onClick={toggleAllRows}
                onKeyDown={toggleAllKeydown}
                checkboxIndicator={{ 'aria-label': customResourceStrings.SelectAllWorkflowsLabel }}
              />
              <TableHeaderCell style={tableHeaderStyle}>{resourceStrings.WORKFLOW_NAME}</TableHeaderCell>
              {isMultiWorkflow && <TableHeaderCell style={tableHeaderStyle}>{customResourceStrings.WorkflowDisplayName}</TableHeaderCell>}
              <TableHeaderCell style={tableHeaderStyle}>{customResourceStrings.State}</TableHeaderCell>
              <TableHeaderCell style={tableHeaderStyle}>{customResourceStrings.Trigger}</TableHeaderCell>
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
        <div style={{ height: '50%' }} className="msla-templates-empty-list">
          <DocumentOnePage24Regular width={50} height={50} />
          <Text weight="semibold" size={500} style={{ padding: '20px 0 10px 0' }}>
            {intlText.EMPTY_TITLE}
          </Text>
          <DescriptionWithLink
            text={customResourceStrings.WorkflowsTabDescription}
            linkText={customResourceStrings.LearnMore}
            linkUrl="https://docs.microsoft.com/azure/logic-apps/logic-apps-overview"
            className={mergeStyles({ width: '40%' })}
          />
          <div style={{ padding: '10px 0' }}>
            <PrimaryButton onClick={handleAddWorkflows}>{intlText.EDIT}</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
