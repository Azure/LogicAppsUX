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
} from '@fluentui/react-components';
import { EmptySearch, type TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { useIntl, type IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { CommandBar, type ICommandBarItemProps } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { ConfigureWorkflowsPanel } from '../../panel/configureTemplatePanel/configureWorkflowsPanel/configureWorkflowsPanel';
import { useFunctionalState } from '@react-hookz/web';
import { Add12Filled } from '@fluentui/react-icons';

export const WorkflowsTab = () => {
  const intl = useIntl();
  const { workflows, currentPanelView } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    currentPanelView: state.panel.currentPanelView,
  }));
  const dispatch = useDispatch<AppDispatch>();

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<string[]>([]);

  const intlText = useMemo(
    () => ({
      PLACEHOLDER: intl.formatMessage({
        defaultMessage: '--',
        id: '5lRHeK',
        description: 'Accessibility label indicating that the value is not set',
      }),
      ADD_WORKFLOWS: intl.formatMessage({
        defaultMessage: 'Add workflows',
        id: 'Ve6uLm',
        description: 'Button text for opening panel for adding workflows',
      }),
      DELETE: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'Ld62T8',
        description: 'Button text for deleting selected workflows',
      }),
      CHECKBOX_ALL_ROWS: intl.formatMessage({
        defaultMessage: 'Select all rows',
        id: '+JtwJv',
        description: 'Accessibility label for the select all rows checkbox',
      }),
      CHECKBOX_ROW: intl.formatMessage({
        defaultMessage: 'Select row',
        id: 'hpKZGo',
        description: 'Accessibility label for the select row checkbox',
      }),
      WORKFLOW_NAME: intl.formatMessage({
        defaultMessage: 'Name',
        id: 'kLqXDY',
        description: 'Label for workflow Name',
      }),
      WORKFLOW_DISPLAY_NAME: intl.formatMessage({
        defaultMessage: 'Display name',
        id: 'Sk0Pms',
        description: 'Label for workflow display name',
      }),
      STATE: intl.formatMessage({
        defaultMessage: 'State',
        id: 'IG4XXf',
        description: 'Label for workflow state',
      }),
      ADD_WORKFLOWS_FOR_TEMPLATE: intl.formatMessage({
        defaultMessage: 'Add workflows for this template',
        id: '5S9Ta6',
        description: 'Button text for opening panel for adding workflows',
      }),
    }),
    [intl]
  );

  const handleAddWorkflows = useCallback(() => {
    dispatch(openPanelView({ panelView: TemplatePanelView.ConfigureWorkflows }));
  }, [dispatch]);

  const commandBarItems: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'add',
        text: intlText.ADD_WORKFLOWS,
        iconProps: { iconName: 'Add' },
        onClick: handleAddWorkflows,
      },
      {
        key: 'delete',
        text: intlText.DELETE,
        iconProps: { iconName: 'Trash' },
        onClick: () => {
          //TODO: remove selected workflows
        },
      },
    ],
    [intlText, handleAddWorkflows]
  );

  type WorkflowsTableItem = {
    id: string;
    name: string;
    displayName: string;
    state: string;
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
  ];

  const items =
    Object.values(workflows)?.map((workflowData) => ({
      id: workflowData.id,
      name: workflowData?.workflowName ?? intlText.PLACEHOLDER,
      displayName: workflowData?.manifest?.title ?? intlText.PLACEHOLDER,
      state: workflowData?.manifest?.kinds?.join(', ') ?? intlText.PLACEHOLDER,
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
        selectedItems: new Set(Object.keys(selectedWorkflowsList)),
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
    <div>
      {currentPanelView === TemplatePanelView.ConfigureWorkflows && <ConfigureWorkflowsPanel />}

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

      {Object.keys(workflows).length > 0 ? (
        <Table aria-label="Table with multiselect" style={{ minWidth: '550px' }}>
          <TableHeader>
            <TableRow>
              <TableSelectionCell
                checked={allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                onClick={toggleAllRows}
                onKeyDown={toggleAllKeydown}
                checkboxIndicator={{ 'aria-label': intlText.CHECKBOX_ALL_ROWS }}
              />

              <TableHeaderCell>{intlText.WORKFLOW_NAME}</TableHeaderCell>
              <TableHeaderCell>{intlText.WORKFLOW_DISPLAY_NAME}</TableHeaderCell>
              <TableHeaderCell>{intlText.STATE}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
            <TableRow key={item.id} onClick={onClick} onKeyDown={onKeyDown} aria-selected={selected} appearance={appearance}>
              <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': intlText.CHECKBOX_ROW }} />
              <TableCell>
                <TableCellLayout>{item.name}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.displayName}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.state}</TableCellLayout>
              </TableCell>
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

export const workflowsTab = (intl: IntlShape, dispatch: AppDispatch): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Workflows',
    id: 'R7VvvJ',
    description: 'The tab label for the monitoring workflows tab on the configure template wizard',
  }),
  hasError: false,
  content: <WorkflowsTab />,
  footerContent: {
    primaryButtonText: '',
    primaryButtonOnClick: () => {},
    showPrimaryButton: false,
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: 'daThty',
      description: 'Button text for proceeding to the next tab',
    }),
    secondaryButtonOnClick: () => {
      dispatch(selectWizardTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CONNECTIONS));
    },
  },
});
