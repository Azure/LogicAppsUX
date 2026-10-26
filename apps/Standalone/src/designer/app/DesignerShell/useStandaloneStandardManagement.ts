import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { standardDirectManagementFeatureGate, type IExperimentationService } from '@microsoft/logic-apps-shared';
import {
  getArmAuthenticationSnapshot,
  subscribeArmAuthentication,
  subscribeArmAuthenticationInvalidation,
} from '../../../environments/armAuthentication';
import { useHostOptions, useHostingPlan, useIsLocal } from '../../state/workflowLoadingSelectors';
import type { AzureStandardManagementHostConfiguration } from '../AzureLogicAppsDesigner/Services/StandardManagement';
import { StandardManagementDirectClient } from '../AzureLogicAppsDesigner/Services/StandardManagementDirectClient';

const directClient = new StandardManagementDirectClient();
const experimentationService: IExperimentationService = {
  isFeatureEnabled: async (name) => name === standardDirectManagementFeatureGate,
  getFeatureValue: async () => undefined,
};

export function useStandaloneStandardManagement(): {
  managementHost?: AzureStandardManagementHostConfiguration;
  error?: string;
} {
  const { enableStandardDirectManagement, standardManagementIssuerFailureBackoffMs } = useHostOptions();
  const hostingPlan = useHostingPlan();
  const isLocal = useIsLocal();
  const authentication = useSyncExternalStore(subscribeArmAuthentication, getArmAuthenticationSnapshot, getArmAuthenticationSnapshot);
  const configuration = useMemo(() => {
    if (!enableStandardDirectManagement || hostingPlan !== 'standard' || isLocal) {
      return {};
    }
    if (
      standardManagementIssuerFailureBackoffMs === undefined ||
      !Number.isFinite(standardManagementIssuerFailureBackoffMs) ||
      standardManagementIssuerFailureBackoffMs <= 0
    ) {
      return { error: 'Standard direct management requires a positive issuer retry delay.' };
    }
    if (authentication.error || !authentication.tenantId || !authentication.principalId) {
      return { error: authentication.error ?? 'Refresh Azure authentication before enabling direct management.' };
    }
    return {
      managementHost: {
        directClient,
        issuerFailureBackoffMs: standardManagementIssuerFailureBackoffMs,
        experimentationService,
        tenantId: authentication.tenantId,
        principalId: authentication.principalId,
        authContextKey: `standalone-auth-${authentication.revision}`,
        subscribeToAuthenticationChanges: subscribeArmAuthenticationInvalidation,
      },
    };
  }, [enableStandardDirectManagement, standardManagementIssuerFailureBackoffMs, authentication, hostingPlan, isLocal]);
  useEffect(() => {
    if (configuration.error) {
      console.warn('Standard direct management is unavailable; requests will use the original ARM route.', configuration.error);
    }
  }, [configuration.error]);
  return configuration;
}
