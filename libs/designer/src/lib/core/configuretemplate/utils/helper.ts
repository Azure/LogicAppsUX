import type { ConnectionsData, Expression, LogicAppsV2, Template, WorkflowData } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnectionsMappingForNodes } from '../../actions/bjsworkflow/connections';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { OperationDetails } from '../../templates/utils/parametershelper';
import { initializeOperationDetails } from '../../templates/utils/parametershelper';
import { replaceAllStringInWorkflowDefinition } from '../../templates/utils/createhelper';
import { isRootNodeInGraph } from '../../utils/graph';
import type { NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { Token, ValueSegment } from '@microsoft/designer-ui';
import { isExpressionToken, isParameterToken, isTokenValueSegment } from '../../utils/parameters/segment';
import {
  equals,
  getResourceNameFromId,
  isArmResourceId,
  isFunction,
  isParameterExpression,
  locationPlaceholder,
  LogEntryLevel,
  LoggerService,
  subscriptionPlaceholder,
} from '@microsoft/logic-apps-shared';
import JSZip from 'jszip';
import saveAs from 'file-saver';

export const delimiter = '::::::';
export const getTemplateConnectionsFromConnectionsData = (
  connectionsData: ConnectionsData | undefined
): Record<string, Template.Connection> => {
  if (!connectionsData) {
    return {};
  }

  const {
    apiManagementConnections = {},
    functionConnections = {},
    managedApiConnections = {},
    serviceProviderConnections = {},
    agentConnections = {},
  } = connectionsData;

  const mergeConnections = (
    source: Record<string, any>,
    getConnection: (key: string) => Template.Connection
  ): Record<string, Template.Connection> => Object.fromEntries(Object.keys(source).map((key) => [key, getConnection(key)]));

  return {
    ...mergeConnections(managedApiConnections, (key) => ({
      connectorId: managedApiConnections[key].api.id,
      kind: 'shared',
    })),
    ...mergeConnections(apiManagementConnections, () => ({
      connectorId: '/connectionProviders/apiManagementOperation',
      kind: 'inapp',
    })),
    ...mergeConnections(functionConnections, () => ({
      connectorId: '/connectionProviders/azureFunctionOperation',
      kind: 'inapp',
    })),
    ...mergeConnections(serviceProviderConnections, (key) => ({
      connectorId: serviceProviderConnections[key].serviceProvider.id,
      kind: 'inapp',
    })),
    ...mergeConnections(agentConnections, () => ({
      connectorId: 'connectionProviders/agent',
      kind: 'inapp',
    })),
  };
};

export const getLogicAppId = (subscriptionId: string, resourceGroup: string, logicAppName: string): string => {
  return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Logic/workflows/${logicAppName}`.toLowerCase();
};

export const getConnectionMappingInDefinition = async (
  definition: LogicAppsV2.WorkflowDefinition,
  workflowId: string
): Promise<Record<string, string>> => {
  try {
    const workflow = Deserialize(definition, /* runInstance */ null);
    const mapping = await getConnectionsMappingForNodes(workflow);
    return Object.keys(mapping).reduce((result: Record<string, string>, operationId: string) => {
      result[`${workflowId}${delimiter}${operationId}`] = mapping[operationId];
      return result;
    }, {});
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getConnnectionMappingInDefinition',
      error,
      message: `Error while getting connection mapping in definition: ${error}`,
    });
    return {};
  }
};

export const getOperationDataInDefinitions = async (
  workflows: Record<string, WorkflowTemplateData>,
  connections: Record<string, Template.Connection>
): Promise<NodeOperationInputsData[]> => {
  const promises: Promise<OperationDetails | undefined>[] = [];
  const references = getReferencesFromConnections(connections);
  for (const { id, workflowDefinition, kind } of Object.values(workflows)) {
    const deserializedWorkflow = Deserialize(workflowDefinition, /* runInstance */ null, true, kind);
    const { actionData: operations, nodesMetadata } = deserializedWorkflow;

    for (const operationId of Object.keys(operations)) {
      const isTrigger = isRootNodeInGraph(operationId, 'root', nodesMetadata);
      const operation = operations[operationId];
      const nodeId = `${id.toLowerCase()}${delimiter}${operationId}`;
      promises.push(initializeOperationDetails(nodeId, operation, /* connectorId */ undefined, isTrigger, [], references));
    }
  }

  return getAllNodeData(promises);
};

export const getAllNodeData = async (
  operationDetailsPromises: Promise<OperationDetails | undefined>[]
): Promise<NodeOperationInputsData[]> => {
  const allNodeData = (await Promise.all(operationDetailsPromises)).filter((data) => !!data) as OperationDetails[];
  return allNodeData.map(({ id, nodeInputs, nodeOperationInfo, inputDependencies }: OperationDetails) => ({
    id,
    nodeInputs,
    nodeDependencies: { inputs: inputDependencies, outputs: {} },
    operationInfo: nodeOperationInfo,
  }));
};

const getReferencesFromConnections = (connections: Record<string, Template.Connection>): ConnectionReferences => {
  return Object.keys(connections).reduce((result: ConnectionReferences, connectionKey) => {
    result[connectionKey] = {
      api: { id: connections[connectionKey].connectorId },
      connection: { id: '' },
    };
    return result;
  }, {});
};

export const getParametersForWorkflow = (
  allParameters: Template.ParameterDefinition[],
  workflowId: string
): Template.ParameterDefinition[] => {
  return allParameters.filter((parameter) => parameter.associatedWorkflows?.includes(workflowId));
};

export const getParameterReferencesFromValue = (segments: ValueSegment[]): string[] => {
  const tokenSegments = segments.filter(isTokenValueSegment);
  const result: string[] = [];

  for (const segment of tokenSegments) {
    const token = segment.token as Token;
    if (isParameterToken(token)) {
      const name = token.name as string;
      if (!result.includes(name)) {
        result.push(name);
      }
    } else if (isExpressionToken(token)) {
      findParameterExpressions(token.expression as Expression, result);
    }
  }

  return result;
};

const findParameterExpressions = (expression: Expression, result: string[]): void => {
  if (!isFunction(expression)) {
    return;
  }

  if (isParameterExpression(expression.name)) {
    const name = (expression.arguments[0] as any).value as string;
    if (!result.includes(name)) {
      result.push(name);
    }
  }

  for (const arg of expression.arguments) {
    findParameterExpressions(arg, result);
  }
};

export const getConnectorKind = (connectorId: string): Template.FeaturedConnectorType => {
  return isArmResourceId(connectorId) ? 'shared' : connectorId.startsWith('/serviceproviders') ? 'inapp' : 'builtin';
};

export const getSupportedSkus = (connections: Record<string, Template.Connection>): Template.SkuType[] => {
  const supportedSkus: Template.SkuType[] = ['standard'];

  if (!Object.values(connections).some((connection) => connection.kind === 'inapp')) {
    supportedSkus.push('consumption');
  }

  return supportedSkus;
};

export const getDefinitionFromWorkflowManifest = (manifest: Template.WorkflowManifest): LogicAppsV2.WorkflowDefinition => {
  return (manifest?.artifacts?.find((artifact) => equals(artifact.type, 'workflow')) as any)?.file as LogicAppsV2.WorkflowDefinition;
};

export const getSaveMenuButtons = (
  resourceStrings: Record<string, string>,
  currentStatus: Template.TemplateEnvironment,
  onSave: (status: Template.TemplateEnvironment) => void
): { text: string; onClick: () => void }[] => {
  const isPublishedState = equals(currentStatus, 'Testing') || equals(currentStatus, 'Production');
  const saveDevelopmentButton = {
    text: isPublishedState ? resourceStrings.SaveUnpublishButton : resourceStrings.SaveButtonText,
    onClick: () => onSave('Development'),
  };
  const baseItems = isPublishedState ? [] : [saveDevelopmentButton];
  baseItems.push(
    ...[
      {
        text: resourceStrings.SavePublishForTestingButton,
        onClick: () => onSave('Testing'),
      },
      {
        text: resourceStrings.SavePublishForProdButton,
        onClick: () => onSave('Production'),
      },
    ]
  );
  if (isPublishedState) {
    baseItems.push(saveDevelopmentButton);
  }
  return baseItems;
};

export const getManifestAndDefinitionFromWorkflowData = (
  workflow: Partial<WorkflowTemplateData>,
  connections: Record<string, Template.Connection>,
  parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>
): WorkflowData => {
  const { id, workflowDefinition, manifest, connectionKeys } = workflow;
  const connectionsInWorkflow = (connectionKeys ?? []).reduce((result: Record<string, Template.Connection>, key) => {
    if (connections[key]) {
      result[key] = connections[key];
    }
    return result;
  }, {});
  const parametersInWorkflow = Object.keys(parameterDefinitions).reduce((result: Template.Parameter[], key) => {
    const { associatedWorkflows } = parameterDefinitions[key];
    if (associatedWorkflows?.includes(id ?? '')) {
      const parameter = { ...parameterDefinitions[key] };
      delete parameter.associatedWorkflows;
      delete parameter.associatedOperationParameter;
      result.push(parameter as Template.Parameter);
    }
    return result;
  }, []);

  return {
    manifest: {
      ...manifest,
      parameters: parametersInWorkflow,
      connections: connectionsInWorkflow,
    } as Template.WorkflowManifest,
    workflow: workflowDefinition,
  };
};

export const getZippedTemplateForDownload = async (
  templateManifest: Template.TemplateManifest,
  workflowDatas: Record<string, { manifest: Template.WorkflowManifest; workflowDefinition: any }>,
  connections: Record<string, Template.Connection>,
  parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>
): Promise<void> => {
  const templateName = getResourceNameFromId(templateManifest.id);

  const theTemplateManifest = {
    ...templateManifest,
    id: templateName,
    workflows: {},
  } as Template.TemplateManifest;

  const workflowFolderContents: any[] = [];
  const workflowDatasCopy = [...Object.entries(workflowDatas)];
  const promises: Promise<any>[] = [];

  for (const [workflowId, workflowData] of workflowDatasCopy) {
    theTemplateManifest.workflows[workflowId] = { name: workflowId };
    promises.push(getWorkflowFolderContent(workflowId, workflowData, connections, parameterDefinitions));
  }

  await Promise.all(promises).then((results) => workflowFolderContents.push(...results));
  const folderStructure: Template.FolderStructure = {
    type: 'folder',
    name: templateName,
    contents: [
      {
        type: 'file',
        name: 'manifest.json',
        data: JSON.stringify(theTemplateManifest, null, 2),
      },
      ...workflowFolderContents,
    ],
  };

  const zip = new JSZip();
  zipFolder(zip, folderStructure);

  zip.generateAsync({ type: 'blob' }).then((content) => {
    saveAs(content, 'LogicAppsTemplate.zip');
  });
};

const getWorkflowFolderContent = async (
  name: string,
  workflowData: Partial<WorkflowTemplateData>,
  connections: Record<string, Template.Connection>,
  parameterDefinitions: Record<string, Partial<Template.ParameterDefinition>>
) => {
  const { manifest } = getManifestAndDefinitionFromWorkflowData(workflowData, connections, parameterDefinitions);

  // Clean up workflowManifest
  const workflowManifest = manifest as Template.WorkflowManifest;
  delete workflowManifest.metadata;
  workflowManifest.artifacts = [
    {
      type: 'workflow',
      file: 'workflow.json',
    },
  ];

  const folderContent: Template.FolderStructure = {
    type: 'folder',
    name,
    contents: [
      {
        type: 'file',
        name: 'manifest.json',
        data: JSON.stringify(workflowManifest, null, 2),
      },
      {
        type: 'file',
        name: 'workflow.json',
        data: JSON.stringify(workflowData.workflowDefinition, null, 2),
      },
    ],
  };

  const lightImage = await getImageFileContent(workflowManifest.images.light);
  const darkImage = await getImageFileContent(workflowManifest.images.dark);

  if (lightImage) {
    folderContent.contents.push(lightImage);
  }
  if (darkImage) {
    folderContent.contents.push(darkImage);
  }

  return folderContent;
};

const getImageFileContent = async (imageLink: string): Promise<Template.FileStructure | undefined> => {
  if (imageLink) {
    const lightImage = await fetch(imageLink, { headers: { 'Access-Control-Allow-Origin': '*' } });
    const content = await lightImage.blob();
    return {
      type: 'file',
      name: imageLink.split('/').slice(-1)[0] as string,
      data: content,
    };
  }

  return undefined;
};

const zipFolder = (zip: JSZip, folder: Template.FolderStructure) => {
  const folderZip = zip.folder(folder.name);

  if (folderZip) {
    for (const content of folder.contents) {
      if (content.type === 'file') {
        folderZip.file(content.name, content.data);
      } else {
        zipFolder(folderZip, content as Template.FolderStructure);
      }
    }
  }
};

export const getDateTimeString = (timeString: string, defaultValue = ''): string => {
  if (!timeString) {
    return defaultValue;
  }
  const date = new Date(timeString);
  return date.toLocaleString();
};

export const workflowIdentifier = '#workflowname#';
interface ConnectionsAndWorkflowsData {
  connections: Record<string, Template.Connection>;
  mapping: Record<string, string>;
  workflowsData: Record<string, Partial<WorkflowTemplateData>>;
}

interface ParametersAndWorkflowsData {
  parameters: Record<string, Template.ParameterDefinition>;
  workflowsData: Record<string, Partial<WorkflowTemplateData>>;
}

export const suffixConnectionsWithIdentifier = (
  connections: Record<string, Template.Connection>,
  workflowsData: Record<string, Partial<WorkflowTemplateData>>,
  mapping: Record<string, string>
): ConnectionsAndWorkflowsData => {
  const result: ConnectionsAndWorkflowsData = { connections: {}, workflowsData: { ...workflowsData }, mapping: {} };

  for (const key of Object.keys(workflowsData)) {
    const data = workflowsData[key];
    let updatedDefinition = JSON.stringify(data.workflowDefinition);

    for (const connectionKey of Object.keys(connections)) {
      if (!connectionKey.endsWith(workflowIdentifier)) {
        const updatedConnectionKey = `${connectionKey}_${workflowIdentifier}`;

        if (!result.connections[updatedConnectionKey]) {
          result.connections[updatedConnectionKey] = connections[connectionKey];
        }

        updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, `"${connectionKey}"`, `"${updatedConnectionKey}"`);
        updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, `'${connectionKey}'`, `'${updatedConnectionKey}'`);
      }
    }

    result.workflowsData[key] = {
      ...data,
      workflowDefinition: JSON.parse(updatedDefinition),
      connectionKeys: (data.connectionKeys ?? []).map((connectionKey) =>
        connectionKey.endsWith(workflowIdentifier) ? connectionKey : `${connectionKey}_${workflowIdentifier}`
      ),
    };
  }

  result.mapping = Object.keys(mapping).reduce((result: Record<string, string>, key) => {
    const referenceKey = mapping[key];
    result[key] = referenceKey.endsWith(workflowIdentifier) ? referenceKey : `${referenceKey}_${workflowIdentifier}`;
    return result;
  }, {});

  return result;
};

export const suffixParametersWithIdentifier = (
  parameters: Record<string, Partial<Template.ParameterDefinition>>,
  workflowsData: Record<string, Partial<WorkflowTemplateData>>
): ParametersAndWorkflowsData => {
  const result: ParametersAndWorkflowsData = { parameters: {}, workflowsData: { ...workflowsData } };
  for (const key of Object.keys(workflowsData)) {
    const data = workflowsData[key];
    let updatedDefinition = JSON.stringify(data.workflowDefinition);

    for (const parameter of Object.values(parameters)) {
      const parameterName = parameter.name as string;

      if (!parameterName.endsWith(workflowIdentifier)) {
        const updatedParameterName = `${parameterName}_${workflowIdentifier}`;

        if (!result.parameters[updatedParameterName]) {
          result.parameters[updatedParameterName] = {
            ...parameter,
            name: updatedParameterName,
          } as Template.ParameterDefinition;
        }

        updatedDefinition = replaceAllStringInWorkflowDefinition(updatedDefinition, parameterName, updatedParameterName);
      }
    }

    result.workflowsData[key] = {
      ...data,
      workflowDefinition: JSON.parse(updatedDefinition),
    };
  }

  return result;
};

export const sanitizeConnectorIds = (connections: Record<string, Template.Connection>): Record<string, Template.Connection> => {
  const sanitizedConnections: Record<string, Template.Connection> = {};
  for (const key of Object.keys(connections)) {
    const connection = connections[key];
    if (equals(connection.kind, 'shared')) {
      connection.connectorId = sanitizeConnectorId(connection.connectorId);
    }

    sanitizedConnections[key] = connection;
  }

  return sanitizedConnections;
};

export const sanitizeConnectorId = (id: string): string => {
  if (!isArmResourceId(id)) {
    return id;
  }

  const segments = id.split('/');
  segments[2] = subscriptionPlaceholder;
  segments[6] = locationPlaceholder;

  return segments.join('/');
};

export const formatNameWithIdentifierToDisplay = (name: string): string => {
  return name.replace(`_${workflowIdentifier}`, '');
};
