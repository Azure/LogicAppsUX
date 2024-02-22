import type { InitializePayload, Status } from '../state/WorkflowSlice';
import type { ApiHubServiceDetails } from '@microsoft/logic-apps-shared';
import type { SchemaType } from '@microsoft/logic-apps-shared';
import type { MapDefinitionData, ExtensionCommand, ConnectionsData, IDesignerPanelMetadata } from '@microsoft/vscode-extension';

export interface IApiService {
  getWorkflows(subscriptionId: string, iseId?: string, location?: string): Promise<WorkflowsList[]>;
  getSubscriptions(): Promise<Array<ISubscription>>;
  getIse(selectedSubscription: string): Promise<Array<IIse>>;
  getRegions(subscriptionId: string): Promise<IRegion[]>;
  validateWorkflows(
    selectedWorkflows: Array<WorkflowsList>,
    selectedSubscription: string,
    selectedLocation: string,
    selectedAdvanceOptions: AdvancedOptionsTypes[]
  ): Promise<any>;
  exportWorkflows(
    selectedWorkflows: Array<WorkflowsList>,
    selectedSubscription: string,
    selectedLocation: string,
    selectedAdvanceOptions: AdvancedOptionsTypes[]
  ): Promise<any>;
}

export interface RunDisplayItem {
  duration: string;
  id: string;
  identifier: string;
  startTime: string;
  status: string;
}

export interface Workflow {
  id: string;
  name: string;
  location: string;
  subscriptionId: string;
  resourceGroup: string;
}

export interface GraphApiOptions {
  selectedSubscription?: string;
  selectedIse?: string;
  location?: string;
  skipToken?: string;
}

export interface WorkflowsList {
  key: string;
  name: string;
  resourceGroup: string;
}

export interface SelectedWorkflowsList extends WorkflowsList {
  selected: boolean;
  rendered: boolean;
}

export interface OutletContext {
  accessToken: string;
  baseUrl: string;
  selectedWorkflows: Array<WorkflowsList>;
}

export const QueryKeys = {
  workflowsData: 'workflowsData',
  subscriptionData: 'subscriptionData',
  runsData: 'runsData',
  iseData: 'iseData',
  regionData: 'regionData',
  validation: 'validation',
  summary: 'summary',
  resourceGroupsData: 'resourceGroupsData',
} as const;

export type QueryKeysType = (typeof QueryKeys)[keyof typeof QueryKeys];

export interface ISubscription {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
}

export interface ManagedConnections {
  isManaged: boolean;
  resourceGroup: string | undefined;
  resourceGroupLocation: string | undefined;
}

export type ExportData = {
  selectedWorkflows: Array<WorkflowsList>;
  selectedSubscription: string;
  selectedIse?: string;
  location: string;
  validationState: string;
  targetDirectory: ITargetDirectory;
  packageUrl: string;
  managedConnections: ManagedConnections;
  selectedAdvanceOptions: Array<AdvancedOptionsTypes>;
};

export const ResourceType = {
  workflows: 'workflows',
  subscriptions: 'subscriptions',
  ise: 'ise',
  resourcegroups: 'resourcegroups',
};
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export interface IIse {
  id: string;
  subscriptionId: string;
  iseName: string;
  location: string;
  resourceGroup: string;
}

export interface IRegion {
  name: string;
  displayName: string;
  count: number;
}

export interface IDropDownOption {
  key: string;
  text: string;
}

export interface IResourceGroup {
  name: string;
  location: string;
  id?: string;
  subscriptionId?: string;
  resourceGroup?: string;
  text?: string;
}

export const RouteName = {
  export: 'export',
  instance_selection: 'instance-selection',
  workflows_selection: 'workflows-selection',
  validation: 'validation',
  overview: 'overview',
  summary: 'summary',
  status: 'status',
  review: 'review',
  designer: 'designer',
  dataMapper: 'dataMapper',
};

export type RouteNameType = (typeof RouteName)[keyof typeof RouteName];
export const ValidationStatus = {
  succeeded: 'Succeeded',
  succeeded_with_warnings: 'SucceededWithWarning',
  failed: 'Failed',
};
export type ValidationStatusType = (typeof ValidationStatus)[keyof typeof ValidationStatus];

export interface IWorkflowValidation {
  validationState: string;
  details: any;
  workflowOperations: Record<string, any>;
  connections: Record<string, any>;
  parameters: Record<string, any>;
}

export interface IValidationData {
  validationState: string;
  workflows: Record<string, IWorkflowValidation>;
}

export interface IGroupedGroup {
  children: Array<IGroupedGroup>;
  isCollapsed: boolean;
  key: string;
  level: number;
  count: number;
  name: string;
  startIndex: number;
  status: string | undefined;
}

export interface IGroupedItem {
  action: string;
  status: string;
  message: string;
}

export const WorkflowPart = {
  workflowOperations: 'workflowOperations',
  connections: 'connections',
  parameters: 'parameters',
  workflow: 'details',
};
export type WorkflowPart = (typeof WorkflowPart)[keyof typeof WorkflowPart];
export const StyledWorkflowPart = {
  workflowOperations: 'Operations',
  connections: 'Connections',
  parameters: 'Parameters',
  workflow: 'Workflow',
};
export type StyledWorkflowPart = (typeof StyledWorkflowPart)[keyof typeof StyledWorkflowPart];

type FetchSchemaData = { fileName: string; type: SchemaType };
export type XsltData = { filename: string; fileContents: string };

// Data Mapper Message Interfaces
export interface FetchSchemaMessage {
  command: typeof ExtensionCommand.fetchSchema;
  data: FetchSchemaData;
}

export interface LoadDataMapMessage {
  command: typeof ExtensionCommand.loadDataMap;
  data: MapDefinitionData;
}

export interface ShowAvailableSchemasMessage {
  command: typeof ExtensionCommand.showAvailableSchemas;
  data: string[];
}

export interface GetAvailableCustomXsltPathsMessage {
  command: typeof ExtensionCommand.getAvailableCustomXsltPaths;
  data: string[];
}

export interface SetXsltDataMessage {
  command: typeof ExtensionCommand.setXsltData;
  data: XsltData;
}

export interface SetRuntimePortMessage {
  command: typeof ExtensionCommand.setRuntimePort;
  data: string;
}

export interface GetConfigurationSettingMessage {
  command: typeof ExtensionCommand.getConfigurationSetting;
  data: boolean;
}

// Designer Message Interfaces
export interface ReceiveCallbackMessage {
  command: typeof ExtensionCommand.receiveCallback;
  data: any;
}

export interface CompleteFileSystemConnectionMessage {
  command: typeof ExtensionCommand.completeFileSystemConnection;
  data: { connectionName: string; connection: any; error: string };
}

export interface UpdatePanelMetadataMessage {
  command: typeof ExtensionCommand.update_panel_metadata;
  data: {
    panelMetadata: IDesignerPanelMetadata;
    connectionData: ConnectionsData;
    apiHubServiceDetails: ApiHubServiceDetails;
  };
}

// Rest of Message Interfaces
export interface InjectValuesMessage {
  command: typeof ExtensionCommand.initialize_frame;
  data:
    | InitializePayload & {
        project: string;
      };
}

export interface UpdateAccessTokenMessage {
  command: typeof ExtensionCommand.update_access_token;
  data: {
    accessToken?: string;
  };
}

export interface UpdateExportPathMessage {
  command: typeof ExtensionCommand.update_export_path;
  data: {
    targetDirectory: ITargetDirectory;
  };
}

export interface AddStatusMessage {
  command: typeof ExtensionCommand.add_status;
  data: {
    status: string;
  };
}

export interface SetFinalStatusMessage {
  command: typeof ExtensionCommand.set_final_status;
  data: {
    status: Status;
  };
}

export interface IExportDetails {
  exportDetailCategory: string;
  exportDetailCode: string;
  exportDetailMessage: string;
}

export interface IExportDetailsList {
  type: string;
  message: string;
}

export interface ISummaryData {
  properties: {
    packageLink: Record<string, string>;
    details: Array<IExportDetails>;
  };
}

export const DetailCategory = {
  requiredStep: 'RequiredStep',
  information: 'Information',
};
export type DetailCategory = (typeof DetailCategory)[keyof typeof DetailCategory];
export const StyledDetailCategory = {
  requiredStep: 'Required Step',
  information: 'Information',
};
export type StyledDetailCategory = (typeof StyledDetailCategory)[keyof typeof StyledDetailCategory];

export interface ITargetDirectory {
  fsPath: string;
  path: string;
}

export interface INamingRules {
  minLength: number;
  maxLength: number;
  invalidCharsRegExp: RegExp;
}

export interface INamingValidation {
  validationError: string;
  validName: boolean;
}

export const AdvancedOptionsTypes = {
  off: 'Off',
  cloneConnections: 'cloneConnections',
  generateInfrastructureTemplates: 'generateInfrastructureTemplates',
  integrationAccountSource: 'integrationAccountSource',
  exportCustomApiActionsToAPIManagementActions: 'exportCustomApiActionsToAPIManagementActions',
};
export type AdvancedOptionsTypes = (typeof AdvancedOptionsTypes)[keyof typeof AdvancedOptionsTypes];
