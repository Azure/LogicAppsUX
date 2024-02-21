import type { ArmResource } from './armresource';

export interface GatewayProperties {
  displayName: string;
  description: string;
  status: string;
  machineName: string;
  gatewayType?: GatewayType;
}

export type Gateway = ArmResource<GatewayProperties>;

export const GatewayType = {
  VirtualNetwork: 'VirtualNetwork',
  Resource: 'Resource',
  Personal: 'Personal',
};
export type GatewayType = (typeof GatewayType)[keyof typeof GatewayType];

export interface ApiToGatewayMapping {
  apiName: string;
  gateways: Gateway[];
}
