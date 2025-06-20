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
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  tokens,
  Link,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { CommandBar, type ICommandBarItemProps, mergeStyles, PrimaryButton } from '@fluentui/react';
import { useCallback, useMemo, useState } from 'react';
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
import { useTemplateWorkflowResources } from '../../../core/configuretemplate/utils/queries';
import { getDateTimeString } from '../../../core/configuretemplate/utils/helper';
import { EditWorkflowsPanel } from '../panels/configureWorkflowsPanel/edit/editWorkflowsPanel';

const columnTextStyle: React.CSSProperties = {
  display: '-webkit-box',
  WebkitLineClamp: 1,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word',
  lineBreak: 'anywhere',
};

export const DisplayWorkflows = ({ onSave }: { onSave: (isMultiWorkflow: boolean) => void }) => {
  const intl = useIntl();
  const { workflows, currentPanelView, apiErrors, saveErrors, isLoading, templateId, status } = useSelector((state: RootState) => ({
    workflows: state.template.workflows ?? {},
    apiErrors: state.template.apiValidatationErrors?.workflows ?? {},
    saveErrors: state.template.apiValidatationErrors?.saveGeneral?.workflows,
    currentPanelView: state.panel.currentPanelView,
    isLoading: state.template.dataIsLoading,
    templateId: state.template.manifest?.id as string,
    status: state.template.status,
  }));
  const hasErrors = useMemo(() => saveErrors || workflowsHaveErrors(apiErrors, workflows), [apiErrors, saveErrors, workflows]);
  const { data: workflowResources, isLoading: workflowResourcesLoading } = useTemplateWorkflowResources(templateId);
  const dispatch = useDispatch<AppDispatch>();
  const isMultiWorkflow = Object.keys(workflows).length > 1;

  const [selectedWorkflowsList, setSelectedWorkflowsList] = useFunctionalState<string[]>([]);
  const [workflowListToBeEdited, setWorkflowListToBeEdited] = useFunctionalState<string[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const isPublishedTemplate = useMemo(() => status !== 'Development', [status]);

  const intlText = useMemo(
    () => ({
      ADD: intl.formatMessage({
        defaultMessage: 'Add',
        id: 'I2XWRg',
        description: 'Button text for opening panel for adding workflows',
      }),
      EDIT: intl.formatMessage({
        defaultMessage: 'Edit',
        id: 'p2eSD1',
        description: 'Button text for opening panel for editing workflows',
      }),
      DELETE: intl.formatMessage({
        defaultMessage: 'Delete',
        id: 'Ld62T8',
        description: 'Button text for deleting selected workflows',
      }),
      DELETE_WORKFLOWS: intl.formatMessage({
        defaultMessage: 'Delete workflows',
        id: 'YRW3/2',
        description: 'Title text for deleting selected workflows',
      }),
      EMPTY_TITLE: intl.formatMessage({
        defaultMessage: 'Add workflows for this template',
        id: '+yTsXQ',
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
      DELETE_CONFIRM_TEXT: intl.formatMessage({
        defaultMessage: 'Do you want to delete the workflow(s)? This will remove the workflow(s) from this template.',
        id: 'gt3JdS',
        description: 'Body text for informing users this action is deleting selected workflows',
      }),
      DELETE_UNPUBLISH_CONFIRM_TEXT: intl.formatMessage({
        defaultMessage: `Deleting workflows wlil remove them from this template. The template will be unpublished and won't appear in the template library until it is republished. Do you want to delete the workflow(s) and unpublish?`,
        id: 'r/H4us',
        description: 'Body text for informing users this action is deleting selected workflows and unpublishing the template',
      }),
      CLOSE: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: '4LQwvg',
        description: 'Button text for cancelling deleting workflows',
      }),
    }),
    [intl]
  );

  const customResourceStrings = useResourceStrings();
  const { stateTypes, resourceStrings } = useTemplatesStrings();

  const handleAddWorkflows = useCallback(() => {
    dispatch(openPanelView({ panelView: TemplatePanelView.ConfigureWorkflows }));
  }, [dispatch]);

  const handleEditWorkflows = useCallback(() => {
    setWorkflowListToBeEdited(selectedWorkflowsList());
    dispatch(openPanelView({ panelView: TemplatePanelView.EditWorkflows }));
  }, [dispatch, setWorkflowListToBeEdited, selectedWorkflowsList]);

  const handleSelectWorkflow = useCallback(
    (workflowId: string) => {
      setWorkflowListToBeEdited([workflowId]);
      dispatch(openPanelView({ panelView: TemplatePanelView.EditWorkflows }));
    },
    [dispatch, setWorkflowListToBeEdited]
  );

  const commandBarItems: ICommandBarItemProps[] = [
    {
      key: 'add',
      text: intlText.ADD,
      iconProps: { iconName: 'Add' },
      onClick: handleAddWorkflows,
    },
    {
      key: 'edit',
      text: intlText.EDIT,
      iconProps: { iconName: 'Edit' },
      disabled: !selectedWorkflowsList().length,
      onClick: handleEditWorkflows,
    },
    {
      key: 'delete',
      text: intlText.DELETE,
      iconProps: { iconName: 'Trash' },
      disabled: !selectedWorkflowsList().length,
      onClick: () => {
        setIsDeleteModalOpen(true);
      },
    },
  ];

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
    selection: { toggleRow, isRowSelected },
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

  const allRowsSelected = useMemo(() => {
    return !rows?.filter((row) => !row.selected)?.length;
  }, [rows]);

  const toggleAllRows = useCallback(() => {
    setSelectedWorkflowsList(allRowsSelected ? [] : Object.values(workflows).map((workflowData) => workflowData.id));
  }, [setSelectedWorkflowsList, workflows, allRowsSelected]);

  const toggleAllKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        toggleAllRows();
        e.preventDefault();
      }
    },
    [toggleAllRows]
  );

  return (
    <div className="msla-templates-wizard-tab-content">
      {currentPanelView === TemplatePanelView.ConfigureWorkflows && <ConfigureWorkflowsPanel onSave={onSave} />}
      {currentPanelView === TemplatePanelView.EditWorkflows && (
        <EditWorkflowsPanel onSave={onSave} selectedWorkflowIds={workflowListToBeEdited()} />
      )}

      <DescriptionWithLink
        text={customResourceStrings.WorkflowsTabDescription}
        linkText={customResourceStrings.LearnMore}
        linkUrl="https://go.microsoft.com/fwlink/?linkid=2321817"
        className={mergeStyles({ marginLeft: '-1px', width: '70%' })}
      />

      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(_, data) => {
          setIsDeleteModalOpen(data.open);
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{intlText.DELETE_WORKFLOWS}</DialogTitle>
            <DialogContent>{isPublishedTemplate ? intlText.DELETE_UNPUBLISH_CONFIRM_TEXT : intlText.DELETE_CONFIRM_TEXT}</DialogContent>
            <DialogActions>
              <Button
                appearance="primary"
                style={{
                  background: tokens.colorStatusDangerForeground1,
                }}
                onClick={() => {
                  const deletedIds = selectedWorkflowsList();
                  dispatch(deleteWorkflowData({ ids: deletedIds }));
                  setSelectedWorkflowsList((prev) => prev.filter((id) => !deletedIds.includes(id)));
                  setIsDeleteModalOpen(false);
                }}
              >
                {intlText.DELETE_WORKFLOWS}
              </Button>
              <DialogTrigger disableButtonEnhancement>
                <Button
                  appearance="secondary"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                  }}
                >
                  {intlText.CLOSE}
                </Button>
              </DialogTrigger>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

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
                checked={allRowsSelected}
                checkboxIndicator={{ 'aria-label': customResourceStrings.SelectAllWorkflowsLabel }}
                onClick={toggleAllRows}
                onKeyDown={toggleAllKeydown}
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
                <TableCellLayout>
                  <Link
                    style={columnTextStyle}
                    as="button"
                    onClick={() => {
                      handleSelectWorkflow(item.id);
                    }}
                  >
                    {item.id}
                  </Link>
                </TableCellLayout>
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
            <PrimaryButton onClick={handleAddWorkflows}>{intlText.ADD}</PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};
