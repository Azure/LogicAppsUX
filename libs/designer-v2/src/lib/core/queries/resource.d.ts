import type { UseQueryResult } from '@tanstack/react-query';
import type { LogicAppResource, Resource } from '@microsoft/logic-apps-shared';
export declare const useSubscriptions: () => UseQueryResult<Resource[], unknown>;
export declare const useResourceGroups: (subscriptionId: string) => UseQueryResult<Resource[], unknown>;
export declare const useLocations: (subscriptionId: string) => UseQueryResult<Resource[], unknown>;
export declare const useLogicApps: (subscriptionId: string, resourceGroup: string, enabled: boolean) => UseQueryResult<LogicAppResource[], unknown>;
