import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useCallback, useState } from 'react';
import { ResourcePicker } from '../../ui/templates/basics/resourcepicker';
import { equals, hasProperty, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useWorkflowsInApp } from '../configuretemplate/utils/queries';
import { Button, Checkbox } from '@fluentui/react-components';
import { initializeWorkflowsData } from '../actions/bjsworkflow/configuretemplate';
import { updateAllWorkflowsData, updateWorkflowData } from '../state/templates/templateSlice';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { useConfigureTemplateWizardTabs } from '../../ui/configuretemplate/tabs/useWizardTabs';
import { selectWizardTab } from '../state/templates/tabSlice';
import { FeaturedConnectors } from '../../ui/configuretemplate/templateprofile/connectors';

export const ConfigureTemplateWizard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isConsumption, logicAppName, subscriptionId, resourceGroup, workflowsInTemplate, selectedTabId } = useSelector(
    (state: RootState) => ({
      isConsumption: !!state.workflow.isConsumption,
      logicAppName: state.workflow.logicAppName,
      subscriptionId: state.workflow.subscriptionId,
      resourceGroup: state.workflow.resourceGroup,
      workflowsInTemplate: state.template.workflows,
      selectedTabId: state.tab.selectedTabId,
    })
  );
  const { data: workflows, isLoading } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);
  const [showFeaturedConnectors, setShowFeaturedConnectors] = useState(false);

  const onInitializeWorkflows = useCallback(() => {
    dispatch(initializeWorkflowsData({}));
    setShowFeaturedConnectors(true);
  }, [dispatch]);

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

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectWizardTab(tabId));
  };

  const panelTabs: TemplateTabProps[] = useConfigureTemplateWizardTabs();
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];

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
      <div>
        <Button onClick={onInitializeWorkflows}>{'Initialize Workflows'}</Button>
      </div>

      <p>
        {'Featured Connectors'}
        <br />
        {showFeaturedConnectors ? <FeaturedConnectors /> : 'Click "Initialize Workflows" to show featured connectors'}
      </p>

      <TemplateContent className="msla-template-quickview-tabs" tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      <div className="msla-template-overview-footer">
        {selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={true} {...selectedTabProps?.footerContent} /> : null}
      </div>
    </div>
  );
};
