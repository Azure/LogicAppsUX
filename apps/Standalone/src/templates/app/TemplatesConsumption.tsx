import { useMemo } from 'react';
import { isOpenApiSchemaVersion, TemplatesDataProvider, type WorkflowParameter } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  BaseTenantService,
  StandardOperationManifestService,
  ConsumptionConnectionService,
  startsWith,
} from '@microsoft/logic-apps-shared';
import {
  getWorkflowAndArtifactsConsumption,
  listCallbackUrl,
  saveWorkflowConsumption,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowAndArtifactsConsumption,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { getDataForConsumption, WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionMapping } from '@microsoft/logic-apps-designer/src/lib/core/state/templates/workflowSlice';
import { parseWorkflowParameterValue } from '@microsoft/logic-apps-designer';
import { BaseTemplateService } from '@microsoft/logic-apps-shared';

const workflowIdentifier = '#workflowname#';

export const TemplatesConsumption = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { resourcePath: workflowId, language } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowData } = useWorkflowAndArtifactsConsumption(workflowId!);
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowData?.location ?? '');

  const { workflow, connectionReferences } = useMemo(() => getDataForConsumption(workflowData), [workflowData]);

  const isWorkflowEmpty = useMemo(() => Object.keys((workflow?.definition as any)?.triggers ?? {}).length === 0, [workflow]);

  const onBlankWorkflowClick = async () => {
    if (!workflowData) {
      return;
    }

    if (isWorkflowEmpty) {
      alert('Workflow is empty, navigate to designer blade');
    }

    const workflowToSave = {
      definition: {
        ...workflow?.definition,
        triggers: {},
        actions: {},
        outputs: {},
        parameters: {},
      },
      parameters: {},
    };

    await saveWorkflowConsumption(workflowData, workflowToSave, () => {}, { throwError: true });
    alert('Workflow overwrote successfully!');
  };

  const createWorkflowCall = async (
    workflows: { name: string | undefined; kind: string | undefined; definition: LogicAppsV2.WorkflowDefinition }[],
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    if (workflowId) {
      const uniqueIdentifier = '';

      let sanitizedWorkflowDefinition = JSON.stringify(workflows[0].definition);
      const sanitizedParameterData: Record<string, WorkflowParameter> = {};
      // Sanitizing parameter name & body
      Object.keys(parametersData).forEach((key) => {
        const parameter = parametersData[key];
        const sanitizedParameterName = replaceWithWorkflowName(parameter.name, uniqueIdentifier);
        sanitizedParameterData[sanitizedParameterName] = {
          type: parameter.type,
          defaultValue: parseWorkflowParameterValue(parameter.type, parameter?.value ?? parameter?.default),
        };
        sanitizedWorkflowDefinition = replaceAllStringInWorkflowDefinition(
          sanitizedWorkflowDefinition,
          `parameters('${parameter.name}')`,
          `parameters('${sanitizedParameterName}')`
        );
      });

      //TODO: update workflows with connections mapping names

      const updatedConnectionReferences = Object.values(connectionsMapping).reduce((acc, group) => {
        for (const key in group) {
          acc[key] = group[key];
        }
        return acc;
      }, {});

      const workflowDefinition = JSON.parse(sanitizedWorkflowDefinition);
      const workflowToSave: any = {
        definition: workflowDefinition,
        parameters: sanitizedParameterData,
        connectionReferences: updatedConnectionReferences,
      };

      const newConnectionsObj: Record<string, any> = {};
      if (Object.keys(updatedConnectionReferences ?? {}).length) {
        await Promise.all(
          Object.keys(updatedConnectionReferences).map(async (referenceKey) => {
            const reference = updatedConnectionReferences[referenceKey];
            const { api, connection, connectionProperties, connectionRuntimeUrl } = reference;
            newConnectionsObj[referenceKey] = {
              api,
              connection,
              connectionId: isOpenApiSchemaVersion(workflowDefinition) ? undefined : connection.id,
              connectionProperties,
              connectionRuntimeUrl,
            };
          })
        );
      }
      workflowToSave.connections = newConnectionsObj;

      const workflowArtifacts = await getWorkflowAndArtifactsConsumption(workflowId!);
      await saveWorkflowConsumption(workflowArtifacts, workflowToSave, () => {}, { throwError: true });
      alert('Workflow saved successfully!');
    } else {
      console.log('Select App Id first!');
    }
  };

  const services = useMemo(
    () => getServices(workflowId!, workflow as any, tenantId, objectId, canonicalLocation, language, onBlankWorkflowClick),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowId, workflow, tenantId, canonicalLocation, language]
  );

  const resourceDetails = new ArmParser(workflowId ?? '');

  if (!workflowData) {
    return null;
  }
  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <TemplatesDataProvider
        resourceDetails={{
          subscriptionId: resourceDetails.subscriptionId,
          resourceGroup: resourceDetails.resourceGroup,
          location: canonicalLocation,
        }}
        connectionReferences={connectionReferences}
        services={services}
        isConsumption={true}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          <TemplatesDesigner
            detailFilters={{
              Category: {
                displayName: 'Categories',
                items: [
                  {
                    value: 'Design Patterns',
                    displayName: 'Design Patterns',
                  },
                  {
                    value: 'AI',
                    displayName: 'AI',
                  },
                  {
                    value: 'B2B',
                    displayName: 'B2B',
                  },
                  {
                    value: 'EDI',
                    displayName: 'EDI',
                  },
                  {
                    value: 'Approval',
                    displayName: 'Approval',
                  },
                  {
                    value: 'RAG',
                    displayName: 'RAG',
                  },
                  {
                    value: 'Automation',
                    displayName: 'Automation',
                  },
                  {
                    value: 'BizTalk Migration',
                    displayName: 'BizTalk Migration',
                  },
                  {
                    value: 'Mainframe Modernization',
                    displayName: 'Mainframe Modernization',
                  },
                ],
              },
            }}
            createWorkflowCall={createWorkflowCall}
            isWorkflowEmpty={isWorkflowEmpty}
          />
        </div>
      </TemplatesDataProvider>
    </TemplatesDesignerProvider>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (
  workflowId: string,
  workflow: any,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string,
  locale: string | undefined,
  onBlankWorkflowClick: () => Promise<void>
): any => {
  const baseUrl = 'https://management.azure.com';
  const { subscriptionId, resourceGroup } = new ArmParser(workflowId);

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

  const connectionService = new ConsumptionConnectionService({
    apiVersion: '2018-07-01-preview',
    baseUrl,
    subscriptionId,
    resourceGroup,
    location,
    tenantId,
    httpClient,
    locale,
  });
  const gatewayService = new BaseGatewayService({
    baseUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });
  const tenantService = new BaseTenantService({
    ...defaultServiceParams,
    apiVersion: '2017-08-01',
  });
  const oAuthService = new StandaloneOAuthService({
    ...defaultServiceParams,
    apiVersion: '2018-07-01-preview',
    subscriptionId,
    resourceGroup,
    location,
    tenantId,
    objectId,
  });
  const operationManifestService = new StandardOperationManifestService(defaultServiceParams);
  const workflowService = {
    getCallbackUrl: (triggerName: string) => listCallbackUrl(workflowId, triggerName, true),
    getAppIdentity: () => workflow?.identity,
    isExplicitAuthRequiredForManagedIdentity: () => false,
    getDefinitionSchema: (operationInfos: { type: string; kind?: string }[]) => {
      return operationInfos.some((info) => startsWith(info.type, 'openapiconnection'))
        ? 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2023-01-31-preview/workflowdefinition.json#'
        : undefined;
    },
  };

  const templateService = new BaseTemplateService({
    openBladeAfterCreate: (_workflowName: string | undefined) => {
      window.alert('Open blade after create, consumption creation is complete');
    },
    onAddBlankWorkflow: onBlankWorkflowClick,
  });

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    templateService,
    workflowService,
  };
};

const replaceWithWorkflowName = (content: string, workflowName: string) => content.replaceAll(workflowIdentifier, workflowName);

const replaceAllStringInWorkflowDefinition = (workflowDefinition: string, oldString: string, newString: string) => {
  return workflowDefinition.replaceAll(oldString, newString);
};
