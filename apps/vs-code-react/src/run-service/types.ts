import type { InitializePayload, Status } from '../state/vscodeSlice';
import type { ExtensionCommand } from '@microsoft/vscode-extension';

export interface IApiService {
  getWorkflows(subscriptionId: string, iseId?: string, location?: string): Promise<WorkflowsList[]>;
  getSubscriptions(): Promise<any>;
  getIse(selectedSubscription: string): Promise<any>;
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

export enum ProjectName {
  export = 'export',
  overview = 'overview',
  review = 'review',
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

export enum QueryKeys {
  workflowsData = 'workflowsData',
  subscriptionData = 'subscriptionData',
  runsData = 'runsData',
  iseData = 'iseData',
  regionData = 'regionData',
  validation = 'validation',
  summary = 'summary',
  resourceGroupsData = 'resourceGroupsData',
}

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

export enum ResourceType {
  workflows = 'workflows',
  subscriptions = 'subscriptions',
  ise = 'ise',
  resourcegroups = 'resourcegroups',
}

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

export enum RouteName {
  export = 'export',
  instance_selection = 'instance-selection',
  workflows_selection = 'workflows-selection',
  validation = 'validation',
  overview = 'overview',
  summary = 'summary',
  status = 'status',
  review = 'review',
}

export enum ValidationStatus {
  succeeded = 'Succeeded',
  succeeded_with_warnings = 'SucceededWithWarning',
  failed = 'Failed',
}

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

export enum WorkflowPart {
  workflowOperations = 'workflowOperations',
  connections = 'connections',
  parameters = 'parameters',
  workflow = 'details',
}

export enum StyledWorkflowPart {
  workflowOperations = 'Operations',
  connections = 'Connections',
  parameters = 'Parameters',
  workflow = 'Workflow',
}

export interface InjectValuesMessage {
  command: ExtensionCommand.initialize_frame;
  data: InitializePayload;
}

export interface UpdateAccessTokenMessage {
  command: ExtensionCommand.update_access_token;
  data: {
    accessToken?: string;
  };
}

export interface UpdateExportPathMessage {
  command: ExtensionCommand.update_export_path;
  data: {
    targetDirectory: ITargetDirectory;
  };
}

export interface AddStatusMessage {
  command: ExtensionCommand.add_status;
  data: {
    status: string;
  };
}

export interface SetFinalStatusMessage {
  command: ExtensionCommand.set_final_status;
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

export enum DetailCategory {
  requiredStep = 'RequiredStep',
  information = 'Information',
}

export enum StyledDetailCategory {
  requiredStep = 'Required Step',
  information = 'Information',
}

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

export enum AdvancedOptionsTypes {
  off = 'Off',
  cloneConnections = 'cloneConnections',
  generateInfrastructureTemplates = 'generateInfrastructureTemplates',
}
