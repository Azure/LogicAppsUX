import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import { TemplatesSection, type TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import { useIntl, type IntlShape } from 'react-intl';
import { useWorkflowsInApp } from '../../../../../core/configuretemplate/utils/queries';
import { ResourcePicker } from '../../../../templates';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect, useMemo } from 'react';
import { equals, hasProperty, type WorkflowResource, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { updateAllWorkflowsData } from '../../../../../core/state/templates/templateSlice';
import { Checkbox, Text } from '@fluentui/react-components';
import { useFunctionalState } from '@react-hookz/web';
import { CheckboxVisibility, DetailsList, Selection, SelectionMode, type IColumn } from '@fluentui/react';

export const SelectWorkflows = ({
  // selectedWorkflowsList,
  onWorkflowsSelected,
}: {
  selectedWorkflowsList: Record<string, Partial<WorkflowResource>>;
  onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void;
}) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isConsumption, logicAppName, subscriptionId, resourceGroup, workflowsInTemplate } = useSelector((state: RootState) => ({
    isConsumption: !!state.workflow.isConsumption,
    logicAppName: state.workflow.logicAppName,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    workflowsInTemplate: state.template.workflows,
    selectedTabId: state.tab.selectedTabId,
  }));
  const { data: workflows, isLoading } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);

  // const onWorkflowSelected = useCallback(
  //   (workflowId: string, checked: boolean) => {
  //     const normalizedWorkflowId = workflowId.toLowerCase();
  //     dispatch(updateWorkflowData({ data: { id: normalizedWorkflowId }, shouldDelete: !checked }));
  //   },
  //   [dispatch]
  // );

  const onLogicAppSelected = useCallback(
    (app: LogicAppResource) => {
      const { id, plan } = app;
      if (equals(plan, 'Consumption')) {
        const normalizedWorkflowId = id.toLowerCase();
        dispatch(updateAllWorkflowsData({ [normalizedWorkflowId]: { id: normalizedWorkflowId } }));
      }
    },
    [dispatch]
  );

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

  const [workflowsList, setWorkflowsList] = useFunctionalState<WorkflowResource[]>(workflows ?? []);

  useEffect(() => {
    setWorkflowsList(workflows ?? []);
  }, [workflows, setWorkflowsList]);

  const [columns, _setColumns] = useFunctionalState<IColumn[]>([
    {
      ariaLabel: intlText.WORKFLOW_NAME,
      fieldName: 'name',
      key: '$name',
      isResizable: true,
      minWidth: 150,
      name: intlText.WORKFLOW_NAME,
      maxWidth: 250,
    },
    {
      ariaLabel: intlText.TRIGGER_TYPE,
      fieldName: 'trigger',
      key: '$trigger',
      isResizable: true,
      minWidth: 150,
      name: intlText.TRIGGER_TYPE,
      maxWidth: 250,
    },
  ]);

  const onRenderItemColumn = (item: WorkflowResource, _index: number | undefined, column: IColumn | undefined) => {
    switch (column?.key) {
      case '$name':
        return <Text aria-label={item.name}>{item.name}</Text>;

      case '$trigger':
        return <Text aria-label={item.triggerType}>{item.triggerType}</Text>;

      default:
        return null;
    }
  };

  const selection: Selection = useMemo(() => {
    const onItemsChange = () => {
      // TODO: reset the selection (pass it from upper component) - done?
      const selectedItemKeys = Object.keys(workflowsInTemplate);
      console.log('selectedItemKeys', selectedItemKeys);
      onWorkflowsSelected([]);

      // const selectedItems = [...allItemsSelected.current.filter((item) => item.selected)];
      // if (selection && selection.getItems().length > 0) {
      //   selectedItemKeys.forEach((workflowKey: string) => {
      //     console.log("---workflowKey", workflowKey)
      //       selection.setKeySelected(workflowKey, true, false);
      //     });
      // }
    };

    const onSelectionChanged = () => {
      const currentSelection = selection.getSelection() as WorkflowResource[];
      const selectedItems = currentSelection.map((item) => item.name.toLowerCase());
      console.log(currentSelection, selectedItems);
      onWorkflowsSelected(selectedItems);

      if (selection && selection.getItems().length > 0) {
        console.log('---selection.getItems()', selection.getItems());

        selectedItems.forEach((workflowKey: string) => {
          selection.setKeySelected(workflowKey, true, true);
        });
      }

      // dispatch(
      //   updateSelectedWorkFlows({
      //     selectedWorkflows: selectedItems,
      //   })
      // );
    };

    return new Selection({
      onSelectionChanged: onSelectionChanged,
      onItemsChanged: onItemsChange,
    });
  }, [workflowsInTemplate, onWorkflowsSelected]);

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      <TemplatesSection title={intlText.SOURCE} titleHtmlFor={'sourceLabel'} description={intlText.SOURCE_LABEL}>
        <ResourcePicker viewMode={'alllogicapps'} onSelectApp={onLogicAppSelected} />
      </TemplatesSection>

      <TemplatesSection title={intlText.WORKFLOWS} titleHtmlFor={'workflowsLabel'} description={intlText.WORKFLOWS_LABEL}>
        <DetailsList
          // setKey="name"
          getKey={(item: any) => {
            console.log('---getKEy', item.name.toLowerCase());
            const key = item.name.toLowerCase();
            return key;
          }} // Ensure keys match the selectedItemKeys format
          items={workflowsList()}
          columns={columns()}
          compact={true}
          onRenderItemColumn={onRenderItemColumn}
          selectionMode={SelectionMode.multiple}
          selection={selection}
          selectionPreservedOnEmptyClick={true}
          checkboxVisibility={CheckboxVisibility.always}
        />
      </TemplatesSection>

      <div>
        <h4>Workflows</h4>
        <div>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            workflows?.map((workflow) => (
              <Checkbox
                // onChange={(_, event) => onWorkflowSelected(workflow.id, !!event.checked)}
                // onChange={(_, event) => onSelectWorkflow(workflow.id, !!event.checked)}
                checked={hasProperty(workflowsInTemplate, workflow.id) || isConsumption}
                disabled={isConsumption}
                label={workflow.name}
                key={workflow.id}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const selectWorkflowsTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    hasError,
    isSaving,
    onClosePanel,
    selectedWorkflowsList,
    onWorkflowsSelected,
  }: ConfigureWorkflowsTabProps & { onWorkflowsSelected: (normalizedWorkflowIds: string[]) => void }
): TemplateTabProps => ({
  id: constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.SELECT_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Select workflows',
    id: 'vWOWFo',
    description: 'The tab label for the monitoring select workflows tab on the configure template wizard',
  }),
  hasError: hasError,
  content: <SelectWorkflows selectedWorkflowsList={selectedWorkflowsList} onWorkflowsSelected={onWorkflowsSelected} />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.CONFIGURE_TEMPLATE_WIZARD_TAB_NAMES.CUSTOMIZE_WORKFLOWS));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Cancel',
      id: '75zXUl',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      onClosePanel();

      //TODO: revert all changes
    },
    secondaryButtonDisabled: isSaving,
  },
});
