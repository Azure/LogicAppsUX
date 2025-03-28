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
} from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import constants from '../../../common/constants';
import { useIntl, type IntlShape } from 'react-intl';
import { selectWizardTab } from '../../../core/state/templates/tabSlice';
import { CommandBar, type ICommandBarItemProps } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { ConfigureWorkflowsPanel } from '../../panel/configureTemplatePanel/configureWorkflowsPanel/configureWorkflowsPanel';
import { useFunctionalState } from '@react-hookz/web';

export const WorkflowsTab = () => {
  const intl = useIntl();
  const { workflows, currentPanelView } = useSelector((state: RootState) => ({
    workflows: state.template.workflows,
    currentPanelView: state.panel.currentPanelView,
  }));
  const dispatch = useDispatch<AppDispatch>();

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<string[]>([]);

  const intlText = {
    PLACEHOLDER: intl.formatMessage({
      defaultMessage: '--',
      id: '5lRHeK',
      description: 'Accessibility label indicating that the value is not set',
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
  };

  const commandBarItems: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'add',
        text: intl.formatMessage({
          defaultMessage: 'Add workflows',
          id: 'Ve6uLm',
          description: 'Button text for opening panel for adding workflows',
        }),
        iconProps: { iconName: 'Add' },
        onClick: () => {
          dispatch(openPanelView({ panelView: TemplatePanelView.ConfigureWorkflows }));
        },
      },
      {
        key: 'delete',
        text: intl.formatMessage({
          defaultMessage: 'Delete',
          id: 'Ld62T8',
          description: 'Button text for deleting selected workflows',
        }),
        iconProps: { iconName: 'Trash' },
        onClick: () => {
          //todo remove selected workflows
        },
      },
    ],
    [intl, dispatch]
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
                checkboxIndicator={{ 'aria-label': 'Select all rows' }}
              />

              <TableHeaderCell>{intlText.WORKFLOW_NAME}</TableHeaderCell>
              <TableHeaderCell>{intlText.WORKFLOW_DISPLAY_NAME}</TableHeaderCell>
              <TableHeaderCell>{intlText.STATE}</TableHeaderCell>
            </TableRow>
          </TableHeader>
          {rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
            <TableRow key={item.id} onClick={onClick} onKeyDown={onKeyDown} aria-selected={selected} appearance={appearance}>
              <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': 'Select row' }} />
              <TableCell>
                {/* // TODO: change this to name */}
                <TableCellLayout>{item.id}</TableCellLayout>
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
        <Text>placeholder - add workflows</Text>
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
