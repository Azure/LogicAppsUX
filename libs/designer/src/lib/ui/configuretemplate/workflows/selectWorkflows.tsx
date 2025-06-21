import type { RootState } from '../../../core/state/templates/store';
import { TemplatesSection } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';
import { useWorkflowsInApp } from '../../../core/configuretemplate/utils/queries';
import { ResourcePicker } from '../../templates';
import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { type ArmResource, equals, type LogicAppResource } from '@microsoft/logic-apps-shared';
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
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { useResourceStrings } from '../resources';
import type { WorkflowTemplateData } from '../../../core';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { tableHeaderStyle } from '../common';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';

const disabledStyle = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

export const SelectWorkflows = ({
  selectedWorkflowsList,
  onWorkflowsSelected,
}: {
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
  onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
}) => {
  const intl = useIntl();
  const { isConsumption, logicAppName, subscriptionId, resourceGroup, workflowsInTemplate } = useSelector((state: RootState) => ({
    isConsumption: !!state.workflow.isConsumption,
    logicAppName: state.workflow.logicAppName,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    selectedTabId: state.tab.selectedTabId,
    workflowsInTemplate: state.template.workflows,
  }));
  const { data: workflows, isLoading } = useWorkflowsInApp(
    subscriptionId,
    resourceGroup,
    logicAppName ?? '',
    !!isConsumption,
    filterWorkflows
  );

  const onLogicAppSelected = useCallback(
    (app: LogicAppResource) => {
      const { id, plan } = app;
      if (equals(plan, 'Consumption')) {
        const normalizedWorkflowId = id.toLowerCase();
        onWorkflowsSelected([normalizedWorkflowId]);
      } else {
        onWorkflowsSelected([]);
      }
    },
    [onWorkflowsSelected]
  );

  const workflowSourceIdsInTemplate = useMemo(() => {
    return Object.values(workflowsInTemplate)
      .map((workflow) => workflow.manifest?.metadata?.workflowSourceId)
      .filter((id) => !!id);
  }, [workflowsInTemplate]);

  const resourceStrings = { ...useTemplatesStrings().resourceStrings, ...useResourceStrings() };

  const intlText = {
    SOURCE: intl.formatMessage({
      defaultMessage: 'Project details',
      id: 'gWNQQQ',
      description: 'Title for the resource selection section',
    }),
    SOURCE_LABEL: intl.formatMessage({
      defaultMessage: `Select a subscription, resource group and Logic App instance to find the workflows you want to convert to templates. Your changes apply only to this template and won't affect the original workflows.`,
      id: 'U82s8v',
      description: 'Label for the logic app resource selection description',
    }),
    WORKFLOWS: intl.formatMessage({
      defaultMessage: 'Workflows',
      id: 'NHuGg3',
      description: 'Title for the workflows selection section',
    }),
    WORKFLOWS_LABEL: intl.formatMessage({
      defaultMessage:
        'Select one or more workflows to build your template. A single workflow creates a workflow template; multiple workflows create an accelerator template.',
      id: 'zFTBF1',
      description: 'Label for the workflows selection description',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'kLqXDY',
      description: 'Label for workflow Name',
    }),
    INFO_TEXT: intl.formatMessage({
      defaultMessage: 'Currently, templates only support workflows from the same Logic App instance.',
      id: 'dKW11v',
      description: 'Info message during workflow selection',
    }),
  };

  type WorkflowsTableItem = {
    id: string;
    name: string;
    trigger: string;
    disabled?: boolean;
  };

  const columns: TableColumnDefinition<WorkflowsTableItem>[] = [
    createTableColumn<WorkflowsTableItem>({
      columnId: 'name',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'trigger',
    }),
  ];

  const items = useMemo(
    () =>
      workflows?.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        trigger: workflow.triggerType,
        disabled: isConsumption || workflowSourceIdsInTemplate.includes(workflow.id),
      })) ?? [],
    [workflows, isConsumption, workflowSourceIdsInTemplate]
  );

  const {
    getRows,
    selection: { someRowsSelected, toggleRow, isRowSelected },
  } = useTableFeatures(
    {
      columns,
      items,
    },
    [
      useTableSelection({
        selectionMode: 'multiselect',
        selectedItems: new Set(
          Object.values(selectedWorkflowsList).map((workflow) => workflow.manifest?.metadata?.workflowSourceId as string)
        ),
        onSelectionChange: (_, data) => {
          onWorkflowsSelected(Array.from(data.selectedItems, String));
        },
      }),
    ]
  );

  const rows = getRows((row) => {
    const selected = isConsumption || isRowSelected(row.item.id);
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

  const isAllRowsDisabled = useMemo(() => {
    return items.length > 0 && items.every((item) => item.disabled);
  }, [items]);

  const isAllValidRowsSelected = useMemo(() => {
    return !rows?.filter((row) => !row?.item?.disabled && !row.selected)?.length;
  }, [rows]);

  const toggleAllValidRows = useCallback(() => {
    onWorkflowsSelected(isAllValidRowsSelected ? [] : (items?.filter((item) => !item?.disabled)?.map((workflow) => workflow.id) ?? []));
  }, [onWorkflowsSelected, items, isAllValidRowsSelected]);

  const toggleAllKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        toggleAllValidRows();
        e.preventDefault();
      }
    },
    [toggleAllValidRows]
  );

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      <TemplatesSection title={intlText.SOURCE} titleHtmlFor={'sourceLabel'} description={intlText.SOURCE_LABEL}>
        <div style={{ paddingBottom: 10 }}>
          <MessageBar>
            <MessageBarBody>{intlText.INFO_TEXT}</MessageBarBody>
          </MessageBar>
        </div>
        <ResourcePicker
          viewMode={'alllogicapps'}
          onSelectApp={onLogicAppSelected}
          disableOnValue={!!Object.keys(workflowsInTemplate).length}
        />
      </TemplatesSection>
      <TemplatesSection title={intlText.WORKFLOWS} titleHtmlFor={'workflowsLabel'} description={intlText.WORKFLOWS_LABEL}>
        <Table aria-label={resourceStrings.WorkflowsListTableLabel} style={{ minWidth: '550px' }}>
          <TableHeader>
            <TableRow>
              <TableSelectionCell
                checked={isAllValidRowsSelected ? true : someRowsSelected ? 'mixed' : false}
                onClick={isAllRowsDisabled ? () => {} : toggleAllValidRows}
                onKeyDown={isAllRowsDisabled ? () => {} : toggleAllKeydown}
                checkboxIndicator={{ 'aria-label': resourceStrings.SelectAllWorkflowsLabel }}
                style={isAllRowsDisabled ? disabledStyle : undefined}
              />
              <TableHeaderCell style={tableHeaderStyle}>{intlText.WORKFLOW_NAME}</TableHeaderCell>
              <TableHeaderCell style={tableHeaderStyle}>{resourceStrings.Trigger}</TableHeaderCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading
              ? logicAppName
                ? [...Array(5)].map((_, index) => (
                    <TableRow key={index} aria-hidden="true">
                      <TableSelectionCell checkboxIndicator={{ 'aria-label': resourceStrings.LoadingWorkflowsLabel }} checked={false} />
                      <TableCell>
                        <Skeleton aria-label={resourceStrings.LoadingWorkflowsLabel}>
                          <SkeletonItem />
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton aria-label={resourceStrings.LoadingWorkflowsLabel}>
                          <SkeletonItem />
                        </Skeleton>
                      </TableCell>
                    </TableRow>
                  ))
                : null
              : rows.map(({ item, selected, onClick, onKeyDown, appearance }) => (
                  <TableRow
                    key={item.id}
                    onClick={item.disabled ? () => {} : onClick}
                    onKeyDown={item.disabled ? () => {} : onKeyDown}
                    aria-selected={selected}
                    appearance={appearance}
                    style={item.disabled ? disabledStyle : undefined}
                  >
                    <TableSelectionCell checked={selected} checkboxIndicator={{ 'aria-label': resourceStrings.WorkflowCheckboxRowLabel }} />
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

// TODO: This need to be updated when kind if merged with Stateful in backend [ETA July end]
const filterWorkflows = (workflow: ArmResource<any>) => {
  return !equals(workflow.kind, WorkflowKind.AGENTIC);
};
