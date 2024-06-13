import type { ReactNode } from 'react';
import { ReactQueryProvider, TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { environment, loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import axios from 'axios';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { appId, isConsumption, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const navigate = useNavigate();

  const sanitizeParameterName = (parameterName: string, workflowName: string) =>
    parameterName.replace('_#workflowname#', `_${workflowName}`);

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
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
        let sanitizedWorkflowDefinitionString = JSON.stringify(workflowDefinition);
        const sanitizedParameterData: ParametersData = {};

        // Sanitizing parameter name & body
        Object.keys(parametersData).forEach((key) => {
          const parameter = parametersData[key];
          const sanitizedParameterName = sanitizeParameterName(parameter.name, workflowName);
          sanitizedParameterData[sanitizedParameterName] = {
            type: parameter.type,
            description: parameter?.description,
            value: parameter?.value ?? parameter?.default,
          };
          sanitizedWorkflowDefinitionString = sanitizedWorkflowDefinitionString.replaceAll(
            `@parameters('${parameter.name}')`,
            `@parameters('${sanitizedParameterName}')`
          );
        });

        const workflow = {
          definition: JSON.parse(sanitizedWorkflowDefinitionString),
          connectionReferences: undefined, //TODO: change this after connections is done
          parameters: sanitizedParameterData,
          kind: workflowKind,
        };

        const getExistingParametersData = async () => {
          try {
            const response = await axios.get(
              `https://management.azure.com${appId}/hostruntime/admin/vfs/parameters.json?api-version=2018-11-01&relativepath=1`,
              {
                headers: {
                  'If-Match': '*',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${environment.armToken}`,
                },
              }
            );
            return response.data as ParametersData;
          } catch (error: any) {
            return error?.response?.status === 404 ? {} : undefined;
          }
        };
        try {
          const existingParametersData = await getExistingParametersData();

          if (!existingParametersData) {
            alert('Error fetching parameters');
            return;
          }

          const updatedParametersData: ParametersData = {
            ...existingParametersData,
            ...sanitizedParameterData,
          };
          await saveWorkflowStandard(
            appId,
            workflowNameToUse,
            workflow,
            undefined,
            updatedParametersData,
            undefined,
            undefined,
            callBack,
            true
          );
        } catch (error) {
          console.log(error);
        }
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
          <TemplatesDataProvider isConsumption={isConsumption} existingWorkflowName={existingWorkflowName}>
            <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      </LoadWhenArmTokenIsLoaded>
    </ReactQueryProvider>
  );
};
