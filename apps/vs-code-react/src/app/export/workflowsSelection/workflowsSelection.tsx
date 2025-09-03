import { QueryKeys } from '../../../run-service';
import type { WorkflowsList, SelectedWorkflowsList } from '../../../run-service';
import { ApiService } from '../../../run-service/export/index';
import type { IDropdownOption } from '../../components/searchableDropdown';
import { updateSelectedWorkFlows } from '../../../state/WorkflowSlice';
import type { AppDispatch, RootState } from '../../../state/store';
import { VSCodeContext } from '../../../webviewCommunication';
import { AdvancedOptions } from './advancedOptions';
import { Filters } from './filters';
import {
  filterWorkflows,
  parsePreviousSelectedWorkflows,
  parseResourceGroups,
  parseSelectedWorkflows,
  updateSelectedItems,
} from './helper';
import { SelectedList } from './selectedList';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { LargeText, XLargeText } from '@microsoft/designer-ui';
import { useExportStyles } from '../exportStyles';
import type { InputProps, TableColumnDefinition, TableColumnSizingOptions } from '@fluentui/react-components';
import {
  Divider,
  MessageBar,
  MessageBarBody,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Skeleton,
  SkeletonItem,
  Checkbox,
  createTableColumn,
  useTableFeatures,
  useTableColumnSizing_unstable,
} from '@fluentui/react-components';

export const WorkflowsSelection: React.FC = () => {
  const vscode = useContext(VSCodeContext);
  const workflowState = useSelector((state: RootState) => state.workflow);
  const styles = useExportStyles();
  const { baseUrl, accessToken, exportData, cloudHost } = workflowState;
  const { selectedSubscription, selectedIse, selectedWorkflows, location } = exportData;

  const [renderWorkflows, setRenderWorkflows] = useState<WorkflowsList[] | null>(null);
  const [resourceGroups, setResourceGroups] = useState<IDropdownOption[]>([]);
  const [searchString, setSearchString] = useState<string>('');
  const allWorkflows = useRef<WorkflowsList[]>([]);
  const allItemsSelected = useRef<SelectedWorkflowsList[]>(parsePreviousSelectedWorkflows(selectedWorkflows));

  const intl = useIntl();
  const dispatch: AppDispatch = useDispatch();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic apps to export',
      id: 'A5rCk8',
      description: 'Select apps to export title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      id: '3rlDsf',
      description: 'Select logic apps to export description',
    }),
    SELECTION: intl.formatMessage({
      defaultMessage: 'Select',
      id: 'jcxLyd',
      description: 'Select logic apps to export description',
    }),
    SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Select all',
      id: '9dqnHP',
      description: 'Select all logic apps to export description',
    }),
    SELECT_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Select logic app',
      id: 'yLua0Y',
      description: 'Select logic app to export description',
    }),
    LIMIT_INFO: intl.formatMessage({
      defaultMessage: 'Selecting more than 15 logic apps affects the export experience performance.',
      id: 'CB/Oue',
      description: 'Limit on selected logic apps warning text',
    }),
    NO_WORKFLOWS: intl.formatMessage({
      defaultMessage: 'No workflows',
      id: 'MvUPPh',
      description: 'No workflows text',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Resource name',
      id: 'dr26iH',
      description: 'Resource name title',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      id: 'UKCoay',
      description: 'Resource group title',
    }),
  };

  const apiService = useMemo(() => {
    return new ApiService({
      baseUrl,
      accessToken,
      cloudHost,
      vscodeContext: vscode,
    });
  }, [accessToken, baseUrl, cloudHost, vscode]);

  const loadWorkflows = () => {
    return apiService.getWorkflows(selectedSubscription, selectedIse, location);
  };

  const { isLoading: isWorkflowsLoading, data: workflowsData } = useQuery<WorkflowsList[]>(
    [QueryKeys.workflowsData, selectedSubscription, selectedIse, location],
    loadWorkflows,
    {
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (isNullOrUndefined(workflowsData)) {
      setRenderWorkflows([]);
      setResourceGroups([]);
      allWorkflows.current = [];
      allItemsSelected.current = [];
    } else {
      setRenderWorkflows(workflowsData);
      setResourceGroups(parseResourceGroups(workflowsData));
      allWorkflows.current = workflowsData;
      allItemsSelected.current = parseSelectedWorkflows(workflowsData, allItemsSelected.current);
    }
  }, [workflowsData]);

  useEffect(() => {
    const updatedItems = updateSelectedItems(allItemsSelected.current, renderWorkflows, selectedWorkflows);
    allItemsSelected.current = updatedItems;
  }, [selectedWorkflows, renderWorkflows, allWorkflows]);

  // DataGrid selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Update selected items when selectedWorkflows changes
  useEffect(() => {
    const newSelectedItems = new Set(selectedWorkflows.map((workflow) => workflow.key));
    setSelectedItems(newSelectedItems);
  }, [selectedWorkflows]);

  // Column sizing configuration
  const columnSizingOptions: TableColumnSizingOptions = useMemo(
    () => ({
      selection: {
        minWidth: 48,
        idealWidth: 48,
        defaultWidth: 48,
      },
      name: {
        minWidth: 150,
        idealWidth: 250,
        defaultWidth: 250,
      },
      resourceGroup: {
        minWidth: 120,
        idealWidth: 200,
        defaultWidth: 200,
      },
    }),
    []
  );

  // Define table columns
  const columns: TableColumnDefinition<WorkflowsList>[] = useMemo(
    () => [
      createTableColumn<WorkflowsList>({
        columnId: 'selection',
        renderHeaderCell: () => '', // We'll render checkbox manually
      }),
      createTableColumn<WorkflowsList>({
        columnId: 'name',
        compare: (a, b) => a.name.localeCompare(b.name),
        renderHeaderCell: () => <>{intlText.NAME}</>,
      }),
      createTableColumn<WorkflowsList>({
        columnId: 'resourceGroup',
        compare: (a, b) => a.resourceGroup.localeCompare(b.resourceGroup),
        renderHeaderCell: () => <>{intlText.RESOURCE_GROUP}</>,
      }),
    ],
    [intlText.NAME, intlText.RESOURCE_GROUP]
  );

  // Initialize table features with column sizing
  const { getRows, columnSizing_unstable, tableRef } = useTableFeatures(
    {
      columns,
      items: renderWorkflows || [],
    },
    [useTableColumnSizing_unstable({ columnSizingOptions })]
  );

  const rows = getRows();

  const workflowsList = useMemo(() => {
    const emptyText = (
      <LargeText text={intlText.NO_WORKFLOWS} style={{ display: 'block' }} className={styles.exportWorkflowsPanelListEmpty} />
    );

    const noWorkflows = renderWorkflows !== null && !renderWorkflows.length && !isWorkflowsLoading ? emptyText : null;
    const enableShimmer = isWorkflowsLoading || renderWorkflows === null;
    const items = renderWorkflows || [];

    if (enableShimmer) {
      // Show skeleton loading state
      return (
        <div className={`${styles.exportWorkflowsPanelListWorkflows} ${styles.exportWorkflowsPanelListWorkflowsLoading}`}>
          <Table aria-label={intlText.SELECT_TITLE} ref={tableRef} {...columnSizing_unstable.getTableProps()}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell {...columnSizing_unstable.getTableHeaderCellProps('selection')}>
                  <Checkbox
                    aria-label={intlText.SELECTION_ALL}
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={(_ev, data) => {
                      if (data.checked) {
                        // Select all
                        const allKeys = new Set(items.map((item) => item.key));
                        setSelectedItems(allKeys);
                        const allItems = allItemsSelected.current.filter((item) => allKeys.has(item.key));
                        dispatch(updateSelectedWorkFlows({ selectedWorkflows: allItems }));
                      } else {
                        // Deselect all
                        setSelectedItems(new Set());
                        dispatch(updateSelectedWorkFlows({ selectedWorkflows: [] }));
                      }
                    }}
                  />
                </TableHeaderCell>
                {columns.slice(1).map((column) => (
                  <TableHeaderCell key={column.columnId} {...columnSizing_unstable.getTableHeaderCellProps(column.columnId)}>
                    {column.renderHeaderCell()}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell {...columnSizing_unstable.getTableCellProps('selection')}>
                    <Checkbox disabled />
                  </TableCell>
                  <TableCell {...columnSizing_unstable.getTableCellProps('name')}>
                    <Skeleton>
                      <SkeletonItem style={{ width: '120px' }} />
                    </Skeleton>
                  </TableCell>
                  <TableCell {...columnSizing_unstable.getTableCellProps('resourceGroup')}>
                    <Skeleton>
                      <SkeletonItem style={{ width: '150px' }} />
                    </Skeleton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    return (
      <div className={styles.exportWorkflowsPanelListWorkflows}>
        <Table aria-label={intlText.SELECT_TITLE} {...columnSizing_unstable.getTableProps()}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell {...columnSizing_unstable.getTableHeaderCellProps('selection')}>
                <Checkbox
                  aria-label={intlText.SELECTION_ALL}
                  checked={selectedItems.size === items.length && items.length > 0}
                  onChange={(_ev, data) => {
                    if (data.checked) {
                      // Select all
                      const allKeys = new Set(items.map((item) => item.key));
                      setSelectedItems(allKeys);
                      const allItems = allItemsSelected.current.filter((item) => allKeys.has(item.key));
                      dispatch(updateSelectedWorkFlows({ selectedWorkflows: allItems }));
                    } else {
                      // Deselect all
                      setSelectedItems(new Set());
                      dispatch(updateSelectedWorkFlows({ selectedWorkflows: [] }));
                    }
                  }}
                />
              </TableHeaderCell>
              {columns.slice(1).map((column) => (
                <TableHeaderCell key={column.columnId} {...columnSizing_unstable.getTableHeaderCellProps(column.columnId)}>
                  {column.renderHeaderCell()}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item }) => (
              <TableRow key={item.key}>
                <TableCell {...columnSizing_unstable.getTableCellProps('selection')}>
                  <Checkbox
                    aria-label={intlText.SELECT_WORKFLOW}
                    checked={selectedItems.has(item.key)}
                    onChange={(_ev, data) => {
                      const newSelection = new Set(selectedItems);
                      if (data.checked) {
                        newSelection.add(item.key);
                      } else {
                        newSelection.delete(item.key);
                      }
                      setSelectedItems(newSelection);

                      const selectedWorkflowItems = allItemsSelected.current.filter((workflow) => newSelection.has(workflow.key));
                      dispatch(updateSelectedWorkFlows({ selectedWorkflows: selectedWorkflowItems }));
                    }}
                  />
                </TableCell>
                <TableCell {...columnSizing_unstable.getTableCellProps('name')}>{item.name}</TableCell>
                <TableCell {...columnSizing_unstable.getTableCellProps('resourceGroup')}>{item.resourceGroup}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {noWorkflows}
      </div>
    );
  }, [
    intlText.NO_WORKFLOWS,
    intlText.SELECT_TITLE,
    intlText.SELECTION_ALL,
    intlText.SELECT_WORKFLOW,
    styles.exportWorkflowsPanelListEmpty,
    styles.exportWorkflowsPanelListWorkflows,
    styles.exportWorkflowsPanelListWorkflowsLoading,
    renderWorkflows,
    isWorkflowsLoading,
    selectedItems,
    dispatch,
    columnSizing_unstable,
    columns,
    tableRef,
    rows,
  ]);

  const limitInfo = useMemo(() => {
    return selectedWorkflows.length >= 15 ? (
      <MessageBar className={styles.exportWorkflowsPanelLimitInfo} intent="info" layout={'multiline'}>
        <MessageBarBody> {intlText.LIMIT_INFO}</MessageBarBody>
      </MessageBar>
    ) : null;
  }, [intlText.LIMIT_INFO, selectedWorkflows.length, styles.exportWorkflowsPanelLimitInfo]);

  const filters = useMemo(() => {
    const onChangeSearch: InputProps['onChange'] = (_event, data) => {
      const newSearchString = data.value;
      const filteredWorkflows = filterWorkflows(allWorkflows.current, resourceGroups, newSearchString);
      allItemsSelected.current = allItemsSelected.current.map((workflow) => {
        const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
        return { ...workflow, rendered: isWorkflowInRender };
      });
      setRenderWorkflows(filteredWorkflows);
      setSearchString(newSearchString);
    };

    const onChangeResourceGroup = (_event: React.FormEvent<HTMLDivElement>, selectedOption: IDropdownOption) => {
      const updatedResourceGroups = [...resourceGroups];
      const resourceGroupIndex = updatedResourceGroups.findIndex((rg) => rg.key === selectedOption.key);
      if (resourceGroupIndex !== -1) {
        updatedResourceGroups[resourceGroupIndex].selected = !updatedResourceGroups[resourceGroupIndex].selected;
      }
      const filteredWorkflows = filterWorkflows(allWorkflows.current, updatedResourceGroups, searchString);
      allItemsSelected.current = allItemsSelected.current.map((workflow) => {
        const isWorkflowInRender = !!filteredWorkflows.find((item: WorkflowsList) => item.key === workflow.key);
        return { ...workflow, rendered: isWorkflowInRender };
      });

      setRenderWorkflows(filteredWorkflows);
      setResourceGroups(updatedResourceGroups);
    };

    return (
      <Filters
        dropdownOptions={resourceGroups}
        onChangeResourceGroup={onChangeResourceGroup}
        onChangeSearch={onChangeSearch}
        isDataLoading={isWorkflowsLoading}
      />
    );
  }, [resourceGroups, isWorkflowsLoading, allWorkflows, searchString]);

  const deselectItemKey = (itemKey: string) => {
    return new Promise<void>((resolve) => {
      const copyAllItems = [...allItemsSelected.current];
      const newSelection = [...selectedWorkflows.filter((item) => item.key !== itemKey)];
      const deselectedItem = copyAllItems.find((workflow) => workflow.key === itemKey);
      if (deselectedItem) {
        deselectedItem.selected = false;
      }
      allItemsSelected.current = copyAllItems;

      dispatch(
        updateSelectedWorkFlows({
          selectedWorkflows: newSelection,
        })
      );

      resolve();
    });
  };

  const deselectWorkflow = async (itemKey: string) => {
    await deselectItemKey(itemKey);
    const newSelection = new Set(selectedItems);
    newSelection.delete(itemKey);
    setSelectedItems(newSelection);
  };

  return (
    <>
      <div className={styles.exportWorkflowsPanel}>
        <div className={styles.exportWorkflowsPanelList}>
          <XLargeText style={{ display: 'block' }} text={intlText.SELECT_TITLE} />
          <LargeText style={{ display: 'block' }} text={intlText.SELECT_DESCRIPTION} />
          {limitInfo}
          {filters}
          {workflowsList}
        </div>
        <Divider vertical className={styles.exportWorkflowsPanelDivider} />
        <SelectedList isLoading={isWorkflowsLoading || renderWorkflows === null} deselectWorkflow={deselectWorkflow} />
      </div>
      <AdvancedOptions />
    </>
  );
};
