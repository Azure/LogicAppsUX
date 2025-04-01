import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useCallback, useEffect, useState } from 'react';
import { ResourcePicker } from '../../ui/templates/basics/resourcepicker';
import { equals, hasProperty, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useWorkflowsInApp } from '../configuretemplate/utils/queries';
import { Button, Checkbox } from '@fluentui/react-components';
import { initializeWorkflowsData } from '../actions/bjsworkflow/configuretemplate';
import { updateAllWorkflowsData, updateWorkflowData } from '../state/templates/templateSlice';
import { TemplateContent, TemplatesPanelFooter, type TemplateTabProps } from '@microsoft/designer-ui';
import { useConfigureTemplateWizardTabs } from '../../ui/configuretemplate/tabs/useWizardTabs';
import { selectWizardTab } from '../state/templates/tabSlice';
import { setLayerHostSelector } from '@fluentui/react';
import { TemplateInfoToast } from '../../ui/configuretemplate/toasters';
import { useIntl } from 'react-intl';

export const ConfigureTemplateWizard = () => {
  useEffect(() => setLayerHostSelector('#msla-layer-host'), []);
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
  const intl = useIntl();
  const [toasterData, setToasterData] = useState({ title: '', content: '', show: false });

  useEffect(() => {
    if (selectedTabId) {
      setToasterData({ title: '', content: '', show: false });
    }
  }, [selectedTabId]);

  const onSaveWorkflows = (isMultiWorkflow: boolean) => {
    if (isMultiWorkflow) {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating an accelerator template!",
          id: '3ST5oT',
          description: 'Title for the toaster after adding workflows.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains more than one workflow, therefore it is classified as an Accelerator.',
          id: 'gkUDy6',
          description: 'Content for the toaster for adding workflows',
        }),
        show: true,
      });
    } else {
      setToasterData({
        title: intl.formatMessage({
          defaultMessage: "You're creating a workflow template!",
          id: '7ERTcu',
          description: 'Title for the toaster after adding a single workflow.',
        }),
        content: intl.formatMessage({
          defaultMessage: 'This template contains one workflow, therefore it is classified as a Workflow.',
          id: '1AFYij',
          description: 'Content for the toaster for adding a single workflow.',
        }),
        show: true,
      });
    }
  };

  const onPublish = () => {
    setToasterData({
      title: intl.formatMessage({
        defaultMessage: 'Your template has been published in production!',
        id: '6TFn8v',
        description: 'Title for the toaster after publishing template.',
      }),
      content: intl.formatMessage({
        defaultMessage: 'Head on over to the gallery page to see your template in action.',
        id: 'ILcDyX',
        description: 'Content for the toaster for after publishing template.',
      }),
      show: true,
    });
  };

  const onInitializeWorkflows = useCallback(() => {
    dispatch(initializeWorkflowsData({ workflows: workflowsInTemplate }));
  }, [dispatch, workflowsInTemplate]);

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

  const panelTabs: TemplateTabProps[] = useConfigureTemplateWizardTabs({ onSaveWorkflows, onPublish });
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

      <TemplateInfoToast {...toasterData} />
      <TemplateContent className="msla-template-quickview-tabs" tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />
      <div className="msla-template-overview-footer">
        {selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={true} {...selectedTabProps?.footerContent} /> : null}
      </div>

      <div
        id={'msla-layer-host'}
        style={{
          position: 'absolute',
          inset: '0px',
          visibility: 'hidden',
        }}
      />
    </div>
  );
};
