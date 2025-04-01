import type { AppDispatch, RootState } from '../../../core/state/templates/store';
import { TemplatesSection } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useWorkflowsInApp } from '../../../core/configuretemplate/utils/queries';
import { ResourcePicker } from '../../templates';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { equals, type WorkflowResource, type LogicAppResource, getResourceNameFromId } from '@microsoft/logic-apps-shared';
import { updateAllWorkflowsData } from '../../../core/state/templates/templateSlice';
import {
  TableBody,
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
  Skeleton,
  SkeletonItem,
} from '@fluentui/react-components';
import { useTemplatesStrings } from '../../../ui/templates/templatesStrings';

export const SelectWorkflows = ({
  selectedWorkflowsList,
  onWorkflowsSelected,
}: {
  selectedWorkflowsList: Record<string, Partial<WorkflowResource>>;
  onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isConsumption, logicAppName, subscriptionId, resourceGroup } = useSelector((state: RootState) => ({
    isConsumption: !!state.workflow.isConsumption,
    logicAppName: state.workflow.logicAppName,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    workflowsInTemplate: state.template.workflows,
    selectedTabId: state.tab.selectedTabId,
  }));
  const { data: workflows, isLoading } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);

  const onLogicAppSelected = useCallback(
    (app: LogicAppResource) => {
      const { id, plan } = app;
      if (equals(plan, 'Consumption')) {
        const normalizedWorkflowId = id.toLowerCase();
        dispatch(updateAllWorkflowsData({ [normalizedWorkflowId]: { id: normalizedWorkflowId } }));
        onWorkflowsSelected([normalizedWorkflowId]);
      } else {
        onWorkflowsSelected([]);
      }
    },
    [dispatch, onWorkflowsSelected]
  );

  const { ariaLabelStrings } = useTemplatesStrings();

  const intlText = {
    SOURCE: intl.formatMessage({
      defaultMessage: 'Source',
      id: '3LM7R3',
      description: 'Title for the resource selection section',
    }),
    SOURCE_LABEL: intl.formatMessage({
      defaultMessage: 'Select the Logic App service you would like to add workflows from.',
      id: 'CLb9Hv',
      description: 'Label for the logic app service resource selection description',
    }),
    WORKFLOWS: intl.formatMessage({
      defaultMessage: 'Workflows',
      id: 'NHuGg3',
      description: 'Title for the workflows selection section',
    }),
    WORKFLOWS_LABEL: intl.formatMessage({
      defaultMessage: 'Select the workflows you would like to add to this template.',
      id: 'YGe6mJ',
      description: 'Label for the workflows selection description',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'kLqXDY',
      description: 'Label for workflow Name',
    }),
    TRIGGER_TYPE: intl.formatMessage({
      defaultMessage: 'Trigger',
      id: 'mXwGRH',
      description: 'Label for workflow trigger type',
    }),
  };

  type WorkflowsTableItem = {
    id: string;
    name: string;
    trigger: string;
  };

  const columns: TableColumnDefinition<WorkflowsTableItem>[] = [
    createTableColumn<WorkflowsTableItem>({
      columnId: 'name',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'trigger',
    }),
  ];

  const items =
    workflows?.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      trigger: workflow.triggerType,
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
          onWorkflowsSelected(Array.from(data.selectedItems, String).map((workflowsId) => getResourceNameFromId(workflowsId)));
        },
      }),
    ]
  );

  const rows = getRows((row) => {
    const selected = isRowSelected(getResourceNameFromId(row.item.id));
    return {
      ...row,
      onClick: (e: React.MouseEvent) => toggleRow(e, getResourceNameFromId(row.item.id)),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
          e.preventDefault();
          toggleRow(e, getResourceNameFromId(row.item.id));
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
    <div className="msla-templates-tab msla-panel-no-description-tab">
      <TemplatesSection title={intlText.SOURCE} titleHtmlFor={'sourceLabel'} description={intlText.SOURCE_LABEL}>
        <ResourcePicker viewMode={'alllogicapps'} onSelectApp={onLogicAppSelected} />
      </TemplatesSection>
      <TemplatesSection title={intlText.WORKFLOWS} titleHtmlFor={'workflowsLabel'} description={intlText.WORKFLOWS_LABEL}>
        <Table aria-label={ariaLabelStrings.WORKFLOWS_LIST_TABLE_LABEL} style={{ minWidth: '550px' }}>
          <TableHeader>
            <TableRow>
              <TableSelectionCell
                checked={isConsumption || allRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                onClick={toggleAllRows}
                onKeyDown={toggleAllKeydown}
                checkboxIndicator={{ 'aria-label': ariaLabelStrings.SELECT_ALL_WORKFLOWS_LABEL }}
              />
              <TableHeaderCell>{intlText.WORKFLOW_NAME}</TableHeaderCell>
              <TableHeaderCell>{intlText.TRIGGER_TYPE}</TableHeaderCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading
              ? logicAppName
                ? [...Array(5)].map((_, index) => (
                    <TableRow key={index} aria-hidden="true">
                      <TableSelectionCell checkboxIndicator={{ 'aria-label': ariaLabelStrings.LOADING_WORKFLOWS_LABEL }} checked={false} />
                      <TableCell>
                        <Skeleton aria-label={ariaLabelStrings.LOADING_WORKFLOWS_LABEL}>
                          <SkeletonItem />
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton aria-label={ariaLabelStrings.LOADING_WORKFLOWS_LABEL}>
                          <SkeletonItem />
                        </Skeleton>
                      </TableCell>
                    </TableRow>
                  ))
                : null
              : rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
                  <TableRow key={item.id} onClick={onClick} onKeyDown={onKeyDown} aria-selected={selected} appearance={appearance}>
                    <TableSelectionCell
                      checked={isConsumption || selected}
                      checkboxIndicator={{ 'aria-label': ariaLabelStrings.CHECKBOX_ROW_LABEL }}
                    />
                    <TableCell>
                      <TableCellLayout>{item.name}</TableCellLayout>
                    </TableCell>
                    <TableCell>
                      <TableCellLayout>{item.trigger}</TableCellLayout>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TemplatesSection>
    </div>
  );
};
