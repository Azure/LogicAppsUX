import { AssertionErrorCode, AssertionException } from '../../utils/src';
import type { Tenant } from './common/azure';

export interface ITenantService {
  /**
   * Gets tenants.
   */
  getTenants?(): Promise<Tenant[] | undefined>;
}

let service: ITenantService;

export const InitTenantService = (tenantService: ITenantService): void => {
  service = tenantService;
};

export const TenantService = (): ITenantService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Tenant Service needs to be initialized before using');
  }

  return service;
};

export const isTenantServiceEnabled = (): boolean => {
  return !!service;
};
