import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../state/templates/store';
import { useCallback } from 'react';
import { ResourcePicker } from '../../ui/templates/basics/resourcepicker';
import { equals, hasProperty, type LogicAppResource } from '@microsoft/logic-apps-shared';
import { useWorkflowsInApp } from '../configuretemplate/utils/queries';
import { Button, Checkbox } from '@fluentui/react-components';
import { initializeConnectionsFromWorkflows } from '../actions/bjsworkflow/configuretemplate';
import { updateAllWorkflowsData, updateWorkflowData } from '../state/templates/templateSlice';

export const ConfigureTemplateWizard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isConsumption, logicAppName, subscriptionId, resourceGroup, workflowsInTemplate } = useSelector((state: RootState) => ({
    isConsumption: !!state.workflow.isConsumption,
    logicAppName: state.workflow.logicAppName,
    subscriptionId: state.workflow.subscriptionId,
    resourceGroup: state.workflow.resourceGroup,
    workflowsInTemplate: state.template.workflows,
  }));
  const { data: workflows, isLoading } = useWorkflowsInApp(subscriptionId, resourceGroup, logicAppName ?? '', !!isConsumption);

  const onGetConnections = useCallback(() => {
    dispatch(initializeConnectionsFromWorkflows({}));
  }, [dispatch]);

  const onGetParameters = useCallback(() => {
    // dispatch(initializeParametersFromWorkflows({}));
  }, []);

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
      <div>
        <Button onClick={onGetConnections}>{'Get Connections'}</Button>
        <Button onClick={onGetParameters}>{'Get Parameters'}</Button>
      </div>
    </div>
  );
};
