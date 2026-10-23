import {
  StandardManagementHttpClient,
  type IExperimentationService,
  type HttpRequestOptions,
  type IHttpClient,
  type StandardManagementContext,
} from '@microsoft/logic-apps-shared';
import { useLayoutEffect, useMemo } from 'react';
import { HttpClient, getExtraHeaders, getRequestUrl } from './HttpClient';
import { environment } from '../../../../environments/environment';
import axios from 'axios';

/** The embedding host must supply operational configuration and a lifecycle-aware, redirect/replay-free transport. */
export interface AzureStandardManagementHostConfiguration {
  directClient: IHttpClient;
  issuerFailureBackoffMs: number;
  experimentationService?: IExperimentationService;
  tenantId: string;
  principalId: string;
  /** Not a token. Change on account/authority changes; clear on sign-out. */
  authContextKey: string | undefined;
}

export interface AzureStandardManagementDiscovery {
  resourceId: string;
  runtimeHostName?: string;
  isHybrid: boolean;
}

/** Isolated from the legacy global Axios retry policy; preserve status-bearing transport errors. */
export class AzureManagementArmClient extends HttpClient {
  private readonly transport = axios.create();

  override async get<T>(options: HttpRequestOptions<unknown>): Promise<T> {
    const response = await this.transport.get(getRequestUrl(options), {
      headers: this.headers(options, options.uri.includes('/subscriptions/') || !!options.includeAuth),
    });
    return (options.returnHeaders ? { ...response.data, responseHeaders: response.headers } : response.data) as T;
  }

  override async post<T, B>(options: HttpRequestOptions<B>): Promise<T> {
    const response = await this.transport.post(getRequestUrl(options), options.content, { headers: this.headers(options, true) });
    return (options.returnHeaders ? { ...response.data, responseHeaders: response.headers } : response.data) as T;
  }

  private headers(options: HttpRequestOptions<unknown>, includeAuth: boolean): Record<string, string | string[]> {
    const hasAuthorization = Object.keys(options.headers ?? {}).some((key) => key.toLowerCase() === 'authorization');
    return {
      ...getExtraHeaders(),
      ...(includeAuth && !options.noAuth && !hasAuthorization ? { Authorization: `Bearer ${environment.armToken}` } : {}),
      ...options.headers,
    };
  }
}

export const managementArmClient = new AzureManagementArmClient();
// The dev-token environment has no supported auth lifecycle or operational backoff setting.
// Keep the actual Azure-connected entry points ARM-only until an embedding host supplies both.
export const armOnlyStandardManagement = StandardManagementHttpClient.createArmOnly(managementArmClient);

const cacheKeys = new WeakMap<StandardManagementHttpClient, number>();
let nextCacheKey = 0;
export function getStandardManagementCacheKey(client: StandardManagementHttpClient): number {
  let key = cacheKeys.get(client);
  if (key === undefined) {
    key = ++nextCacheKey;
    cacheKeys.set(client, key);
  }
  return key;
}

export function useAzureStandardManagement(
  discovery: AzureStandardManagementDiscovery,
  configuration?: AzureStandardManagementHostConfiguration
): StandardManagementHttpClient {
  const { directClient, issuerFailureBackoffMs, experimentationService, authContextKey, tenantId, principalId } = configuration ?? {};
  const { resourceId, runtimeHostName, isHybrid } = discovery;
  const owner = useMemo(
    () => ({
      client:
        directClient && issuerFailureBackoffMs !== undefined
          ? new StandardManagementHttpClient({
              armClient: managementArmClient,
              directClient,
              issuerFailureBackoffMs,
              experimentationService,
            })
          : StandardManagementHttpClient.createArmOnly(managementArmClient),
      active: false,
    }),
    [
      directClient,
      issuerFailureBackoffMs,
      experimentationService,
      authContextKey,
      resourceId,
      runtimeHostName,
      tenantId,
      principalId,
      isHybrid,
    ]
  );
  const { client } = owner;
  useLayoutEffect(() => {
    owner.active = true;
    let context: StandardManagementContext | undefined;
    if (configuration && !isHybrid && runtimeHostName && tenantId && principalId && authContextKey) {
      context = {
        resourceId,
        armOrigin: 'https://management.azure.com',
        runtimeOrigin: `https://${runtimeHostName}`,
        tenantId,
        principalId,
        authContextKey,
      };
    }
    client.setContext(context);
    return () => {
      owner.active = false;
      client.setContext(undefined);
      // StrictMode reactivates this owner synchronously; permanently retired owners are disposed.
      queueMicrotask(() => {
        if (!owner.active) {
          client.dispose();
        }
      });
    };
  }, [owner, client, !!configuration, resourceId, runtimeHostName, tenantId, principalId, authContextKey, isHybrid]);
  return client;
}
