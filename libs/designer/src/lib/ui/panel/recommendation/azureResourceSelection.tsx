import Constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import { useRelationshipIds, useIsParallelBranch, useIsAddingTrigger } from '../../../core/state/panel/panelSelectors';
import { ChoiceGroup, PrimaryButton, Text } from '@fluentui/react';
import { ApiManagementService, FunctionService, SearchService, AppServiceService } from '@microsoft/designer-client-services-logic-apps';
import { AzureResourcePicker } from '@microsoft/designer-ui';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/utils-logic-apps';
import { getResourceGroupFromWorkflowId } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

interface AzureResourceSelectionProps {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
}

interface AddResourceOperationParameters {
  name: string;
  swaggerParameters?: OpenAPIV2.Document;
  presetParameterValues?: Record<string, any>;
}

export const AzureResourceSelection = (props: AzureResourceSelectionProps) => {
  const { operation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const apimTitleText = intl.formatMessage({
    defaultMessage: 'Select an API Management resource',
    description: 'Select an API Management resource',
  });
  const appServiceTitleText = intl.formatMessage({
    defaultMessage: 'Select an App Service resource',
    description: 'Select an App Service resource',
  });
  const functionAppTitleText = intl.formatMessage({
    defaultMessage: 'Select a Function App resource',
    description: 'Select a Function App resource',
  });
  const manualWorkflowTitleText = intl.formatMessage({
    defaultMessage: 'Select a Manual Workflow resource',
    description: 'Select a Manual Workflow resource',
  });
  const batchWorkflowTitleText = intl.formatMessage({
    defaultMessage: 'Select a Batch Workflow resource',
    description: 'Select a Batch Workflow resource',
  });

  const [titleText, setTitleText] = useState('');

  const [selectedResources, setSelectedResources] = useState<any[]>([]);
  const setResourceAtDepth = useCallback((resource: any, depth: number) => {
    setSelectedResources((prev) => {
      const newResources = [...prev];
      newResources[depth] = resource;
      newResources.splice(depth + 1);
      return newResources;
    });
  }, []);

  const [resourceTypes, setResourceTypes] = useState<string[]>([]);

  const [getResourcesCallbacks, setGetResourcesCallbacks] = useState<((any?: any) => any)[]>(() => []);

  const isTrigger = useIsAddingTrigger();
  const relationshipIds = useRelationshipIds();
  const isParallelBranch = useIsParallelBranch();

  const addResourceOperation = useCallback(
    (props: AddResourceOperationParameters) => {
      const { name, swaggerParameters, presetParameterValues } = props;
      const newNodeId = name.replaceAll(' ', '_');
      dispatch(
        addOperation({
          operation,
          relationshipIds,
          nodeId: newNodeId,
          isParallelBranch,
          isTrigger,
          swaggerParameters,
          presetParameterValues,
        })
      );
    },
    [dispatch, isParallelBranch, isTrigger, relationshipIds, operation]
  );

  // Parses the swagger object to get the paths and methods in an array
  const getOptionsFromPaths = useCallback((paths?: any): any[] => {
    const methodsArray = Object.entries(paths).map(([id, pathObj]: [string, any]) =>
      Object.entries(pathObj).map(([method, methodObj]: [string, any]) => ({ ...methodObj, method, uri: id, id: `${method} ${id}` }))
    );
    return methodsArray.flat();
  }, []);

  const [submitCallback, setSubmitCallback] = useState<(any?: any) => any>(() => () => Promise.resolve([]));

  useEffect(() => {
    switch (operation.id) {
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_TRIGGER:
        setTitleText(apimTitleText);
        setResourceTypes(['apiManagement', 'action', 'operation']);
        setGetResourcesCallbacks(() => [
          () => ApiManagementService().fetchApiManagementInstances(),
          (apiManagement?: any) => ApiManagementService().fetchApisInApiM(apiManagement.id ?? ''),
        ]);
        setSubmitCallback(() => () => {
          addResourceOperation({
            name: getResourceName(selectedResources[1]),
            swaggerParameters: selectedResources[1],
            // TODO: Add parameters from selected resources
          });
        });
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_ACTION:
      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APPSERVICE_TRIGGER:
        setTitleText(appServiceTitleText);
        setResourceTypes(['appService', 'service']);
        setGetResourcesCallbacks(() => [
          () => AppServiceService().fetchAppServices(),
          (service?: any) =>
            AppServiceService()
              .fetchAppServiceApiSwagger(service)
              .then((swagger) => getOptionsFromPaths(swagger?.paths)),
        ]);
        setSubmitCallback(() => () => {
          addResourceOperation({
            name: selectedResources[1]?.id,
            // TODO: Add parameters from selected resources
          });
        });
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_FUNCTION_ACTION:
        setTitleText(functionAppTitleText);
        setResourceTypes(['functionApp', 'function']);
        setGetResourcesCallbacks(() => [
          () => FunctionService().fetchFunctionApps(),
          (functionApp?: any) => FunctionService().fetchFunctionAppsFunctions(functionApp.id ?? ''),
        ]);
        setSubmitCallback(() => () => {
          addResourceOperation({
            name: getResourceName(selectedResources[1]),
            presetParameterValues: {
              'function.id': selectedResources[1].id,
            },
          });
        });
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_MANUAL_WORKFLOW_ACTION:
        setTitleText(manualWorkflowTitleText);
        setResourceTypes(['manualWorkflow', 'trigger']);
        setGetResourcesCallbacks(() => [
          () => SearchService().getRequestWorkflows(),
          (manualWorkflow?: any) => SearchService().getWorkflowTriggers(manualWorkflow.id ?? ''),
        ]);
        setSubmitCallback(() => () => {
          addResourceOperation({
            name: getResourceName(selectedResources[0]),
            presetParameterValues: {
              'host.triggerName': getResourceName(selectedResources[1]),
              'host.workflow.id': selectedResources[0].id,
            },
          });
        });
        break;

      case Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_BATCH_WORKFLOW_ACTION:
        setTitleText(batchWorkflowTitleText);
        setResourceTypes(['batchWorkflow', 'trigger']);
        setGetResourcesCallbacks(() => [
          () => SearchService().getBatchWorkflows(),
          (batchWorkflow?: any) => SearchService().getWorkflowTriggers(batchWorkflow.id ?? ''),
        ]);
        setSubmitCallback(() => () => {
          addResourceOperation({
            name: getResourceName(selectedResources[0]),
            presetParameterValues: {
              'host.triggerName': getResourceName(selectedResources[1]),
              'host.workflow.id': selectedResources[0].id,
            },
          });
        });
        break;

      default:
        throw new Error(`Unexpected API category type '${operation.id}'`);
    }
  }, [
    addResourceOperation,
    apimTitleText,
    appServiceTitleText,
    batchWorkflowTitleText,
    functionAppTitleText,
    getOptionsFromPaths,
    manualWorkflowTitleText,
    operation.id,
    selectedResources,
  ]);

  const headers = [
    intl.formatMessage({ defaultMessage: 'Name', description: 'Header for resource name' }),
    intl.formatMessage({ defaultMessage: 'Resource Group', description: 'Header for resource group name' }),
    intl.formatMessage({ defaultMessage: 'Location', description: 'Header for resource location' }),
  ];

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading resources...',
    description: 'Text for loading Azure Resources',
  });

  const getResourceName = (resource: any) => resource?.properties?.name ?? resource?.name ?? resource?.id;

  const getColumns = (resource: any) => [
    getResourceName(resource),
    resource?.properties?.resourceGroup ?? resource?.resourceGroup ?? getResourceGroupFromWorkflowId(resource?.id),
    resource?.properties?.location ?? resource?.location,
  ];

  const [apimApiSwaggerResources, setApimApiSwaggerResources] = useState<any>(null);
  useEffect(() => {
    const subResource = selectedResources?.[1];
    if (!subResource) return;
    if (
      operation.id !== Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_ACTION &&
      operation.id !== Constants.AZURE_RESOURCE_ACTION_TYPES.SELECT_APIMANAGEMENT_TRIGGER
    )
      return;
    console.log('getting api swagger for:', subResource);
    ApiManagementService()
      .fetchApiMSwagger(subResource?.id)
      .then((s) => setApimApiSwaggerResources(s));
  }, [selectedResources, operation?.id]);

  // Make sure we have valid resources for all of the required resource types
  const readyToSubmit = useMemo(() => selectedResources.length === resourceTypes.length, [selectedResources, resourceTypes]);

  return (
    <div className={'msla-azure-resource-selection'}>
      <div className="msla-flex-row" style={{ justifyContent: 'flex-start' }}>
        <img
          src={operation.properties.api.iconUri}
          alt={operation.properties.api.name}
          style={{ width: '32px', height: '32px', borderRadius: '2px', overflow: 'hidden' }}
        />
        <Text style={{ font: '13px/20px @semibold-font-family' }}>{operation.properties.summary}</Text>
      </div>
      <AzureResourcePicker
        titleText={titleText}
        loadingText={loadingText}
        headers={headers}
        getColumns={getColumns}
        resourceType={resourceTypes[0]}
        getResourcesCallback={getResourcesCallbacks?.[0]}
        selectedResourceId={selectedResources?.[0]?.id}
        onResourceSelect={(resource: any) => setResourceAtDepth(resource, 0)}
        subResourceType={resourceTypes[1]}
        getSubResourceName={(subResource: any) => getResourceName(subResource)}
        fetchSubResourcesCallback={getResourcesCallbacks?.[1]}
        onSubResourceSelect={(subResource: any) => setResourceAtDepth(subResource, 1)}
      />
      {apimApiSwaggerResources ? (
        <ChoiceGroup
          options={Object.entries(apimApiSwaggerResources?.paths ?? {}).map(([id, path]: [id: string, path: any]) => ({
            key: id,
            text: (Object.values(path)[0] as any)?.summary ?? id,
            data: path,
          }))}
          onChange={(_e: any, option: any) => {
            console.log('selected path:', option.data);
            setResourceAtDepth?.(option.data, 2);
          }}
          selectedKey={Object.keys(selectedResources?.[2] ?? {})?.[0]}
        />
      ) : null}
      <PrimaryButton
        disabled={!readyToSubmit}
        onClick={() => {
          if (!readyToSubmit) return;
          submitCallback();
        }}
      >
        {intl.formatMessage({ defaultMessage: 'Add Action', description: 'Add action button text' })}
      </PrimaryButton>
    </div>
  );
};
