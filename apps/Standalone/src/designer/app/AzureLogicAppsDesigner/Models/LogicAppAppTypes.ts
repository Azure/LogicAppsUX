export interface FetchLogicAppsReturnType {
  totalRecords?: number;
  count?: number;
  data?: Data[];
  facets?: any[];
  resultTruncated?: string;
}

export interface Data {
  id: string;
  name: string;
  location: string;
  resourceGroup: string;
  subscriptionId: string;
  properties: AppProperties;
}

export interface Column {
  name?: string;
  type?: ColumnType;
}

export type ColumnType = 'string' | 'object';

export interface AppProperties {
  name?: string;
  publicNetworkAccess?: PublicNetworkAccess | null;
  privateEndpointConnections?: PrivateEndpointConnection[];
  enabled?: boolean;
  keyVaultReferenceIdentity?: KeyVaultReferenceIdentity;
  hostingEnvironmentProfile?: HostingEnvironmentProfile | null;
  vnetRouteAllEnabled?: boolean | null;
  state?: StateEnum;
  hostingEnvironment?: null | string;
  domainVerificationIdentifiers?: null;
  useContainerLocalhostBindings?: null;
  hostingEnvironmentID?: null | string;
  functionExecutionUnitsCache?: null;
  possibleOutboundIPAddresses?: null | string;
  storageRecoveryDefaultState?: StateEnum | null;
  customDomainVerificationID?: CustomDomainVerificationID | null;
  possibleInboundIPAddresses?: string;
  containerAllocationSubnet?: null;
  clientCERTExclusionPaths?: null;
  runtimeAvailabilityState?: State;
  contentAvailabilityState?: State;
  resourceGroup?: string;
  vnetContentShareEnabled?: boolean | null;
  trafficManagerHostNames?: null;
  storageAccountRequired?: boolean;
  virtualNetworkSubnetID?: null | string;
  privateLinkIdentifiers?: null | string;
  clientAffinityEnabled?: boolean | null;
  eligibleLogCategories?: EligibleLogCategories | null;
  inProgressOperationID?: null;
  dailyMemoryTimeQuota?: number | null;
  vnetImagePullEnabled?: boolean | null;
  defaultHostNameScope?: DefaultHostNameScope;
  serverFarmID?: string;
  outboundIPAddresses?: null | string;
  lastModifiedTimeUTC?: Date;
  scmSiteAlsoStopped?: boolean | null;
  repositorySiteName?: string;
  maxNumberOfWorkers?: null;
  targetBuildVersion?: null;
  siteDisabledReason?: number | null;
  clientCERTEnabled?: boolean | null;
  hostNameSSLStates?: HostNameSSLState[];
  hostNamesDisabled?: boolean | null;
  availabilityState?: State;
  geoDistributions?: null;
  inboundIPAddress?: string;
  enabledHostNames?: string[];
  dnsConfiguration?: DNSConfiguration;
  sslCertificates?: null;
  computeMode?: null;
  defaultHostName?: string;
  migrationState?: MigrationState | null;
  redundancyMode?: RedundancyMode | null;
  clientCERTMode?: ClientCERTMode | null;
  slotSwapStatus?: null;
  siteProperties?: SiteProperties;
  targetSwapSlot?: null;
  webSpace?: string;
  containerSize?: number | null;
  suspendedTill?: null;
  buildVersion?: null;
  sku?: Sku;
  deploymentID?: string;
  hostNames?: string[];
  adminEnabled?: boolean;
  ftpsHostName?: null | string;
  reserved?: boolean | null;
  siteMode?: null;
  cloningInfo?: null;
  ftpUsername?: null | string;
  selfLink?: null | string;
  siteConfig?: SiteConfig;
  serverFarm?: null;
  usageState?: State;
  isXenon?: boolean | null;
  httpsOnly?: boolean;
  homeStamp?: string;
  hyperV?: boolean | null;
  slotName?: SlotName | null;
  tags?: Tags | null;
  kind?: Kind;
  owner?: Owner | null;
  cers?: null;
  csrs?: any[] | null;
  principalID?: string;
  tenantID?: string;
  type?: KeyVaultReferenceIdentity;
  hiddenLinkAppInsightsResourceID?: string;
  hiddenLinkAppInsightsInstrumentationKey?: string;
  createdBy?: string;
  createdTime?: Date;
  keep?: string;
  kep?: string;
  userAssignedIdentities?: { [key: string]: UserAssignedIdentity };
  exportedGUID?: string;
  environment?: string;
  project?: string;
}

export type State = 'Normal';

export type ClientCERTMode = 'Required';

export type CustomDomainVerificationID =
  | '411512511389A8EC93B4D1996F3453C72CF254FA06C5837AE75A7F027A8A57F0'
  | '0DAD11FBCBA288E1DC125F4C4CDF6F75B49D06F30FED75400B6B3DDBAD7D9E95'
  | '2C02E91B4B3462C071201741BA0D262B4BF034B52FC1F9AEAD428892E7A3566B'
  | '37DC377A472C75F12F2154EC26BE0B1B54AF0E796F173A51E5A88F8F59A743FE'
  | 'AF4FC496EB7BDF6393DD3B62691FD26A8DC1ABC2F00F27847BC4BD484E02DEA9'
  | '0E310AD3AF3450D8BA0CDF8E62E5635423D1A1BAEEC9C81CF4A21A841994F050'
  | '6B96C11121076B0B763923CBDC2627958B35114DBDB71D1B0D1DFE9CF99849C7';

export type DefaultHostNameScope = 'Global';

export interface DNSConfiguration {
  dnsLegacySortOrder?: boolean;
}

export type EligibleLogCategories = 'WorkflowRuntime,FunctionAppLogs';

export interface HostNameSSLState {
  name?: string;
  toUpdateIPBasedSSL?: null;
  ipBasedSSLResult?: null;
  ipBasedSSLState?: IPBasedSSLState;
  thumbprint?: null;
  virtualIP?: null;
  hostType?: HostType;
  sslState?: PublicNetworkAccess;
  toUpdate?: null;
}

export type HostType = 'Standard' | 'Repository';

export type IPBasedSSLState = 'NotConfigured';

export type PublicNetworkAccess = 'Disabled' | 'Enabled';

export interface HostingEnvironmentProfile {
  name?: string;
  type?: HostingEnvironmentProfileType;
  id?: string;
}

export type HostingEnvironmentProfileType = 'Microsoft.Web/hostingEnvironments';

export type KeyVaultReferenceIdentity = 'SystemAssigned' | 'customLocation' | 'SystemAssigned, UserAssigned' | 'UserAssigned';

export type Kind =
  | 'functionapp,workflowapp'
  | 'functionapp,linux,container,workflowapp,kubernetes'
  | 'functionapp,linux,workflowapp,kubernetes'
  | 'workflowapp'
  | 'functionapp,linux,container,workflowapp'
  | 'functionapp,linux,workflowapp';

export interface MigrationState {
  completedTimestampUTC?: Date;
  destinationStampName?: string;
  startTimestampUTC?: Date;
  sourceStampName?: string;
}

export type Owner = '1003BFFD801C3712';

export interface PrivateEndpointConnection {
  properties?: Properties;
  name?: string;
  type?: string;
  id?: string;
  location?: string;
}

export interface Properties {
  provisioningState?: string;
  privateLinkServiceConnectionState?: PrivateLinkServiceConnectionState;
  ipAddresses?: string[];
  privateEndpoint?: PrivateEndpoint;
  groupIDS?: null;
}

export interface PrivateEndpoint {
  id?: string;
}

export interface PrivateLinkServiceConnectionState {
  description?: string;
  status?: string;
  actionsRequired?: RedundancyMode;
}

export type RedundancyMode = 'None';

export interface SiteConfig {
  publicNetworkAccess?: PublicNetworkAccess | null;
  keyVaultReferenceIdentity?: null;
  vnetRouteAllEnabled?: boolean | null;
  functionsRuntimeScaleMonitoringEnabled?: boolean | null;
  scmIPSecurityRestrictionsDefaultAction?: null;
  ipSecurityRestrictionsDefaultAction?: null;
  metadata?: null;
  scmIPSecurityRestrictionsUseMain?: boolean | null;
  customAppPoolIdentityTenantState?: boolean | null;
  customAppPoolIdentityAdminState?: boolean | null;
  minimumElasticInstanceCount?: number | null;
  detailedErrorLoggingEnabled?: boolean | null;
  acrUseManagedIdentityCreds?: boolean | null;
  scmIPSecurityRestrictions?: null;
  xManagedServiceIdentityID?: null;
  azureMonitorLogCategories?: null;
  supportedTLSCipherSuites?: null;
  managedServiceIdentityID?: number | null;
  acrUserManagedIdentityID?: null;
  windowsConfiguredStacks?: any[] | null;
  elasticWebAppScaleLimit?: null;
  ipSecurityRestrictions?: null;
  remoteDebuggingEnabled?: boolean | null;
  preWarmedInstanceCount?: number | null;
  remoteDebuggingVersion?: null | string;
  logsDirectorySizeLimit?: number | null;
  appSettings?: null;
  fileChangeAuditEnabled?: boolean | null;
  functionAppScaleLimit?: number | null;
  vnetPrivatePortsCount?: number | null;
  requestTracingEnabled?: boolean | null;
  use32BitWorkerProcess?: boolean | null;
  runtimeADUserPassword?: null;
  numberOfWorkers?: number | null;
  azureStorageAccounts?: AzureStorageAccounts | null;
  antivirusScanEnabled?: boolean | null;
  javaContainerVersion?: null;
  netFrameworkVersion?: NetFrameworkVersion | null;
  virtualApplications?: VirtualApplication[] | null;
  managedPipelineMode?: ManagedPipelineMode | null;
  apiManagementConfig?: null;
  httpLoggingEnabled?: boolean | null;
  publishingUsername?: null | string;
  winAuthTenantState?: number | null;
  publishingPassword?: null;
  localMySQLEnabled?: boolean | null;
  webSocketsEnabled?: boolean | null;
  connectionStrings?: null;
  powerShellVersion?: null | string;
  winAuthAdminState?: number | null;
  minTLSCipherSuite?: null;
  scmMinTLSVersion?: null | string;
  defaultDocuments?: DefaultDocument[] | null;
  windowsFxVersion?: null;
  autoSwapSlotName?: null;
  autoHealEnabled?: boolean | null;
  healthCheckPath?: null;
  handlerMappings?: null;
  websiteTimeZone?: null;
  http20ProxyFlag?: number | null;
  linuxFxVersion?: LinuxFxVersion | null;
  appCommandLine?: AppCommandLine | null;
  tracingOptions?: null;
  http20Enabled?: boolean | null;
  minTLSVersion?: null | string;
  loadBalancing?: LoadBalancing | null;
  autoHealRules?: null;
  apiDefinition?: null;
  pythonVersion?: null | string;
  javaContainer?: null;
  runtimeADUser?: null;
  routingRules?: any[] | null;
  documentRoot?: DocumentRoot | null;
  storageType?: StorageType | null;
  experiments?: null;
  nodeVersion?: null | string;
  javaVersion?: null;
  phpVersion?: PHPVersion | null;
  machineKey?: null;
  limits?: null;
  ftpsState?: FtpsState | null;
  vnetName?: VnetName | null;
  alwaysOn?: boolean | null;
  sitePort?: null;
  scmType?: RedundancyMode | null;
  cors?: Cors | null;
  push?: null;
  siteAuthSettings?: { [key: string]: boolean | null };
  siteAuthEnabled?: boolean;
}

export type AppCommandLine = '' | '.';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type AzureStorageAccounts = NonNullable<unknown>;

export interface Cors {
  allowedOrigins?: string[] | null;
  supportCredentials?: boolean;
}

export type DefaultDocument =
  | 'Default.htm'
  | 'Default.html'
  | 'Default.asp'
  | 'index.htm'
  | 'index.html'
  | 'iisstart.htm'
  | 'default.aspx'
  | 'index.php';

export type DocumentRoot = 'site\\wwwroot';

export type FtpsState = 'FtpsOnly' | 'AllAllowed';

export type LinuxFxVersion =
  | ''
  | 'DOCKER|mcr.microsoft.com/azure-functions/dotnet:3.0-appservice'
  | 'node|12'
  | 'DOCKER|{docker-container-image-name}'
  | 'DOCKER|rely22/workflowcontainer'
  | 'DOCKER| rely22/limacontainer:v1'
  | 'DOCKER|laveeshbansal/workflowapp:20201110-01'
  | 'DOCKER|rely22/demo-la-container'
  | 'DOCKER|arcacrbly.azurecr.io/reoccurance'
  | 'DOCKER|absaafank8seacr.azurecr.io/sampleemail-01'
  | 'DOCKER|absaafank8seacr.azurecr.io/arjunsimpletest:1022-01'
  | 'DOCKER|arcacrbly.azurecr.io/loopthrough2'
  | 'DOCKER|arcacrbly.azurecr.io/runaftersample'
  | 'DOCKER|arcacrbly.azurecr.io/runaftersample2'
  | 'DOCKER|arcacrbly.azurecr.io/transformsample'
  | 'DOCKER|becacr.azurecr.io/beclogicapp2'
  | 'Node|12'
  | 'NODE|12'
  | 'node|12.0'
  | 'DOCKER|absaafank8seacr.azurecr.io/allhandsdemo-15'
  | 'DOCKER|arcacrbly.azurecr.io/loopthrough:latest'
  | 'DOCKER|blylogicappacr.azurecr.io/demoworkflow:02'
  | 'DOCKER|logicappsacrbly.azurecr.io/demoworkflow:01'
  | 'DOCKER|rohithahacr.azurecr.io/rohithahk8:0301-01'
  | 'DOCKER|rohithahacr.azurecr.io/logicapp:0306v1.0'
  | 'dotnet|3.1';

export type LoadBalancing = 'LeastRequests';

export type ManagedPipelineMode = 'Integrated';

export type NetFrameworkVersion = 'v6.0' | 'v4.0' | 'v4.6';

export type PHPVersion = '' | '5.6';

export type StorageType = 'StorageVolume';

export interface VirtualApplication {
  preloadEnabled?: boolean;
  physicalPath?: DocumentRoot;
  virtualPath?: VirtualPath;
  virtualDirectories?: null;
}

export type VirtualPath = '/';

export type VnetName = '' | 'ce51bdd9-3624-43f2-942e-0d95264b1411_default' | 'a248d042-ec6e-4b87-8534-9abc5ab2302c_default';

export interface SiteProperties {
  properties?: Property[];
  metadata?: null;
  appSettings?: null;
}

export interface Property {
  name?: Name;
  value?: LinuxFxVersion | null;
}

export type Name = 'LinuxFxVersion' | 'WindowsFxVersion';

export type Sku =
  | 'WorkflowStandard'
  | 'ElasticPremium'
  | 'IsolatedV2'
  | 'Kubernetes'
  | 'Standard'
  | 'Free'
  | 'Dynamic'
  | 'Shared'
  | 'ANY'
  | 'any-SKU'
  | 'PremiumV2';

export type SlotName = 'Production';

export type StateEnum = 'Running' | 'Stopped';

export interface Tags {
  hiddenLinkAppInsightsResourceID?: string;
  hiddenLinkAppInsightsInstrumentationKey?: string;
  createdTime?: Date;
  createdBy?: string;
  keep?: string;
  kep?: string;
  exportedGUID?: string;
  environment?: string;
  project?: string;
}

export interface UserAssignedIdentity {
  principalID?: string;
  clientID?: string;
}
