import type { ArmResource } from './Arm';

export interface PrivateLinkServiceConnectionState {
  status: string;
  description: string;
  actionsRequired?: string;
}

export interface PrivateEndpointConnection {
  provisioningState: string;
  privateEndpoint: any;
  privateLinkServiceConnectionState: PrivateLinkServiceConnectionState;
}

export interface SiteProperties {
  properties: { name: string; value: string }[];
}

export interface HostingEnvironmentProfile {
  id: string;
  name: string;
  type: string;
}

export interface HostNameSslState {
  name: string;
  hostType: string;
  sslState: string;
  thumbprint: string;
  ipBasedSslResult: string;
  ipBasedSslState: string;
  toUpdate: boolean;
  toUpdateIpBasedSsl: boolean;
  virtualIP: string;
}

export interface WorkflowAppProperties {
  state: string;
  hostNames: string[];
  trafficManagerHostNames: string[];
  enabledHostNames?: string[];
  hostNameSslStates: HostNameSslState;
  webSpace: string;
  sku: string;
  targetSwapSlot?: string;
  containerSize: number;
  serverFarmId: string;
  defaultHostName: string;
  dailyMemoryTimeQuota?: number;
  enabled?: boolean;
  siteDisabledReason?: number;
  clientCertEnabled?: boolean;
  clientAffinityEnabled?: boolean;
  hostingEnvironmentId?: string;
  hostingEnvironmentProfile?: HostingEnvironmentProfile;
  name?: string;
  resourceGroup?: string;
  computeMode?: string;
  hyperV?: boolean;
  reserved: boolean;
  siteProperties?: SiteProperties;
  httpsOnly: boolean;
  availabilityState: string;
  tags?: Record<string, string>;
  privateEndpointConnections?: ArmResource<PrivateEndpointConnection>[];
}

export interface AppSettingProperties {
  [key: string]: string;
}

export type WorkflowApp = ArmResource<WorkflowAppProperties>;
export type AppSetting = ArmResource<AppSettingProperties>;
