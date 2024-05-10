import type { ReactNode } from 'react';
import { ReactQueryProvider, TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { appId, isConsumption, workflowName } = useSelector((state: RootState) => state.workflowLoader);
  const navigate = useNavigate();

  const createWorkflowCall = (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    const workflow = {
      definition: workflowDefinition,
      connectionReferences: undefined, //TODO: change this after connections is done
      parameter: parametersData,
      kind: workflowKind,
    };
    const callBack = () => {
      console.log('Created workflow, TODO: now redirect');
      navigate('/');
    };
    if (appId) {
      //TODO: call API
      saveWorkflowStandard(
        appId,
        workflowName,
        workflow,
        undefined,
        parametersData as ParametersData,
        undefined,
        undefined,
        callBack,
        true
      );
    } else {
      console.log('Select App Id first!');
    }
  };

  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <TemplatesDesignerProvider locale="en-US" theme={theme}>
          <TemplatesDataProvider appId={appId} isConsumption={isConsumption} workflowName={workflowName}>
            <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
