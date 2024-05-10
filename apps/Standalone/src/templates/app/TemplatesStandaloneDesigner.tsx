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
  const { appId, isConsumption, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const navigate = useNavigate();

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    const workflow = {
      definition: workflowDefinition,
      connectionReferences: undefined, //TODO: change this after connections is done
      parameters: parametersData,
      kind: workflowKind,
    };
    const callBack = () => {
      console.log('Created workflow, TODO: now redirect');
      navigate('/');
    };
    if (appId) {
      if (isConsumption) {
        console.log('Consumption is not ready yet!');
        // await saveWorkflowConsumption({
        //   id: appId,
        //   name: workflowNameToUse,
        //   type: "json", //TODO: figure out what this type is and replace it
        //   kind: workflowKind,
        //   properties: {
        //     files: {
        //       [Artifact.WorkflowFile]: workflow,
        //       [Artifact.ParametersFile]: parametersData as ParametersData,
        //       [Artifact.ConnectionsFile]: _connectionsData
        //     },
        //     health: {},
        //   }
        // }, workflow);
      } else {
        console.log('calling create workflow standard');
        await saveWorkflowStandard(
          appId,
          workflowNameToUse,
          workflow,
          undefined,
          parametersData as ParametersData,
          undefined,
          undefined,
          callBack,
          true
        );
      }
    } else {
      console.log('Select App Id first!');
    }
  };

  return (
    <ReactQueryProvider>
      <LoadWhenArmTokenIsLoaded>
        <DevToolbox />
        <TemplatesDesignerProvider locale="en-US" theme={theme}>
          <TemplatesDataProvider appId={appId} isConsumption={isConsumption} workflowName={existingWorkflowName}>
            <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
