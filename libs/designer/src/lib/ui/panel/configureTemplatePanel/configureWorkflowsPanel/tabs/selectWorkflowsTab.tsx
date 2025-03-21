import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import constants from '../../../../../common/constants';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import type { ConfigureWorkflowsTabProps } from '../configureWorkflowsPanel';
import type { IntlShape } from 'react-intl';
import { useWorkflowsInApp } from '../../../../../core/configuretemplate/utils/queries';
import { ResourcePicker } from '../../../../templates';
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { equals, hasProperty, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { updateAllWorkflowsData, updateWorkflowData } from '../../../../../core/state/templates/templateSlice';
import { Checkbox } from '@fluentui/react-components';

export const SelectWorkflows = () => {
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

  const onWorkflowSelected = useCallback(
    (workflowId: string, checked: boolean) => {
      const normalizedWorkflowId = workflowId.toLowerCase();
      dispatch(updateWorkflowData({ data: { id: normalizedWorkflowId }, shouldDelete: !checked }));
    },
    [dispatch]
  );

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

  return (
    <div>
      <ResourcePicker viewMode={'alllogicapps'} onSelectApp={onLogicAppSelected} />
      <div>
        <h4>Workflows</h4>
        <div>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            workflows?.map((workflow) => (
              <Checkbox
                onChange={(_, event) => onWorkflowSelected(workflow.id, !!event.checked)}
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
  { hasError, isSaving, onClosePanel }: ConfigureWorkflowsTabProps
): TemplateTabProps => ({
  id: constants.TEMPLATE_TAB_NAMES.SELECT_WORKFLOWS,
  title: intl.formatMessage({
    defaultMessage: 'Select workflows',
    id: 'vWOWFo',
    description: 'The tab label for the monitoring select workflows tab on the configure template wizard',
  }),
  hasError: hasError,
  content: <SelectWorkflows />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_TAB_NAMES.CUSTOMIZE_WORKFLOWS));
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
