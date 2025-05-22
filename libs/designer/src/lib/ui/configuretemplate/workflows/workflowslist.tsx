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
  Image,
  Spinner,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { CommandBar, type ICommandBarItemProps, mergeStyles, PrimaryButton } from '@fluentui/react';
import { useCallback, useMemo } from 'react';
import { openPanelView, TemplatePanelView } from '../../../core/state/templates/panelSlice';
import { useFunctionalState } from '@react-hookz/web';
import { deleteWorkflowData } from '../../../core/actions/bjsworkflow/configuretemplate';
import { useResourceStrings } from '../resources';
import { useTemplatesStrings } from '../../templates/templatesStrings';
import { WorkflowKind } from '../../../core/state/workflow/workflowInterfaces';
import { equals } from '@microsoft/logic-apps-shared';
import { ConfigureWorkflowsPanel } from '../panels/configureWorkflowsPanel/configureWorkflowsPanel';
import { DescriptionWithLink, tableHeaderStyle, ErrorBar } from '../common';
import { workflowsHaveErrors } from '../../../core/configuretemplate/utils/errors';
import EBookIcon from '../../../common/images/templates/openbook.svg';
import { useTemplateWorkflows } from '../../../core/configuretemplate/utils/queries';
import { getDateTimeString } from '../../../core/configuretemplate/utils/helper';

export const DisplayWorkflows = ({ onSave }: { onSave: (isMultiWorkflow: boolean) => void }) => {
  const intl = useIntl();
  const { workflows, currentPanelView, apiErrors, saveErrors, isLoading, templateId } = useSelector((state: RootState) => ({
    workflows: state.template.workflows ?? {},
    apiErrors: state.template.apiValidatationErrors?.workflows ?? {},
    saveErrors: state.template.apiValidatationErrors?.saveGeneral?.workflows,
    currentPanelView: state.panel.currentPanelView,
    isLoading: state.template.dataIsLoading,
    templateId: state.template.manifest?.id as string,
  }));
  const hasErrors = useMemo(() => saveErrors || workflowsHaveErrors(apiErrors, workflows), [apiErrors, saveErrors, workflows]);
  const { data: workflowResources, isLoading: workflowResourcesLoading } = useTemplateWorkflows(templateId);
  const dispatch = useDispatch<AppDispatch>();
  const isMultiWorkflow = Object.keys(workflows).length > 1;

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
      ERROR_TITLE: intl.formatMessage({
        defaultMessage: 'Validation failed for workflows: ',
        id: '9bQctz',
        description: 'The error title for the workflows tab',
      }),
      ERROR_DESCRIPTION: intl.formatMessage({
        defaultMessage: 'Please open the panel for details to fix the errors.',
        id: 'WZSmrm',
        description: 'The error description for the workflows tab',
      }),
      LOADING_TEXT: intl.formatMessage({
        defaultMessage: 'Loading workflows...',
        id: 'a7qE4l',
        description: 'Loading text for workflows',
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
    dateModified: string;
    dateCreated: string;
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
    createTableColumn<WorkflowsTableItem>({
      columnId: 'dateModified',
    }),
    createTableColumn<WorkflowsTableItem>({
      columnId: 'dateCreated',
    }),
  ];

  const items = useMemo(
    () =>
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
        dateModified: workflowResourcesLoading
          ? customResourceStrings.Placeholder
          : getDateTimeString(
              (workflowResources ?? []).find((workflow) => equals(workflow.name, workflowData.id))?.systemData?.lastModifiedAt ?? '',
              customResourceStrings.Placeholder
            ),
        dateCreated: workflowResourcesLoading
          ? customResourceStrings.Placeholder
          : getDateTimeString(
              (workflowResources ?? []).find((workflow) => equals(workflow.name, workflowData.id))?.systemData?.createdAt ?? '',
              customResourceStrings.Placeholder
            ),
      })) ?? [],
    [customResourceStrings.Placeholder, stateTypes.STATEFUL, stateTypes.STATELESS, workflowResources, workflowResourcesLoading, workflows]
  );

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
        linkUrl="https://go.microsoft.com/fwlink/?linkid=2321817"
        className={mergeStyles({ marginLeft: '-1px', width: '70%' })}
      />

      {hasErrors ? (
        <ErrorBar title={intlText.ERROR_TITLE} errorMessage={intlText.ERROR_DESCRIPTION} styles={{ marginLeft: '-1px' }} />
      ) : null}
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

      {isLoading ? (
        <Spinner size="huge" label={intlText.LOADING_TEXT} style={{ height: '50%' }} />
      ) : Object.keys(workflows).length > 0 ? (
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
              <TableHeaderCell style={tableHeaderStyle}>{customResourceStrings.LastModified}</TableHeaderCell>
              <TableHeaderCell style={tableHeaderStyle}>{customResourceStrings.CreatedDate}</TableHeaderCell>
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
              <TableCell>
                <TableCellLayout>{item.dateModified}</TableCellLayout>
              </TableCell>
              <TableCell>
                <TableCellLayout>{item.dateCreated}</TableCellLayout>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <div style={{ height: '50%' }} className="msla-templates-empty-list">
          <Image src={EBookIcon} width={'20%'} height={'20%'} />
          <Text weight="semibold" size={500} style={{ padding: '20px 0 10px 0' }}>
            {intlText.EMPTY_TITLE}
          </Text>
          <DescriptionWithLink
            text={customResourceStrings.WorkflowsTabDescription}
            linkText={customResourceStrings.LearnMore}
            linkUrl="https://go.microsoft.com/fwlink/?linkid=2321817"
            className={mergeStyles({ width: '40%', marginTop: 0 })}
          />
          <div style={{ padding: '10px 0' }}>
            <PrimaryButton onClick={handleAddWorkflows}>{intlText.EDIT}</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
