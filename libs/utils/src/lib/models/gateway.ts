import type { ArmResource } from './armresource';

export interface GatewayProperties {
  displayName: string;
  description: string;
  status: string;
  machineName: string;
  gatewayType?: GatewayType;
}

export type Gateway = ArmResource<GatewayProperties>;

export enum GatewayType {
  VirtualNetwork = 'VirtualNetwork',
  Resource = 'Resource',
  Personal = 'Personal',
}

export interface ApiToGatewayMapping {
  apiName: string;
  gateways: Gateway[];
}
